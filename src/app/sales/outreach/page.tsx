import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { OutreachLogPanel } from "@/components/modules/outreach-log-panel";
import { requireAdmin } from "@/lib/auth/session";
import { getOutreachLogData } from "@/lib/queries/sales";

export default async function OutreachLogPage() {
  await requireAdmin();
  const data = await getOutreachLogData();

  return (
    <AppShell>
      <PageHeader
        title="Outreach Log"
        description="Quickly log cold outreach with message text and screenshots."
      />
      <OutreachLogPanel data={data} />
    </AppShell>
  );
}
