import { and, eq } from "drizzle-orm";
import { requireVerifiedUser } from "@/lib/auth/current-verified-user";
import { getDb } from "@/lib/db";
import { accessEvents, documentKeyEnvelopes, documents, shares } from "@/lib/db/schema";
import { presignEncryptedDownload } from "@/lib/r2/objects";
import { json, requireUuid, safeRouteError } from "@/lib/server/http";
import { canAccessShare } from "@/lib/shares/policy";

type Context = { params: Promise<{ shareId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireVerifiedUser();
    const shareId = requireUuid((await context.params).shareId);
    const [record] = await getDb().select({
      documentId: documents.id,
      shareStatus: shares.status,
      permission: shares.permission,
      expiresAt: shares.expiresAt,
      recipientClerkUserId: shares.recipientClerkUserId,
      recipientEmailNormalized: shares.recipientEmailNormalized,
      documentStatus: documents.status,
      r2ObjectKey: documents.r2ObjectKey,
      encryptedMetadata: documents.encryptedMetadata,
      metadataIv: documents.metadataIv,
      fileIv: documents.fileIv,
      cryptoVersion: documents.cryptoVersion,
      wrappedFileKey: documentKeyEnvelopes.wrappedFileKey,
    }).from(shares)
      .innerJoin(documents, eq(documents.id, shares.documentId))
      .innerJoin(documentKeyEnvelopes, and(
        eq(documentKeyEnvelopes.documentId, shares.documentId),
        eq(documentKeyEnvelopes.clerkUserId, user.userId),
      ))
      .where(eq(shares.id, shareId))
      .limit(1);

    if (!record || !canAccessShare({
      status: record.shareStatus,
      documentStatus: record.documentStatus,
      expiresAt: record.expiresAt,
      recipientClerkUserId: record.recipientClerkUserId,
      recipientEmailNormalized: record.recipientEmailNormalized,
    }, user.userId, user.verifiedEmails)) {
      return json({ error: { code: "FORBIDDEN", message: "This account is not authorized for this protected file." } }, { status: 403 });
    }
    if (!record.encryptedMetadata || !record.metadataIv || !record.fileIv) {
      return json({ error: { code: "INVALID_DOCUMENT", message: "Protected document data is incomplete." } }, { status: 500 });
    }
    const downloadUrl = await presignEncryptedDownload(record.r2ObjectKey);
    await getDb().insert(accessEvents).values({ shareId, clerkUserId: user.userId, eventType: "OPEN_AUTHORIZED" });
    return json({
      documentId: record.documentId,
      downloadUrl,
      wrappedFileKey: record.wrappedFileKey,
      encryptedMetadata: record.encryptedMetadata,
      metadataIv: record.metadataIv,
      fileIv: record.fileIv,
      cryptoVersion: record.cryptoVersion,
      permission: record.permission,
      expiresAt: record.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
