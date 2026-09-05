import { requireVerifiedUser } from "@/lib/auth/current-verified-user";
import { CRYPTO_VERSION } from "@/lib/crypto/constants";
import { getDb } from "@/lib/db";
import { documents, userKeyBundles } from "@/lib/db/schema";
import { createR2ObjectKey, presignEncryptedUpload } from "@/lib/r2/objects";
import { json, safeRouteError } from "@/lib/server/http";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const user = await requireVerifiedUser();
    const [bundle] = await getDb()
      .select({ keyVersion: userKeyBundles.keyVersion, publicKeyJwk: userKeyBundles.publicKeyJwk })
      .from(userKeyBundles)
      .where(eq(userKeyBundles.clerkUserId, user.userId))
      .limit(1);
    if (!bundle) {
      return json({ error: { code: "KEY_VAULT_REQUIRED", message: "Set up your encryption key first." } }, { status: 409 });
    }

    const objectKey = createR2ObjectKey(user.userId);
    const [document] = await getDb()
      .insert(documents)
      .values({ ownerClerkUserId: user.userId, r2ObjectKey: objectKey, cryptoVersion: CRYPTO_VERSION })
      .returning({ id: documents.id });
    const upload = await presignEncryptedUpload(objectKey);
    return json({
      documentId: document.id,
      uploadUrl: upload.uploadUrl,
      expiresInSeconds: upload.expiresInSeconds,
      cryptoVersion: CRYPTO_VERSION,
      ownerPublicKeyJwk: bundle.publicKeyJwk,
      ownerKeyVersion: bundle.keyVersion,
    }, { status: 201 });
  } catch (error) {
    return safeRouteError(error);
  }
}
