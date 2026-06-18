import {
  CheckSquare,
  Package,
  Receipt,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard, Card } from "@/components/ui";
import { DashboardTasksList } from "@/components/modules/dashboard-tasks-list";
import {
  getDashboardStats,
  getMyTasks,
  getRecentActivity,
  getTeamMembers,
} from "@/lib/queries";
import { requireAdmin } from "@/lib/auth/session";
import {
  formatCurrency,
  formatRelative,
  getInitials,
} from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireAdmin();
  const [stats, tasks, activity, team] = await Promise.all([
    getDashboardStats(user.id),
    getMyTasks(user.id),
    getRecentActivity(8),
    getTeamMembers(),
  ]);

  const myOpenTasks = tasks.filter((t) => t.status !== "DONE").slice(0, 5);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Good morning, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Here&apos;s what&apos;s happening across NorthOps today.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Open Tasks" value={stats.openTasks} subtitle={`${stats.overdueTasks} overdue`} icon={<CheckSquare className="h-5 w-5" />} trendUp={stats.overdueTasks === 0} />
        <StatCard title="Pending Deliverables" value={stats.pendingDeliverables} icon={<Package className="h-5 w-5" />} />
        <StatCard title="Unpaid Invoices" value={stats.unpaidInvoices} icon={<Receipt className="h-5 w-5" />} />
        <StatCard title="Revenue (Paid)" value={formatCurrency(stats.totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} trend={`${stats.activeClients} active clients`} trendUp />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Tasks</h2>
              <a href="/tasks" className="text-sm text-cyan-400 hover:text-cyan-300">View all →</a>
            </div>
            <DashboardTasksList tasks={myOpenTasks} />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-white">Team</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {team.map((member) => (
                <div key={member.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
                      {getInitials(member.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{member.name}</p>
                      <p className="text-xs capitalize text-slate-500">{member.role.toLowerCase()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          {stats.overdueTasks > 0 && (
            <Card className="border-red-500/20 bg-red-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <p className="text-sm text-red-300">{stats.overdueTasks} overdue task(s)</p>
              </div>
            </Card>
          )}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-white">Pending Expenses</h2>
            </div>
            <p className="text-2xl font-semibold text-white">{formatCurrency(stats.pendingExpenses)}</p>
          </Card>
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Video className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-white">Meetings This Week</h2>
            </div>
            <p className="text-2xl font-semibold text-white">{stats.recentMeetings}</p>
          </Card>
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-white">Recent Activity</h2>
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-300">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{formatRelative(item.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
