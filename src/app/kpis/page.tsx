import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { KpiDashboard } from "@/components/modules/kpi-dashboard";
import { requireAdmin } from "@/lib/auth/session";
import { getKpiMetrics } from "@/lib/queries/kpis";

export default async function KpisPage() {
  await requireAdmin();
  const metrics = await getKpiMetrics();

  return (
    <AppShell>
      <PageHeader
        title="KPIs & Goals"
        description="Weekly and monthly targets, revenue, pipeline health, and suggested tasks."
      />
      <KpiDashboard metrics={metrics} />
    </AppShell>
  );
}
