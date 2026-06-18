"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Upload, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/forms";

interface Props {
  agreementId: string;
  documentUrl: string | null;
  onChange: () => void;
}

export function AgreementDocumentUpload({ agreementId, documentUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upload(file: File) {
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await fetch(`/api/agreements/${agreementId}/document`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onChange();
    });
  }

  function remove() {
    if (!confirm("Remove the stored PDF for this agreement?")) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/agreements/${agreementId}/document`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not remove PDF");
        return;
      }
      onChange();
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-white/5 bg-black/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
        <FileText className="h-4 w-4" />
        Signed agreement PDF
      </div>

      {documentUrl ? (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/agreements/${agreementId}/document/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-300 hover:bg-cyan-500/20"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View PDF
          </a>
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            Replace
          </Button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {pending ? "Uploading…" : "Upload PDF"}
          </Button>
          <span className="text-xs text-slate-500">PDF only, max 4 MB</span>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
