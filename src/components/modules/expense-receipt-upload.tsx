"use client";

import { useRef, useState, useTransition } from "react";
import { ExternalLink, Upload, Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/forms";

interface Props {
  expenseId: string;
  receiptUrl: string | null;
  onChange?: () => void;
}

export function ExpenseReceiptUpload({ expenseId, receiptUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upload(file: File) {
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const res = await fetch(`/api/expenses/${expenseId}/receipt`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onChange?.();
    });
  }

  function remove() {
    if (!confirm("Remove receipt?")) return;
    startTransition(async () => {
      await fetch(`/api/expenses/${expenseId}/receipt`, { method: "DELETE" });
      onChange?.();
    });
  }

  if (receiptUrl) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
        >
          <Receipt className="h-3.5 w-3.5" />
          View receipt
          <ExternalLink className="h-3 w-3" />
        </a>
        <button type="button" onClick={() => inputRef.current?.click()} className="text-xs text-slate-500 hover:text-white">
          Replace
        </button>
        <button type="button" onClick={remove} className="text-slate-500 hover:text-red-400">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-400"
      >
        <Upload className="h-3.5 w-3.5" />
        {pending ? "Uploading…" : "Add receipt"}
      </button>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
