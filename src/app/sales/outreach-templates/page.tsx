import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { OutreachTemplatesPanel } from "@/components/modules/outreach-templates-panel";
import { requireOutreachAccess } from "@/lib/auth/session";
import { getOutreachTemplates } from "@/lib/queries/sales";

export default async function OutreachTemplatesPage() {
  await requireOutreachAccess();
  const templates = await getOutreachTemplates();

  return (
    <AppShell>
      <PageHeader
        title="Outreach Templates"
        description="Track cold outreach messaging — each template targets 50 people reached."
      />
      <OutreachTemplatesPanel templates={templates} />
    </AppShell>
  );
}
