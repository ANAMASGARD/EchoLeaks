"use client";

import {
  Archive,
  CheckCircle2,
  FileText,
  ImageIcon,
  LockKeyhole,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const fileKinds = [
  { label: "Documents", icon: FileText },
  { label: "Images", icon: ImageIcon },
  { label: "ZIP + more", icon: Archive },
];

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function SelectedFileIcon({ file }: { file: File }) {
  if (file.type.startsWith("image/")) {
    return <ImageIcon aria-hidden="true" className="size-5" />;
  }

  if (/\.(zip|rar|7z|tar|gz)$/i.test(file.name)) {
    return <Archive aria-hidden="true" className="size-5" />;
  }

  return <FileText aria-hidden="true" className="size-5" />;
}

export function UploadWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showDeferredMessage, setShowDeferredMessage] = useState(false);

  const chooseFile = () => inputRef.current?.click();

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    setSelectedFile(file);
    setShowDeferredMessage(false);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setShowDeferredMessage(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="min-h-[calc(100svh-4rem)] px-5 py-5 sm:px-7 sm:py-6 md:min-h-svh lg:px-10 lg:py-7">
      <div className="mx-auto w-full max-w-6xl">
        <header>
          <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Protect a file
          </p>
          <h1 className="mt-1.5 font-head text-4xl leading-none tracking-[-0.05em] sm:text-5xl">
            Upload
          </h1>
        </header>

        <div className="mt-4 rounded-2xl border-2 border-black bg-primary p-4 shadow-md sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-card shadow-sm">
              <ShieldCheck aria-hidden="true" className="size-5" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-head text-lg tracking-tight sm:text-xl">
                Protect any file
              </h2>
              <p className="mt-1 text-xs leading-relaxed sm:text-sm">
                Any file type. Encryption will run locally in your browser.
              </p>
            </div>
          </div>
        </div>

        <h2 className="mt-6 font-head text-xl tracking-tight sm:text-2xl">
          1. Choose a file
        </h2>

        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
              return;
            }
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            selectFile(event.dataTransfer.files[0]);
          }}
          className={cn(
            "mt-3 rounded-2xl border-[3px] border-dashed border-black bg-card p-4 transition-colors sm:p-5",
            isDragging && "bg-accent",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            aria-label="Choose any file to protect"
            onChange={(event) => selectFile(event.currentTarget.files?.[0])}
          />

          {selectedFile ? (
            <div className="flex min-h-36 flex-col items-center justify-center">
              <div className="flex w-full items-center gap-3 rounded-2xl border-2 border-black bg-background p-3 shadow-sm sm:p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-primary">
                  <SelectedFileIcon file={selectedFile} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-head text-sm sm:text-base">
                    {selectedFile.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedFile.type || "File"} · {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  aria-label={`Remove ${selectedFile.name}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#ffaaa0] hover:shadow-md active:translate-y-0.5 active:shadow-none"
                >
                  <X aria-hidden="true" className="size-5" strokeWidth={2.5} />
                </button>
              </div>
              <button
                type="button"
                onClick={chooseFile}
                className="mt-3 rounded-full border-2 border-black bg-card px-4 py-2 text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted hover:shadow-md active:translate-y-0.5 active:shadow-none sm:text-sm"
              >
                Choose another file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full border-2 border-black bg-primary shadow-sm">
                <UploadCloud aria-hidden="true" className="size-6" strokeWidth={2.25} />
              </div>
              <h3 className="mt-3 font-head text-xl tracking-tight">
                Drop any file here
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Or choose a type to browse
              </p>

              <div className="mt-4 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3">
                {fileKinds.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={chooseFile}
                    className="flex min-h-20 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-black bg-background px-3 py-3 text-sm font-bold shadow-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent hover:shadow-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:flex-col"
                  >
                    <Icon aria-hidden="true" className="size-5" strokeWidth={2.25} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!selectedFile}
          onClick={() => setShowDeferredMessage(true)}
          className="mt-4 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border-[3px] border-black bg-primary px-5 font-head text-lg shadow-md transition-all enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:bg-primary-hover enabled:hover:shadow-lg enabled:active:translate-x-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-45"
        >
          <LockKeyhole aria-hidden="true" className="size-5" strokeWidth={2.5} />
          Let&apos;s encrypt
        </button>

        <div className="mt-3 min-h-6" aria-live="polite">
          {showDeferredMessage ? (
            <p className="flex items-start gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Encryption comes next. Your file has not left this browser.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing is uploaded or stored yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
