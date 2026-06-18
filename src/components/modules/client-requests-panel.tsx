"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui/forms";
import { updateClientRequestStatus } from "@/lib/actions";
import { formatRelative, formatStatus } from "@/lib/utils";

type Request = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  source: string;
  createdAt: Date;
  client: { company: string };
  project: { name: string } | null;
  assignee: { name: string } | null;
};

export function ClientRequestsPanel({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <p className="text-sm text-slate-500">No client requests yet.</p>
      ) : (
        requests.map((r) => (
          <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-white">{r.title}</h3>
                  <Badge status={r.status}>{formatStatus(r.status)}</Badge>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-500">{r.source}</span>
                </div>
                <p className="text-sm text-slate-500">
                  {r.client.company}
                  {r.project ? ` · ${r.project.name}` : ""}
                  {r.assignee ? ` · → ${r.assignee.name}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-600">{formatRelative(r.createdAt)} · {formatStatus(r.category)}</p>
              </div>
              {r.status !== "done" && (
                <div className="flex gap-2">
                  {r.status === "open" && (
                    <Button
                      variant="secondary"
                      className="text-xs"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await updateClientRequestStatus(r.id, "in_progress");
                          router.refresh();
                        })
                      }
                    >
                      Start
                    </Button>
                  )}
                  <Button
                    className="text-xs"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await updateClientRequestStatus(r.id, "done");
                        router.refresh();
                      })
                    }
                  >
                    Mark done
                  </Button>
                </div>
              )}
            </div>
            {r.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-400 line-clamp-4">{r.description}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
