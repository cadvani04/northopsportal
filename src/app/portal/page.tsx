import { AppShell } from "@/components/layout/app-shell";
import { Card, Badge } from "@/components/ui";
import { ClientRequestForm } from "@/components/modules/client-request-form";
import { requireClient } from "@/lib/auth/session";
import { getClientPortalData } from "@/lib/queries";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatRelative, formatStatus } from "@/lib/utils";
import { CheckSquare, Package, FileText, Receipt, Video, Send } from "lucide-react";

export default async function ClientPortalPage() {
  const user = await requireClient();
  const { client, tasks, deliverables, agreements, invoices, meetings, activities } =
    await getClientPortalData(user.clientId!);

  const projects = client
    ? await db.project.findMany({
        where: { clientId: client.id, status: { in: ["active", "implementation"] } },
        orderBy: { name: "asc" },
      })
    : [];

  if (!client) {
    return (
      <AppShell mode="client">
        <p className="text-slate-400">Client account not configured.</p>
      </AppShell>
    );
  }

  return (
    <AppShell mode="client">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-slate-400">{client.company} · Your project hub with NorthOps</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: CheckSquare, label: "Tasks", count: tasks.length, color: "text-cyan-400" },
          { icon: Package, label: "Deliverables", count: deliverables.length, color: "text-blue-400" },
          { icon: Receipt, label: "Invoices", count: invoices.length, color: "text-emerald-400" },
          { icon: Video, label: "Meetings", count: meetings.length, color: "text-purple-400" },
        ].map(({ icon: Icon, label, count, color }) => (
          <Card key={label}>
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color}`} />
              <div>
                <p className="text-2xl font-semibold text-white">{count}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Send className="h-5 w-5 text-cyan-400" /> Submit a Request
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Send a request here or email <span className="text-slate-300">dev@northops.org</span> — it will route to the right person automatically.
        </p>
        <ClientRequestForm projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Your Tasks</h2>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-500">No shared tasks yet.</p>
            ) : (
              tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{task.title}</p>
                    <p className="text-xs text-slate-500">{task.project?.name}</p>
                  </div>
                  <Badge status={task.status}>{formatStatus(task.status)}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Deliverables</h2>
          <div className="space-y-3">
            {deliverables.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{d.title}</p>
                  {d.dueDate && <p className="text-xs text-slate-500">Due {formatDate(d.dueDate)}</p>}
                </div>
                <Badge status={d.status}>{formatStatus(d.status)}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <FileText className="h-5 w-5" /> Agreements
          </h2>
          {agreements.slice(0, 3).map((a) => (
            <div key={a.id} className="mb-3 rounded-lg border border-white/5 px-4 py-3">
              <div className="flex justify-between">
                <p className="text-sm text-white">{a.title}</p>
                <Badge status={a.status}>{formatStatus(a.status)}</Badge>
              </div>
              {a.value && <p className="mt-1 text-xs text-slate-500">{formatCurrency(a.value)}</p>}
              {a.status === "SIGNED" && a.documentUrl && (
                <a href={`/api/agreements/${a.id}/document/view`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs text-cyan-400 hover:text-cyan-300">
                  View signed agreement (PDF)
                </a>
              )}
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Receipt className="h-5 w-5" /> Invoices
          </h2>
          {invoices.slice(0, 3).map((inv) => (
            <div key={inv.id} className="mb-3 flex justify-between rounded-lg border border-white/5 px-4 py-3">
              <div>
                <p className="text-sm text-white">{inv.number}</p>
                {inv.dueDate && <p className="text-xs text-slate-500">Due {formatDate(inv.dueDate)}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm text-white">{formatCurrency(inv.total)}</p>
                <Badge status={inv.status}>{formatStatus(inv.status)}</Badge>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {meetings.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Recent Meetings</h2>
          {meetings.slice(0, 3).map((m) => (
            <div key={m.id} className="mb-4 last:mb-0">
              <p className="font-medium text-white">{m.title}</p>
              <p className="text-xs text-slate-500">{formatDate(m.date)}</p>
              {m.summary && <p className="mt-2 text-sm text-slate-400 line-clamp-2">{m.summary}</p>}
            </div>
          ))}
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Recent Updates</h2>
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="flex gap-3">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
              <div>
                <p className="text-sm text-slate-300">{a.title}</p>
                <p className="text-xs text-slate-600">{formatRelative(a.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
