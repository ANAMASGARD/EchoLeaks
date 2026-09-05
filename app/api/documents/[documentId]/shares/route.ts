import { and, eq, inArray } from "drizzle-orm";
import { ZodError } from "zod";
import { normalizeEmail } from "@/lib/auth/email";
import { requireVerifiedUser } from "@/lib/auth/current-verified-user";
import { lookupRecipients } from "@/lib/auth/recipient-lookup";
import { getDb } from "@/lib/db";
import { documentKeyEnvelopes, documents, shareBatches, shares, userKeyBundles } from "@/lib/db/schema";
import { getAppEnv } from "@/lib/server/env";
import { json, requireUuid, safeRouteError } from "@/lib/server/http";
import { createShares } from "@/lib/server/validators";

type Context = { params: Promise<{ documentId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireVerifiedUser();
    const documentId = requireUuid((await context.params).documentId);
    const input = createShares.parse(await request.json());
    const [document] = await getDb().select({ id: documents.id }).from(documents).where(and(
      eq(documents.id, documentId), eq(documents.ownerClerkUserId, user.userId), eq(documents.status, "READY"),
    )).limit(1);
    if (!document) return json({ error: { code: "NOT_FOUND", message: "Ready document not found." } }, { status: 404 });

    const ready = input.recipients.filter((recipient) => recipient.status === "READY");
    const userIds = ready.map((recipient) => recipient.clerkUserId);
    if (new Set(userIds).size !== userIds.length) {
      return json({ error: { code: "DUPLICATE_ACCOUNT", message: "Use only one verified address per recipient account." } }, { status: 400 });
    }
    const liveRecipients = await lookupRecipients(input.recipients.map((recipient) => recipient.email));
    const liveByEmail = new Map(liveRecipients.map((recipient) => [recipient.email, recipient]));
    const identityMismatch = ready.some((recipient) => {
      const live = liveByEmail.get(normalizeEmail(recipient.email));
      return live?.status !== "READY" || live.clerkUserId !== recipient.clerkUserId;
    });
    if (identityMismatch) {
      return json({ error: { code: "RECIPIENT_IDENTITY_CHANGED", message: "A recipient account changed. Prepare the share again." } }, { status: 409 });
    }
    const bundles = userIds.length
      ? await getDb().select().from(userKeyBundles).where(inArray(userKeyBundles.clerkUserId, userIds))
      : [];
    const bundleByUser = new Map(bundles.map((bundle) => [bundle.clerkUserId, bundle]));
    const stale = ready.some((recipient) => {
      const bundle = bundleByUser.get(recipient.clerkUserId);
      return !bundle || bundle.keyVersion !== recipient.keyVersion || bundle.publicKeyFingerprint !== recipient.publicKeyFingerprint;
    });
    if (stale) return json({ error: { code: "RECIPIENT_KEY_CHANGED", message: "A recipient key changed. Prepare the share again." } }, { status: 409 });

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date()) {
      return json({ error: { code: "INVALID_EXPIRY", message: "Expiry must be in the future." } }, { status: 400 });
    }
    const batchId = crypto.randomUUID();
    const rows = input.recipients.map((recipient) => ({
      id: crypto.randomUUID(),
      batchId,
      documentId,
      senderClerkUserId: user.userId,
      recipientClerkUserId: recipient.status === "READY" ? recipient.clerkUserId : null,
      recipientEmailNormalized: normalizeEmail(recipient.email),
      permission: input.permission,
      status: recipient.status === "READY" ? "ACTIVE" as const : "AWAITING_RECIPIENT_KEY" as const,
      expiresAt,
    }));
    const envelopes = ready.map((recipient) => ({
      documentId,
      clerkUserId: recipient.clerkUserId,
      wrappedFileKey: recipient.wrappedFileKey,
      keyVersion: recipient.keyVersion,
    }));
    const createBatch = getDb().insert(shareBatches).values({
      id: batchId,
      documentId,
      senderClerkUserId: user.userId,
      permission: input.permission,
      expiresAt,
    });
    const createShareRows = getDb().insert(shares).values(rows);
    if (envelopes.length) {
      await getDb().batch([
        createBatch,
        createShareRows,
        getDb().insert(documentKeyEnvelopes).values(envelopes).onConflictDoNothing(),
      ]);
    } else {
      await getDb().batch([createBatch, createShareRows]);
    }

    const appUrl = getAppEnv().APP_URL.replace(/\/$/, "");
    return json({
      batchId,
      shares: rows.map((row) => ({
        shareId: row.id,
        recipientEmail: row.recipientEmailNormalized,
        status: row.status,
        shareUrl: row.status === "ACTIVE" ? `${appUrl}/share/${row.id}` : null,
      })),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return json({ error: { code: "INVALID_REQUEST", message: "The share request is invalid." } }, { status: 400 });
    return safeRouteError(error);
  }
}
