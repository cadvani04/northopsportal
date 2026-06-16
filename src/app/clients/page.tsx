import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { ClientsPanel } from "@/components/modules/clients-panel";
import { requireAdmin } from "@/lib/auth/session";
import { getClients } from "@/lib/queries";

export default async function ClientsPage() {
  await requireAdmin();
  const clients = await getClients();

  return (
    <AppShell>
      <PageHeader title="Clients" description="Manage clients and portal access." />
      <ClientsPanel clients={clients} />
    </AppShell>
  );
}
