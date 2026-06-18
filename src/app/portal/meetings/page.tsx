import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getClientPortalData } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function PortalMeetingsPage() {
  const user = await requireClient();
  const { meetings } = await getClientPortalData(user.clientId!);

  return (
    <AppShell mode="client">
      <h1 className="mb-6 text-2xl font-semibold text-white">Meetings</h1>
      <div className="space-y-4">
        {meetings.length === 0 ? (
          <p className="text-sm text-slate-500">No meetings synced yet.</p>
        ) : (
          meetings.map((m) => (
            <Card key={m.id} padding>
              <p className="font-medium text-white">{m.title}</p>
              <p className="text-sm text-slate-500">{formatDate(m.date)}</p>
              {m.summary && <p className="mt-2 text-sm text-slate-400">{m.summary}</p>}
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
