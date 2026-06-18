import { db } from "@/lib/db";
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, subWeeks } from "date-fns";

export async function getKpiMetrics() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastWeekStart = subWeeks(weekStart, 1);

  const [
    openTasks,
    tasksDoneThisWeek,
    tasksDoneLastWeek,
    deliverablesInProgress,
    deliverablesCompletedMonth,
    revenueMonth,
    revenueWeek,
    expensesMonth,
    expensesPending,
    activeClients,
    meetingsWeek,
    openRequests,
    goals,
  ] = await Promise.all([
    db.task.count({ where: { status: { not: "DONE" } } }),
    db.task.count({
      where: { status: "DONE", updatedAt: { gte: weekStart, lte: weekEnd } },
    }),
    db.task.count({
      where: { status: "DONE", updatedAt: { gte: lastWeekStart, lt: weekStart } },
    }),
    db.deliverable.count({
      where: { status: { in: ["PLANNED", "IN_PROGRESS", "REVIEW"] } },
    }),
    db.deliverable.count({
      where: {
        status: { in: ["DELIVERED", "APPROVED"] },
        updatedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    db.invoice.aggregate({
      where: { status: "PAID", paidAt: { gte: monthStart, lte: monthEnd } },
      _sum: { total: true },
    }),
    db.invoice.aggregate({
      where: { status: "PAID", paidAt: { gte: weekStart, lte: weekEnd } },
      _sum: { total: true },
    }),
    db.expense.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd }, status: { not: "REJECTED" } },
      _sum: { amount: true },
    }),
    db.expense.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
    db.client.count({ where: { status: { in: ["active", "implementation", "committed"] } } }),
    db.meeting.count({ where: { date: { gte: weekStart, lte: weekEnd } } }),
    db.clientRequest.count({ where: { status: { in: ["open", "in_progress"] } } }),
    db.kpiGoal.findMany({ orderBy: [{ period: "asc" }, { startDate: "desc" }] }),
  ]);

  const suggestedTasks = await db.task.findMany({
    where: { status: { not: "DONE" }, dueDate: { lte: weekEnd } },
    include: { project: { include: { client: true } }, assignee: true },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    take: 8,
  });

  const timeline = await db.timelineEvent.findMany({
    where: { date: { gte: monthStart } },
    include: { project: { include: { client: true } } },
    orderBy: { date: "asc" },
    take: 12,
  });

  return {
    openTasks,
    tasksDoneThisWeek,
    tasksDoneLastWeek,
    taskTrend: tasksDoneThisWeek - tasksDoneLastWeek,
    deliverablesInProgress,
    deliverablesCompletedMonth,
    revenueMonth: revenueMonth._sum.total ?? 0,
    revenueWeek: revenueWeek._sum.total ?? 0,
    expensesMonth: expensesMonth._sum.amount ?? 0,
    expensesPending: expensesPending._sum.amount ?? 0,
    activeClients,
    meetingsWeek,
    openRequests,
    goals,
    suggestedTasks,
    timeline,
    weekStart,
    monthStart,
  };
}

export async function getClientRequests() {
  return db.clientRequest.findMany({
    include: {
      client: true,
      project: true,
      assignee: true,
      submittedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
