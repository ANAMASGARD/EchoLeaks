"use client";

import { Check, Clipboard, LoaderCircle, Mail, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MAX_RECIPIENTS } from "@/lib/crypto/constants";
import type { PreparedRecipient } from "@/lib/crypto/types";
import { rewrapForRecipients } from "@/lib/crypto/worker-client";
import { parseEmailText, parseRecipientFile } from "@/lib/recipients/parse";

type CreatedShare = { shareId: string; recipientEmail: string; status: string; shareUrl: string | null };

export function SharePanel({ documentId, privateKey }: { documentId: string; privateKey: CryptoKey }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [entry, setEntry] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [permission, setPermission] = useState<"VIEW_ONLY" | "VIEW_AND_DOWNLOAD">("VIEW_AND_DOWNLOAD");
  const [expiry, setExpiry] = useState("");
  const [prepared, setPrepared] = useState<PreparedRecipient[]>([]);
  const [shares, setShares] = useState<CreatedShare[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const addEmails = (incoming: string[]) => {
    setEmails((current) => [...new Set([...current, ...incoming])].slice(0, MAX_RECIPIENTS));
    setPrepared([]);
    setShares([]);
  };

  const prepare = async () => {
    if (!emails.length) return setMessage("Add at least one recipient.");
    setBusy(true);
    setMessage("Checking recipients with Clerk…");
    try {
      const response = await fetch(`/api/documents/${documentId}/shares/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmails: emails }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Could not prepare recipients.");
      setPrepared(body.recipients);
      setMessage("Recipients checked. Ready accounts can receive protected links.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recipient preparation failed.");
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    setMessage("Wrapping a separate key for each recipient locally…");
    try {
      const envelopeResponse = await fetch(`/api/documents/${documentId}/owner-envelope`, { cache: "no-store" });
      const ownerEnvelope = await envelopeResponse.json();
      if (!envelopeResponse.ok) throw new Error(ownerEnvelope.error?.message ?? "Owner key unavailable.");
      const ready = await rewrapForRecipients({ privateKey, ownerWrappedKey: ownerEnvelope.wrappedFileKey, recipients: prepared });
      const recipients = [
        ...ready,
        ...prepared.filter((recipient) => recipient.status === "NOT_ENROLLED").map((recipient) => ({
          status: "NOT_ENROLLED" as const,
          email: recipient.email,
        })),
      ];
      const response = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          permission,
          expiresAt: expiry ? new Date(expiry).toISOString() : null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Could not create shares.");
      setShares(body.shares);
      setBatchId(body.batchId);
      setMessage("Unique recipient links are ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Share creation failed.");
    } finally {
      setBusy(false);
    }
  };

  const sendEmail = async () => {
    if (!batchId) return;
    setBusy(true);
    setMessage("Sending personalized links through Brevo…");
    try {
      const response = await fetch(`/api/share-batches/${batchId}/email`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Email request failed.");
      setMessage("Email request accepted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Email request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-5 rounded-2xl border-[3px] border-black bg-card p-4 shadow-md sm:p-5">
      <h2 className="font-head text-xl">2. Share securely</h2>
      <p className="mt-1 text-sm text-muted-foreground">Add up to 100 emails manually or from CSV, TXT, or XLSX.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Input
          value={entry}
          onChange={(event) => setEntry(event.target.value)}
          placeholder="recipient@example.com"
          className="h-11 min-w-56 flex-1 rounded-xl border-2 border-black"
        />
        <button type="button" onClick={() => { addEmails(parseEmailText(entry)); setEntry(""); }} className="rounded-full border-2 border-black bg-primary px-5 font-bold shadow-sm">Add</button>
        <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-full border-2 border-black bg-background px-4 font-bold shadow-sm">
          <Upload className="size-4" /> Import
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" className="sr-only" onChange={async (event) => {
          const file = event.target.files?.[0];
          try {
            if (file) addEmails(await parseRecipientFile(file));
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not read the recipient list.");
          }
          event.target.value = "";
        }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {emails.map((email) => (
          <span key={email} className="flex items-center gap-2 rounded-full border-2 border-black bg-muted px-3 py-1.5 text-xs font-bold">
            {email}
            <button type="button" aria-label={`Remove ${email}`} onClick={() => setEmails((list) => list.filter((item) => item !== email))} className="rounded-full"><Trash2 className="size-3.5" /></button>
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select value={permission} onChange={(event) => setPermission(event.target.value as typeof permission)} className="h-11 rounded-xl border-2 border-black bg-background px-3 font-bold">
          <option value="VIEW_AND_DOWNLOAD">View and download</option>
          <option value="VIEW_ONLY">View only</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-bold">
          Expires
          <Input
            type="datetime-local"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
            className="h-11 w-auto rounded-xl border-2 border-black"
          />
        </label>
        {!prepared.length ? (
          <button type="button" disabled={busy || !emails.length} onClick={() => void prepare()} className="rounded-full border-2 border-black bg-primary px-5 py-2.5 font-head shadow-sm disabled:opacity-50">Prepare share</button>
        ) : !shares.length ? (
          <button type="button" disabled={busy} onClick={() => void create()} className="rounded-full border-2 border-black bg-primary px-5 py-2.5 font-head shadow-sm disabled:opacity-50">Create unique links</button>
        ) : (
          <button type="button" disabled={busy} onClick={() => void sendEmail()} className="flex items-center gap-2 rounded-full border-2 border-black bg-primary px-5 py-2.5 font-head shadow-sm disabled:opacity-50"><Mail className="size-4" /> Send all</button>
        )}
      </div>
      {prepared.length > 0 && shares.length === 0 && (
        <p className="mt-3 text-sm font-bold">
          {prepared.filter((recipient) => recipient.status === "READY").length} ready · {prepared.filter((recipient) => recipient.status === "NOT_ENROLLED").length} invitation only
        </p>
      )}
      {shares.map((share) => (
        <div key={share.shareId} className="mt-3 flex items-center justify-between gap-3 rounded-xl border-2 border-black bg-background p-3 text-sm">
          <span className="min-w-0 truncate font-bold">{share.recipientEmail}</span>
          {share.shareUrl ? (
            <button type="button" onClick={async () => { await navigator.clipboard.writeText(share.shareUrl!); setMessage(`Copied link for ${share.recipientEmail}.`); }} className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-black bg-card px-3 py-1.5 font-bold"><Clipboard className="size-3.5" /> Copy</button>
          ) : <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-bold">Needs enrollment</span>}
        </div>
      ))}
      <p className="mt-3 flex min-h-5 items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : message && <Check className="size-4" />}{message}
      </p>
    </section>
  );
}
