import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { SalesCrmPanel } from "@/components/modules/sales-crm-panel";
import { requireAdmin } from "@/lib/auth/session";
import { getSalesCrmData } from "@/lib/queries/sales";

export default async function SalesPage() {
  await requireAdmin();
  const data = await getSalesCrmData();

  return (
    <AppShell>
      <PageHeader
        title="Sales CRM"
        description="Track cold outreach, pipeline stages, follow-ups, and deal progression."
      />
      <SalesCrmPanel data={data} />
    </AppShell>
  );
}
