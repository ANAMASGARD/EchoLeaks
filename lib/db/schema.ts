import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const documentStatus = pgEnum("document_status", [
  "PENDING",
  "READY",
  "FAILED",
  "DELETED",
]);
export const permission = pgEnum("share_permission", [
  "VIEW_ONLY",
  "VIEW_AND_DOWNLOAD",
]);
export const shareStatus = pgEnum("share_status", [
  "AWAITING_RECIPIENT_KEY",
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
]);
export const emailStatus = pgEnum("email_status", [
  "NOT_REQUESTED",
  "SENDING",
  "ACCEPTED",
  "FAILED",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const userKeyBundles = pgTable("user_key_bundles", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  publicKeyJwk: jsonb("public_key_jwk").$type<JsonWebKey>().notNull(),
  publicKeyFingerprint: text("public_key_fingerprint").notNull(),
  encryptedPrivateKey: text("encrypted_private_key").notNull(),
  privateKeyIv: text("private_key_iv").notNull(),
  kdfSalt: text("kdf_salt").notNull(),
  kdfParameters: jsonb("kdf_parameters")
    .$type<{ memoryBytes: number; operations: number; outputBytes: number }>()
    .notNull(),
  keyVersion: integer("key_version").notNull().default(1),
  ...timestamps,
});

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerClerkUserId: text("owner_clerk_user_id").notNull(),
    r2ObjectKey: text("r2_object_key").notNull(),
    status: documentStatus("status").notNull().default("PENDING"),
    ciphertextSize: bigint("ciphertext_size", { mode: "number" }),
    encryptedMetadata: text("encrypted_metadata"),
    metadataIv: text("metadata_iv"),
    fileIv: text("file_iv"),
    cryptoVersion: integer("crypto_version").notNull().default(1),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("documents_r2_object_key_idx").on(table.r2ObjectKey),
    index("documents_owner_idx").on(table.ownerClerkUserId),
    index("documents_status_idx").on(table.status),
  ],
);

export const documentKeyEnvelopes = pgTable(
  "document_key_envelopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    wrappedFileKey: text("wrapped_file_key").notNull(),
    wrappingAlgorithm: text("wrapping_algorithm").notNull().default("RSA-OAEP-3072-SHA-256"),
    keyVersion: integer("key_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("document_envelope_user_idx").on(table.documentId, table.clerkUserId),
    index("document_envelope_lookup_idx").on(table.documentId, table.clerkUserId),
  ],
);

export const shareBatches = pgTable(
  "share_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    senderClerkUserId: text("sender_clerk_user_id").notNull(),
    permission: permission("permission").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    emailStatus: emailStatus("email_status").notNull().default("NOT_REQUESTED"),
    emailAttemptId: uuid("email_attempt_id"),
    ...timestamps,
  },
  (table) => [index("share_batches_document_idx").on(table.documentId)],
);

export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => shareBatches.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    senderClerkUserId: text("sender_clerk_user_id").notNull(),
    recipientClerkUserId: text("recipient_clerk_user_id"),
    recipientEmailNormalized: text("recipient_email_normalized").notNull(),
    permission: permission("permission").notNull(),
    status: shareStatus("status").notNull(),
    providerMessageId: text("provider_message_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("shares_recipient_user_idx").on(table.recipientClerkUserId),
    index("shares_recipient_email_idx").on(table.recipientEmailNormalized),
    index("shares_status_idx").on(table.status),
    index("shares_expiry_idx").on(table.expiresAt),
  ],
);

export const accessEvents = pgTable(
  "access_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => shares.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    eventType: text("event_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("access_events_share_idx").on(table.shareId)],
);
