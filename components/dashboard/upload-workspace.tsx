"use client";

import { useUser } from "@clerk/nextjs";
import { Archive, CheckCircle2, FileText, ImageIcon, LoaderCircle, LockKeyhole, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useReducer, useRef, useState } from "react";
import { KeyVaultDialog } from "@/components/crypto/key-vault-dialog";
import { SharePanel } from "@/components/dashboard/share-panel";
import { useKeyVault } from "@/hooks/use-key-vault";
import { MAX_FILE_BYTES } from "@/lib/crypto/constants";
import { encryptAndUpload } from "@/lib/crypto/worker-client";
import { cn } from "@/lib/utils";

type Phase = "IDLE" | "SELECTED" | "INITIALIZING" | "ENCRYPTING" | "UPLOADING" | "FINALIZING" | "READY" | "ERROR" | "CANCELLED";
type State = { phase: Phase; file: File | null; documentId: string | null; message: string };
type Action = { type: "SELECT"; file: File } | { type: "PHASE"; phase: Phase; message: string } | { type: "READY"; documentId: string } | { type: "RESET" };

const initialState: State = { phase: "IDLE", file: null, documentId: null, message: "Nothing is uploaded or stored yet." };

function reducer(state: State, action: Action): State {
  if (action.type === "SELECT") return { phase: "SELECTED", file: action.file, documentId: null, message: "Ready for local encryption." };
  if (action.type === "PHASE") return { ...state, phase: action.phase, message: action.message };
  if (action.type === "READY") return { ...state, phase: "READY", documentId: action.documentId, message: "Protected. R2 contains ciphertext only." };
  return initialState;
}

const fileKinds = [{ label: "Documents", icon: FileText }, { label: "Images", icon: ImageIcon }, { label: "ZIP + more", icon: Archive }];
const activePhases: Phase[] = ["INITIALIZING", "ENCRYPTING", "UPLOADING", "FINALIZING"];

function formatFileSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  if (!bytes) return "0 B";
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function SelectedFileIcon({ file }: { file: File }) {
  if (file.type.startsWith("image/")) return <ImageIcon aria-hidden="true" className="size-5" />;
  if (/\.(zip|rar|7z|tar|gz)$/i.test(file.name)) return <Archive aria-hidden="true" className="size-5" />;
  return <FileText aria-hidden="true" className="size-5" />;
}

