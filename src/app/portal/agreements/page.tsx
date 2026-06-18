import { AppShell } from "@/components/layout/app-shell";
import { Card, Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getClientPortalData } from "@/lib/queries";
import { formatCurrency, formatStatus } from "@/lib/utils";

export default async function PortalAgreementsPage() {
  const user = await requireClient();
  const { agreements } = await getClientPortalData(user.clientId!);

  return (
    <AppShell mode="client">
      <h1 className="mb-6 text-2xl font-semibold text-white">Agreements</h1>
      <div className="space-y-3">
        {agreements.map((a) => (
          <Card key={a.id} padding>
            <div className="flex items-center justify-between">
              <p className="font-medium text-white">{a.title}</p>
              <Badge status={a.status}>{formatStatus(a.status)}</Badge>
            </div>
            {a.value && <p className="mt-2 text-sm text-slate-500">{formatCurrency(a.value)}</p>}
            {a.status === "SIGNED" && a.documentUrl && (
              <a href={`/api/agreements/${a.id}/document/view`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-sm text-cyan-400">
                View signed agreement (PDF)
              </a>
            )}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
