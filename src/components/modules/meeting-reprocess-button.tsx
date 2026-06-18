"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/forms";

export function MeetingReprocessButton({
  meetingId,
  label = "Extract tasks",
}: {
  meetingId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function reprocess(force = false) {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/meetings/${meetingId}/reprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.error ?? "Failed");
        return;
      }

      if (data.status === "skipped") {
        setMessage("Already processed");
        return;
      }

      setMessage(`${data.tasksCreated} tasks · ${data.deliverablesCreated} deliverables`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="text-xs"
          disabled={pending}
          onClick={() => reprocess(false)}
        >
          <Sparkles className={`h-3.5 w-3.5 ${pending ? "animate-pulse" : ""}`} />
          {pending ? "Extracting…" : label}
        </Button>
        <Button
          variant="secondary"
          className="text-xs opacity-70"
          disabled={pending}
          onClick={() => reprocess(true)}
        >
          Re-run
        </Button>
      </div>
      {message && <p className="text-xs text-slate-500">{message}</p>}
    </div>
  );
}
