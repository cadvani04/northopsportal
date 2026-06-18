import { AppShell } from "@/components/layout/app-shell";
import { Card, Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getClientPortalData } from "@/lib/queries";
import { formatDate, formatStatus } from "@/lib/utils";

export default async function PortalDeliverablesPage() {
  const user = await requireClient();
  const { deliverables } = await getClientPortalData(user.clientId!);

  return (
    <AppShell mode="client">
      <h1 className="mb-6 text-2xl font-semibold text-white">Deliverables</h1>
      <div className="space-y-3">
        {deliverables.map((d) => (
          <Card key={d.id} padding>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{d.title}</p>
                {d.dueDate && <p className="text-sm text-slate-500">Due {formatDate(d.dueDate)}</p>}
              </div>
              <Badge status={d.status}>{formatStatus(d.status)}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
