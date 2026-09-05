import { describe, expect, it } from "vitest";
import { canAccessShare, type ShareAccessState } from "./policy";

const active: ShareAccessState = {
  status: "ACTIVE",
  documentStatus: "READY",
  expiresAt: null,
  recipientClerkUserId: "user_alice",
  recipientEmailNormalized: "alice@example.com",
};

describe("share access policy", () => {
  it("requires both the bound user and verified email", () => {
    expect(canAccessShare(active, "user_alice", ["alice@example.com"])).toBe(true);
    expect(canAccessShare(active, "user_bob", ["alice@example.com"])).toBe(false);
    expect(canAccessShare(active, "user_alice", ["other@example.com"])).toBe(false);
  });

  it("rejects revoked and expired shares", () => {
    expect(canAccessShare({ ...active, status: "REVOKED" }, "user_alice", ["alice@example.com"])).toBe(false);
    expect(canAccessShare({ ...active, expiresAt: new Date(0) }, "user_alice", ["alice@example.com"])).toBe(false);
  });

  it("rejects unfinished documents and recipient enrollment shares", () => {
    expect(canAccessShare({ ...active, documentStatus: "PENDING" }, "user_alice", ["alice@example.com"])).toBe(false);
    expect(canAccessShare({ ...active, status: "AWAITING_RECIPIENT_KEY" }, "user_alice", ["alice@example.com"])).toBe(false);
  });
});
