import { AppShell } from "@/components/layout/app-shell";
import { Card, Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getClientPortalData } from "@/lib/queries";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";

export default async function PortalInvoicesPage() {
  const user = await requireClient();
  const { invoices } = await getClientPortalData(user.clientId!);

  return (
    <AppShell mode="client">
      <h1 className="mb-6 text-2xl font-semibold text-white">Invoices</h1>
      <div className="space-y-3">
        {invoices.map((inv) => (
          <Card key={inv.id} padding>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{inv.number}</p>
                {inv.dueDate && <p className="text-sm text-slate-500">Due {formatDate(inv.dueDate)}</p>}
              </div>
              <div className="text-right">
                <p className="font-medium text-white">{formatCurrency(inv.total)}</p>
                <Badge status={inv.status}>{formatStatus(inv.status)}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