export function UploadWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { user } = useUser();
  const vault = useKeyVault(user?.id);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isDragging, setIsDragging] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const active = activePhases.includes(state.phase);

  const selectFile = (file: File | undefined) => {
    if (!file || active) return;
    if (file.size > MAX_FILE_BYTES) {
      dispatch({ type: "PHASE", phase: "ERROR", message: "Choose a file no larger than 25 MiB for this prototype." });
      return;
    }
    dispatch({ type: "SELECT", file });
  };

  const protect = async () => {
    if (!state.file) return;
    if (!window.isSecureContext) {
      dispatch({ type: "PHASE", phase: "ERROR", message: "Browser encryption requires HTTPS or localhost." });
      return;
    }
    if (vault.state.status !== "READY") {
      if (vault.state.status === "CHECKING") dispatch({ type: "PHASE", phase: "ERROR", message: "Your encryption key is still loading. Try again shortly." });
      else setVaultOpen(true);
      return;
    }
    let initializedDocumentId: string | null = null;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      dispatch({ type: "PHASE", phase: "INITIALIZING", message: "Preparing a private encrypted upload…" });
      const initResponse = await fetch("/api/documents/init", { method: "POST", signal: controller.signal });
      const initialized = await initResponse.json();
      if (!initResponse.ok) throw new Error(initialized.error?.message ?? "Could not initialize the upload.");
      initializedDocumentId = initialized.documentId;
      dispatch({ type: "PHASE", phase: "ENCRYPTING", message: "Encrypting locally in a background worker…" });
      const encrypted = await encryptAndUpload({
        file: state.file,
        documentId: initialized.documentId,
        uploadUrl: initialized.uploadUrl,
        ownerPublicKeyJwk: initialized.ownerPublicKeyJwk,
        ownerKeyVersion: initialized.ownerKeyVersion,
      }, (phase) => {
        if (phase === "UPLOADING") dispatch({ type: "PHASE", phase: "UPLOADING", message: "Uploading encrypted bytes directly to private R2…" });
      }, controller.signal);
      dispatch({ type: "PHASE", phase: "FINALIZING", message: "Verifying and finalizing the protected file…" });
      const completeResponse = await fetch(`/api/documents/${initialized.documentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...encrypted, cryptoVersion: initialized.cryptoVersion }),
        signal: controller.signal,
      });
      const completed = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completed.error?.message ?? "Could not finalize the upload.");
      dispatch({ type: "READY", documentId: initialized.documentId });
    } catch (error) {
      if (initializedDocumentId) void fetch(`/api/documents/${initializedDocumentId}/fail`, { method: "POST" });
      if (controller.signal.aborted) {
        dispatch({ type: "PHASE", phase: "CANCELLED", message: "Protection cancelled. Nothing was finalized." });
      } else {
        dispatch({ type: "PHASE", phase: "ERROR", message: error instanceof Error ? error.message : "Protection failed." });
      }
    } finally {
      abortRef.current = null;
    }
  };

  return (
    <section className="min-h-[calc(100svh-4rem)] px-5 py-5 sm:px-7 sm:py-6 md:min-h-svh lg:px-10 lg:py-7">
      <div className="mx-auto w-full max-w-6xl">
        <header><p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">Protect a file</p><h1 className="mt-1.5 font-head text-4xl leading-none tracking-[-0.05em] sm:text-5xl">Upload</h1></header>
        <div className="mt-4 rounded-2xl border-2 border-black bg-primary p-4 shadow-md sm:px-5">
          <div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-card shadow-sm"><ShieldCheck className="size-5" aria-hidden="true" /></span><div><h2 className="font-head text-lg sm:text-xl">Protect any file</h2><p className="mt-1 text-xs sm:text-sm">Encrypted locally. Only ciphertext leaves your browser.</p></div></div>
        </div>
        <h2 className="mt-6 font-head text-xl sm:text-2xl">1. Choose a file</h2>
        <div
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setIsDragging(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false); }}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectFile(event.dataTransfer.files[0]); }}
          className={cn("mt-3 rounded-2xl border-[3px] border-dashed border-black bg-card p-4 transition-colors sm:p-5", isDragging && "bg-accent")}
        >
          <input ref={inputRef} type="file" className="sr-only" aria-label="Choose any file to protect" disabled={active} onChange={(event) => selectFile(event.currentTarget.files?.[0])} />
          {state.file ? (
            <div className="flex min-h-32 flex-col items-center justify-center"><div className="flex w-full items-center gap-3 rounded-2xl border-2 border-black bg-background p-3 shadow-sm"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-primary"><SelectedFileIcon file={state.file} /></span><div className="min-w-0 flex-1"><p className="truncate font-head text-sm sm:text-base">{state.file.name}</p><p className="text-xs text-muted-foreground">{state.file.type || "File"} · {formatFileSize(state.file.size)}</p></div>{!active && state.phase !== "READY" && <button type="button" onClick={() => dispatch({ type: "RESET" })} aria-label={`Remove ${state.file.name}`} className="flex size-10 items-center justify-center rounded-full border-2 border-black bg-card shadow-sm"><X className="size-5" /></button>}</div></div>
          ) : (
            <div className="flex flex-col items-center text-center"><span className="flex size-12 items-center justify-center rounded-full border-2 border-black bg-primary shadow-sm"><UploadCloud className="size-6" /></span><h3 className="mt-3 font-head text-xl">Drop any file here</h3><p className="mt-1 text-xs text-muted-foreground">25 MiB maximum</p><div className="mt-4 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3">{fileKinds.map(({ label, icon: Icon }) => <button key={label} type="button" onClick={() => inputRef.current?.click()} className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border-2 border-black bg-background px-3 py-3 font-bold shadow-sm sm:flex-col"><Icon className="size-5" />{label}</button>)}</div></div>
          )}
        </div>
        {state.phase !== "READY" && <button type="button" disabled={!state.file} onClick={() => active ? abortRef.current?.abort() : void protect()} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border-[3px] border-black bg-primary px-5 font-head text-lg shadow-md transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-45">{active ? <LoaderCircle className="size-5 animate-spin" /> : <LockKeyhole className="size-5" />}{active ? "Cancel protection" : "Let's encrypt"}</button>}
        <p className={cn("mt-3 flex min-h-6 items-center gap-2 text-sm font-medium", state.phase === "ERROR" ? "text-destructive" : "text-muted-foreground")} aria-live="polite"><CheckCircle2 className="size-4 shrink-0" />{state.message}</p>
        {state.documentId && vault.state.status === "READY" && <SharePanel documentId={state.documentId} privateKey={vault.state.privateKey} />}
        {vault.state.status === "READY" && !active && (
          <button type="button" onClick={() => void vault.forget()} className="mt-4 rounded-full border-2 border-black bg-card px-4 py-2 text-xs font-bold shadow-sm">
            Forget this device
          </button>
        )}
        <KeyVaultDialog open={vaultOpen} onOpenChange={setVaultOpen} state={vault.state} onSetup={vault.setup} onUnlock={vault.unlock} />
      </div>
    </section>
  );
}
