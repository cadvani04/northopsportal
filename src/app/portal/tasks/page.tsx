import { AppShell } from "@/components/layout/app-shell";
import { Card, Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getClientPortalData } from "@/lib/queries";
import { formatStatus } from "@/lib/utils";

export default async function PortalTasksPage() {
  const user = await requireClient();
  const { tasks } = await getClientPortalData(user.clientId!);

  return (
    <AppShell mode="client">
      <h1 className="mb-6 text-2xl font-semibold text-white">Your Tasks</h1>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500">No shared tasks yet.</p>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} padding>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{task.title}</p>
                  <p className="text-sm text-slate-500">{task.project?.name}</p>
                </div>
                <Badge status={task.status}>{formatStatus(task.status)}</Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
