import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import { requireVerifiedUser } from "@/lib/auth/current-verified-user";
import { lookupRecipients } from "@/lib/auth/recipient-lookup";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { json, requireUuid, safeRouteError } from "@/lib/server/http";
import { prepareRecipients } from "@/lib/server/validators";

type Context = { params: Promise<{ documentId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireVerifiedUser();
    const documentId = requireUuid((await context.params).documentId);
    const input = prepareRecipients.parse(await request.json());
    const [owned] = await getDb().select({ id: documents.id }).from(documents).where(and(
      eq(documents.id, documentId),
      eq(documents.ownerClerkUserId, user.userId),
      eq(documents.status, "READY"),
    )).limit(1);
    if (!owned) return json({ error: { code: "NOT_FOUND", message: "Ready document not found." } }, { status: 404 });
    return json({ recipients: await lookupRecipients(input.recipientEmails) });
  } catch (error) {
    if (error instanceof ZodError) return json({ error: { code: "INVALID_RECIPIENTS", message: "Provide 1 to 100 valid email addresses." } }, { status: 400 });
    return safeRouteError(error);
  }
}
