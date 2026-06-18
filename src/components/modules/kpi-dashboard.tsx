"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, StatCard } from "@/components/ui";
import { Modal, Button, Input, Select } from "@/components/ui/forms";
import { createKpiGoal, updateKpiGoal, deleteKpiGoal } from "@/lib/actions";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  target: number;
  current: number;
  unit: string;
  period: string;
  startDate: Date;
  endDate: Date | null;
};

type Metrics = {
  openTasks: number;
  tasksDoneThisWeek: number;
  taskTrend: number;
  deliverablesInProgress: number;
  deliverablesCompletedMonth: number;
  revenueMonth: number;
  revenueWeek: number;
  expensesMonth: number;
  expensesPending: number;
  activeClients: number;
  meetingsWeek: number;
  openRequests: number;
  goals: Goal[];
  suggestedTasks: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate: Date | null;
    project: { client: { company: string } } | null;
    assignee: { name: string } | null;
  }>;
  timeline: Array<{
    id: string;
    title: string;
    date: Date;
    project: { client: { company: string } };
  }>;
};

function formatValue(value: number, unit: string) {
  if (unit === "currency") return formatCurrency(value);
  if (unit === "percent") return `${value}%`;
  return String(value);
}

export function KpiDashboard({ metrics }: { metrics: Metrics }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submitGoal(form: FormData) {
    startTransition(async () => {
      await createKpiGoal({
        title: form.get("title") as string,
        description: (form.get("description") as string) || undefined,
        target: parseFloat(form.get("target") as string),
        current: parseFloat(form.get("current") as string) || 0,
        unit: form.get("unit") as string,
        period: form.get("period") as string,
        startDate: form.get("startDate") as string,
        endDate: (form.get("endDate") as string) || undefined,
      });
      setOpen(false);
      router.refresh();
    });
  }

  const weeklyGoals = metrics.goals.filter((g) => g.period === "weekly");
  const monthlyGoals = metrics.goals.filter((g) => g.period === "monthly");

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Revenue (month)" value={formatCurrency(metrics.revenueMonth)} subtitle={`${formatCurrency(metrics.revenueWeek)} this week`} />
        <StatCard title="Tasks done (week)" value={metrics.tasksDoneThisWeek} subtitle={`${metrics.taskTrend >= 0 ? "+" : ""}${metrics.taskTrend} vs last week`} trendUp={metrics.taskTrend >= 0} />
        <StatCard title="Deliverables completed" value={metrics.deliverablesCompletedMonth} subtitle={`${metrics.deliverablesInProgress} in progress`} />
        <StatCard title="Open client requests" value={metrics.openRequests} subtitle={`${metrics.activeClients} active clients`} />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Open tasks" value={metrics.openTasks} />
        <StatCard title="Expenses (month)" value={formatCurrency(metrics.expensesMonth)} subtitle={`${formatCurrency(metrics.expensesPending)} pending`} />
        <StatCard title="Meetings this week" value={metrics.meetingsWeek} />
        <StatCard title="Active clients" value={metrics.activeClients} />
      </div>

      <div className="mb-6 flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add KPI goal</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GoalSection
          title="Weekly KPIs"
          goals={weeklyGoals}
          pending={pending}
          onUpdate={(id, current) => startTransition(async () => { await updateKpiGoal(id, { current }); router.refresh(); })}
          onDelete={(id) => startTransition(async () => { await deleteKpiGoal(id); router.refresh(); })}
        />
        <GoalSection
          title="Monthly KPIs"
          goals={monthlyGoals}
          pending={pending}
          onUpdate={(id, current) => startTransition(async () => { await updateKpiGoal(id, { current }); router.refresh(); })}
          onDelete={(id) => startTransition(async () => { await deleteKpiGoal(id); router.refresh(); })}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Suggested tasks this week</h2>
          <div className="space-y-3">
            {metrics.suggestedTasks.length === 0 ? (
              <p className="text-sm text-slate-500">No urgent tasks due this week.</p>
            ) : (
              metrics.suggestedTasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-white/5 px-4 py-3">
                  <p className="text-sm font-medium text-white">{task.title}</p>
                  <p className="text-xs text-slate-500">
                    {task.project?.client.company ?? "Internal"}
                    {task.assignee ? ` · ${task.assignee.name}` : ""}
                    {task.dueDate ? ` · due ${formatDate(task.dueDate)}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Macro timeline (this month)</h2>
          <div className="space-y-3">
            {metrics.timeline.length === 0 ? (
              <p className="text-sm text-slate-500">No milestones scheduled this month.</p>
            ) : (
              metrics.timeline.map((event) => (
                <div key={event.id} className="flex gap-3 rounded-lg border border-white/5 px-4 py-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{event.title}</p>
                    <p className="text-xs text-slate-500">{event.project.client.company} · {formatDate(event.date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add KPI goal" wide>
        <form onSubmit={(e) => { e.preventDefault(); submitGoal(new FormData(e.currentTarget)); }} className="space-y-4">
          <Input label="Title" name="title" required />
          <Input label="Description" name="description" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Target" name="target" type="number" step="0.01" required />
            <Input label="Current" name="current" type="number" step="0.01" defaultValue="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Unit" name="unit" options={[
              { value: "count", label: "Count" },
              { value: "currency", label: "Currency" },
              { value: "percent", label: "Percent" },
            ]} />
            <Select label="Period" name="period" options={[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start date" name="startDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
            <Input label="End date" name="endDate" type="date" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function GoalSection({
  title,
  goals,
  pending,
  onUpdate,
  onDelete,
}: {
  title: string;
  goals: Goal[];
  pending: boolean;
  onUpdate: (id: string, current: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {goals.length === 0 ? (
        <p className="text-sm text-slate-500">No {title.toLowerCase()} yet.</p>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
            return (
              <div key={goal.id} className="rounded-lg border border-white/5 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{goal.title}</p>
                    {goal.description && <p className="text-xs text-slate-500">{goal.description}</p>}
                  </div>
                  <button onClick={() => confirm("Delete goal?") && onDelete(goal.id)} className="text-slate-500 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{formatValue(goal.current, goal.unit)} / {formatValue(goal.target, goal.unit)}</span>
                  <span>{pct}%</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={goal.current}
                    className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
                    onBlur={(e) => onUpdate(goal.id, parseFloat(e.target.value) || 0)}
                    disabled={pending}
                  />
                  <span className="text-xs text-slate-600 self-center">{formatStatus(goal.unit)} · update progress</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
