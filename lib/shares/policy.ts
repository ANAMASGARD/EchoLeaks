export type ShareAccessState = {
  status: "AWAITING_RECIPIENT_KEY" | "ACTIVE" | "REVOKED" | "EXPIRED";
  documentStatus: "PENDING" | "READY" | "FAILED" | "DELETED";
  expiresAt: Date | null;
  recipientClerkUserId: string | null;
  recipientEmailNormalized: string;
};

export function canAccessShare(
  share: ShareAccessState,
  userId: string,
  verifiedEmails: string[],
  now = new Date(),
) {
  return share.status === "ACTIVE"
    && share.documentStatus === "READY"
    && share.recipientClerkUserId === userId
    && verifiedEmails.includes(share.recipientEmailNormalized)
    && (!share.expiresAt || share.expiresAt > now);
}
