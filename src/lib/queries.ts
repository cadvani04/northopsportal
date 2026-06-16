import { db } from "./db";

export async function getProjects() {
  return db.project.findMany({
    include: { client: true },
    orderBy: { name: "asc" },
  });
}

export async function getDashboardStats(userId?: string) {
  const taskWhere = userId ? { assigneeId: userId, status: { not: "DONE" as const } } : { status: { not: "DONE" as const } };
  const [
    openTasks,
    overdueTasks,
    pendingDeliverables,
    unpaidInvoices,
    totalRevenue,
    pendingExpenses,
    recentMeetings,
    activeClients,
  ] = await Promise.all([
    db.task.count({ where: taskWhere }),
    db.task.count({
      where: { ...taskWhere, dueDate: { lt: new Date() } },
    }),
    db.deliverable.count({
      where: { status: { notIn: ["DELIVERED", "APPROVED"] } },
    }),
    db.invoice.count({ where: { status: { in: ["SENT", "OVERDUE"] } } }),
    db.invoice.aggregate({
      where: { status: "PAID" },
      _sum: { total: true },
    }),
    db.expense.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
    db.meeting.count({
      where: { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    db.client.count({ where: { status: "active" } }),
  ]);

  return {
    openTasks,
    overdueTasks,
    pendingDeliverables,
    unpaidInvoices,
    totalRevenue: totalRevenue._sum.total ?? 0,
    pendingExpenses: pendingExpenses._sum.amount ?? 0,
    recentMeetings,
    activeClients,
  };
}

export async function getMyTasks(userId?: string) {
  return db.task.findMany({
    where: userId ? { assigneeId: userId } : undefined,
    include: {
      assignee: true,
      project: { include: { client: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 20,
  });
}

export async function getRecentActivity(limit = 10) {
  return db.activityLog.findMany({
    include: { user: true, client: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getTasks(filters?: { status?: string; assigneeId?: string }) {
  return db.task.findMany({
    where: {
      ...(filters?.status && { status: filters.status as never }),
      ...(filters?.assigneeId && { assigneeId: filters.assigneeId }),
    },
    include: {
      assignee: true,
      project: { include: { client: true } },
      createdBy: true,
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
}

export async function getDeliverables() {
  return db.deliverable.findMany({
    include: { project: { include: { client: true } } },
    orderBy: { dueDate: "asc" },
  });
}

export async function getAgreements() {
  return db.agreement.findMany({
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoices() {
  return db.invoice.findMany({
    include: { client: true, lineItems: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getExpenses() {
  return db.expense.findMany({
    include: { project: true, submittedBy: true },
    orderBy: { date: "desc" },
  });
}

export async function getMeetings() {
  return db.meeting.findMany({
    include: { client: true },
    orderBy: { date: "desc" },
  });
}

export async function getClients() {
  return db.client.findMany({
    include: {
      _count: {
        select: { projects: true, invoices: true, agreements: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getTimelineEvents() {
  return db.timelineEvent.findMany({
    include: { project: { include: { client: true } } },
    orderBy: { date: "asc" },
  });
}

export async function getClientPortalData(clientId: string) {
  const [client, tasks, deliverables, agreements, invoices, meetings, activities] =
    await Promise.all([
      db.client.findUnique({ where: { id: clientId } }),
      db.task.findMany({
        where: { isClientVisible: true, project: { clientId } },
        include: { project: true, assignee: true },
        orderBy: { dueDate: "asc" },
      }),
      db.deliverable.findMany({
        where: { project: { clientId } },
        include: { project: true },
        orderBy: { dueDate: "asc" },
      }),
      db.agreement.findMany({
        where: { clientId, status: { not: "DRAFT" } },
        orderBy: { createdAt: "desc" },
      }),
      db.invoice.findMany({
        where: { clientId, status: { not: "DRAFT" } },
        include: { lineItems: true },
        orderBy: { createdAt: "desc" },
      }),
      db.meeting.findMany({
        where: { clientId },
        orderBy: { date: "desc" },
      }),
      db.activityLog.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  return { client, tasks, deliverables, agreements, invoices, meetings, activities };
}

export async function getTeamMembers() {
  return db.user.findMany({
    where: { role: { in: ["ADMIN", "TEAM"] } },
    orderBy: { name: "asc" },
  });
}
