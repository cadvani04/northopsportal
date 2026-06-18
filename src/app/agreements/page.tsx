import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { AgreementsPanel } from "@/components/modules/agreements-panel";
import { requireStaff } from "@/lib/auth/session";
import { getAgreements, getClients } from "@/lib/queries";

export default async function AgreementsPage() {
  await requireStaff();
  const [agreements, clients] = await Promise.all([getAgreements(), getClients()]);

  return (
    <AppShell>
      <PageHeader title="Agreements" description="Manage MSAs, SOWs, and client contracts." />
      <AgreementsPanel agreements={agreements} clients={clients} />
    </AppShell>
  );
}
