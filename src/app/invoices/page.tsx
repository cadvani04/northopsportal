import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { InvoicesPanel } from "@/components/modules/invoices-panel";
import { requireAdmin } from "@/lib/auth/session";
import { getInvoices, getClients } from "@/lib/queries";

export default async function InvoicesPage() {
  await requireAdmin();
  const [invoices, clients] = await Promise.all([getInvoices(), getClients()]);

  return (
    <AppShell>
      <PageHeader title="Invoices" description="Create, send, and track client billing." />
      <InvoicesPanel invoices={invoices} clients={clients} />
    </AppShell>
  );
}
