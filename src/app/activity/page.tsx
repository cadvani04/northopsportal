import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Card } from "@/components/ui";
import { requireAuth } from "@/lib/auth/session";
import { getRecentActivity } from "@/lib/queries";
import { formatRelative } from "@/lib/utils";

export default async function ActivityPage() {
  await requireAuth();
  const activity = await getRecentActivity(50);

  return (
    <AppShell>
      <PageHeader title="Activity Feed" description="Audit log of all operations." />
      <Card padding={false}>
        <div className="divide-y divide-white/5">
          {activity.map((item) => (
            <div key={item.id} className="flex gap-4 px-6 py-4 hover:bg-white/[0.02]">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{item.title}</p>
                {item.description && <p className="mt-0.5 text-sm text-slate-400">{item.description}</p>}
                <div className="mt-1 flex gap-3 text-xs text-slate-500">
                  <span>{formatRelative(item.createdAt)}</span>
                  {item.client && <span>{item.client.company}</span>}
                  {item.user && <span>{item.user.name}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
