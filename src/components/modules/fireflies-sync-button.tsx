"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/forms";

export function FirefliesSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function sync(days: number) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/fireflies/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Sync failed");
        return;
      }

      setMessage(
        `Imported ${data.created} meeting(s). Skipped ${data.skipped} already synced.` +
          (data.errors?.length ? ` ${data.errors.length} error(s).` : "")
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="secondary"
        className="text-xs"
        disabled={pending}
        onClick={() => sync(30)}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Importing…" : "Import last 30 days"}
      </Button>
      {message && <p className="max-w-xs text-right text-xs text-emerald-400">{message}</p>}
      {error && <p className="max-w-xs text-right text-xs text-red-400">{error}</p>}
    </div>
  );
}
