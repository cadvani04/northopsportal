import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { ClientRequestsPanel } from "@/components/modules/client-requests-panel";
import { requireStaff } from "@/lib/auth/session";
import { getClientRequests } from "@/lib/queries/kpis";

export default async function RequestsPage() {
  await requireStaff();
  const requests = await getClientRequests();

  return (
    <AppShell>
      <PageHeader
        title="Client Requests"
        description="Requests from the portal and inbound email routed to your team."
      />
      <ClientRequestsPanel requests={requests} />
    </AppShell>
  );
}
