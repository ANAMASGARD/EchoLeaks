"use client";

import { SignOutButton, useUser } from "@clerk/nextjs";
import { AlertTriangle, KeyRound, LoaderCircle, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { KeyVaultDialog } from "@/components/crypto/key-vault-dialog";
import { SecureViewer } from "@/components/share/secure-viewer";
import { useKeyVault } from "@/hooks/use-key-vault";
import type { FileMetadata, ShareAccessResponse } from "@/lib/crypto/types";
import { decryptDownload } from "@/lib/crypto/worker-client";

type Decrypted = { metadata: FileMetadata; file: ArrayBuffer };

export function SecureShareClient({ shareId }: { shareId: string }) {
  const { user } = useUser();
  const vault = useKeyVault(user?.id);
  const [access, setAccess] = useState<ShareAccessResponse | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decrypted, setDecrypted] = useState<Decrypted | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shares/${shareId}/access`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (cancelled) return;
        if (response.status === 403) return setForbidden(true);
        if (!response.ok) throw new Error(body.error?.message ?? "Could not open this protected share.");
        setAccess(body);
      })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Share access failed."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [shareId]);

  const decrypt = async () => {
    if (!access || vault.state.status !== "READY") return;
    setLoading(true);
    setError("");
    try {
      const result = await decryptDownload(vault.state.privateKey, access);
      setDecrypted(result);
      void fetch(`/api/shares/${shareId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "DECRYPT_SUCCEEDED" }),
      });
    } catch {
      setError("Decryption failed. The file may be damaged, modified, or encrypted for another key.");
      void fetch(`/api/shares/${shareId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "DECRYPT_FAILED" }),
      });
    } finally {
      setLoading(false);
    }
  };

  if (forbidden) {
    return <ShareShell><AlertTriangle className="size-12 text-destructive" /><h1 className="font-head text-3xl">Wrong account</h1><p className="max-w-md text-center text-muted-foreground">This Clerk account is not authorized. The encrypted key and storage URL were not released.</p><SignOutButton redirectUrl={`/share/${shareId}`}><button className="flex items-center gap-2 rounded-full border-2 border-black bg-primary px-6 py-3 font-head shadow-md"><LogOut className="size-4" /> Switch account</button></SignOutButton></ShareShell>;
  }
  if (error && !access) return <ShareShell><AlertTriangle className="size-12 text-destructive" /><h1 className="font-head text-2xl">Could not open share</h1><p className="max-w-md text-center text-destructive">{error}</p></ShareShell>;

  return (
    <main className="min-h-svh bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border-[3px] border-black bg-primary p-5 shadow-lg">
          <p className="text-xs font-bold tracking-[0.2em] uppercase">Authorized local access</p>
          <h1 className="mt-1 font-head text-3xl sm:text-4xl">Protected file</h1>
          <p className="mt-2 text-sm">EchoLeaks releases ciphertext only after Clerk verifies both your account and authorized email.</p>
        </div>
        {!access || loading && !decrypted ? (
          <div className="mt-5 flex min-h-56 items-center justify-center rounded-2xl border-2 border-black bg-card shadow-md"><LoaderCircle className="size-8 animate-spin" /></div>
        ) : decrypted ? (
          <SecureViewer shareId={shareId} permission={access.permission} metadata={decrypted.metadata} bytes={decrypted.file} />
        ) : (
          <div className="mt-5 flex min-h-56 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-black bg-card p-6 text-center shadow-md">
            <KeyRound className="size-10" />
            <h2 className="font-head text-2xl">Decrypt on this device</h2>
            <p className="max-w-lg text-sm text-muted-foreground">Your private key stays in this browser. The server never receives the file key or plaintext.</p>
            {vault.state.status === "READY" ? (
              <button type="button" onClick={() => void decrypt()} className="rounded-full border-2 border-black bg-primary px-6 py-3 font-head shadow-md">Decrypt locally</button>
            ) : (
              <button type="button" disabled={vault.state.status === "CHECKING"} onClick={() => setVaultOpen(true)} className="rounded-full border-2 border-black bg-primary px-6 py-3 font-head shadow-md disabled:opacity-50">{vault.state.status === "NEEDS_SETUP" ? "Create encryption key" : "Unlock encryption key"}</button>
            )}
            {error && <p className="font-bold text-destructive" role="alert">{error}</p>}
          </div>
        )}
      </div>
      <KeyVaultDialog open={vaultOpen} onOpenChange={setVaultOpen} state={vault.state} onSetup={vault.setup} onUnlock={vault.unlock} />
    </main>
  );
}

function ShareShell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-svh flex-col items-center justify-center gap-5 bg-background px-5">{children}</main>;
}
