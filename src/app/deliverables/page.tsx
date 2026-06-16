import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { DeliverablesPanel } from "@/components/modules/deliverables-panel";
import { requireAdmin } from "@/lib/auth/session";
import { getDeliverables, getProjects } from "@/lib/queries";

export default async function DeliverablesPage() {
  await requireAdmin();
  const [deliverables, projects] = await Promise.all([getDeliverables(), getProjects()]);

  return (
    <AppShell>
      <PageHeader title="Deliverables" description="Track deliverables from planning through approval." />
      <DeliverablesPanel deliverables={deliverables} projects={projects} />
    </AppShell>
  );
}
