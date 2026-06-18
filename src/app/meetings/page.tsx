import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { FirefliesSyncButton } from "@/components/modules/fireflies-sync-button";
import { MeetingReprocessButton } from "@/components/modules/meeting-reprocess-button";
import { requireAdmin } from "@/lib/auth/session";
import { getMeetings } from "@/lib/queries";
import { formatDateTime, parseMeetingActionItems } from "@/lib/utils";
import { Video } from "lucide-react";

export default async function MeetingsPage() {
  await requireAdmin();
  const meetings = await getMeetings();

  return (
    <AppShell>
      <PageHeader
        title="Meetings"
        description="Notes synced from Fireflies with AI-powered task and deliverable extraction."
        action={
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
            <FirefliesSyncButton />
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300">
              Webhook: POST /api/webhooks/fireflies
            </div>
          </div>
        }
      />

      {meetings.length === 0 ? (
        <EmptyState icon={<Video className="h-12 w-12" />} title="No meetings yet" description="Connect Fireflies after deploy to auto-sync meeting notes." />
      ) : (
        <div className="space-y-6">
          {meetings.map((meeting) => {
            const actionItems = parseMeetingActionItems(meeting.actionItems);

            return (
              <Card key={meeting.id}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-medium text-white">{meeting.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatDateTime(meeting.date)}
                      {meeting.duration && ` · ${meeting.duration} min`}
                    </p>
                    {meeting.client && <p className="mt-1 text-sm text-slate-500">{meeting.client.company}</p>}
                    {!meeting.client && (
                      <p className="mt-1 text-sm text-amber-500/80">No client matched — check participant emails</p>
                    )}
                    {!meeting.transcript && (
                      <p className="mt-1 text-sm text-amber-500/80">No transcript yet — click Extract tasks</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400">Fireflies + AI</span>
                    <MeetingReprocessButton meetingId={meeting.id} />
                  </div>
                </div>
                {meeting.summary && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium text-slate-300">Summary</h4>
                    <p className="text-sm leading-relaxed text-slate-400">{meeting.summary}</p>
                  </div>
                )}
                {actionItems.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-300">Action Items</h4>
                    <ul className="space-y-2">
                      {actionItems.map((item, i) => (
                        <li key={i} className="rounded-lg border border-white/5 px-4 py-2 text-sm text-slate-300">
                          {item.task} · {item.assignee}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
