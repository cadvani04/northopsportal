"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/forms";

export function FirefliesSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(path: string, body: object, success: (data: Record<string, unknown>) => string) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Request failed");
        return;
      }

      setMessage(success(data as Record<string, unknown>));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          className="text-xs"
          disabled={pending}
          onClick={() =>
            run("/api/fireflies/sync", { days: 30 }, (data) =>
              `Imported ${data.created} meeting(s). Skipped ${data.skipped} already synced.` +
                ((data.errors as string[] | undefined)?.length
                  ? ` ${(data.errors as string[]).length} error(s).`
                  : "")
            )
          }
        >
          <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
          {pending ? "Working…" : "Import last 30 days"}
        </Button>
        <Button
          variant="secondary"
          className="text-xs"
          disabled={pending}
          onClick={() =>
            run("/api/fireflies/reprocess", { force: false }, (data) =>
              `Processed ${data.processed} meeting(s), skipped ${data.skipped}. Created ${data.tasksCreated} tasks.`
            )
          }
        >
          <Sparkles className={`h-3.5 w-3.5 ${pending ? "animate-pulse" : ""}`} />
          Extract all meetings
        </Button>
      </div>
      {message && <p className="max-w-sm text-right text-xs text-emerald-400">{message}</p>}
      {error && <p className="max-w-sm text-right text-xs text-red-400">{error}</p>}
    </div>
  );
}
