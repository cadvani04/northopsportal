import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui";
import { TasksPanel } from "@/components/modules/tasks-panel";
import { requireAdmin } from "@/lib/auth/session";
import { getTasks, getProjects, getTeamMembers } from "@/lib/queries";

export default async function TasksPage() {
  await requireAdmin();
  const [tasks, projects, team] = await Promise.all([
    getTasks(),
    getProjects(),
    getTeamMembers(),
  ]);

  return (
    <AppShell>
      <PageHeader title="Tasks" description="Track team todos, assignments, and deadlines." />
      <TasksPanel tasks={tasks} projects={projects} team={team} />
    </AppShell>
  );
}
