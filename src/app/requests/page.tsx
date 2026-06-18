import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { ClientRequestsPanel } from "@/components/modules/client-requests-panel";
import { LogEmailRequestForm } from "@/components/modules/log-email-request-form";
import { requireStaff } from "@/lib/auth/session";
import { getClientRequests } from "@/lib/queries/kpis";
import { getClients } from "@/lib/queries";

export default async function RequestsPage() {
  await requireStaff();
  const [requests, clients] = await Promise.all([getClientRequests(), getClients()]);

  return (
    <AppShell>
      <PageHeader
        title="Client Requests"
        description="Portal submissions and emails logged by your team."
      />
      <div className="mb-6">
        <LogEmailRequestForm clients={clients.map((c) => ({ id: c.id, company: c.company }))} />
      </div>
      <ClientRequestsPanel requests={requests} />
    </AppShell>
  );
}
