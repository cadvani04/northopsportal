import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { TimelinePanel } from "@/components/modules/timeline-panel";
import { requireAdmin } from "@/lib/auth/session";
import { getTimelineEvents, getProjects } from "@/lib/queries";

export default async function TimelinePage() {
  await requireAdmin();
  const [events, projects] = await Promise.all([getTimelineEvents(), getProjects()]);

  return (
    <AppShell>
      <PageHeader title="Timeline" description="Project milestones and deadlines." />
      <TimelinePanel events={events} projects={projects} />
    </AppShell>
  );
}
