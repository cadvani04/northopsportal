"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireAuth, requireStaff, getSessionUser } from "@/lib/auth/session";
import { logActivity, notifyTeam, notifyClientUsers } from "@/lib/activity";
import { emailInvoiceSent } from "@/lib/email";
import type {
  TaskStatus,
  DeliverableStatus,
  AgreementStatus,
  InvoiceStatus,
  ExpenseStatus,
} from "@/generated/prisma/enums";

function revalidateAll() {
  const paths = [
    "/",
    "/tasks",
    "/deliverables",
    "/agreements",
    "/invoices",
    "/expenses",
    "/timeline",
    "/meetings",
    "/clients",
    "/activity",
    "/portal",
  ];
  paths.forEach((p) => revalidatePath(p));
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function createTask(data: {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: string;
  dueDate?: string;
  projectId?: string;
  assigneeId?: string;
  isClientVisible?: boolean;
}) {
  const user = await requireAdmin();
  const task = await db.task.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status || "TODO",
      priority: data.priority || "medium",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      projectId: data.projectId || undefined,
      assigneeId: data.assigneeId || undefined,
      isClientVisible: data.isClientVisible ?? false,
      createdById: user.id,
    },
  });
  await logActivity({
    type: "TASK_CREATED",
    title: `Task created: ${task.title}`,
    userId: user.id,
  });
  if (task.assigneeId && task.assigneeId !== user.id) {
    await db.notification.create({
      data: {
        userId: task.assigneeId,
        title: "New task assigned",
        message: task.title,
        link: "/tasks",
      },
    });
  }
  revalidateAll();
  return { ok: true, id: task.id };
}

export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: string;
    dueDate: string;
    projectId: string;
    assigneeId: string;
    isClientVisible: boolean;
  }>
) {
  const user = await requireAdmin();
  const task = await db.task.update({
    where: { id },
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      projectId: data.projectId || undefined,
      assigneeId: data.assigneeId || undefined,
    },
  });
  await logActivity({ type: "TASK_UPDATED", title: `Task updated: ${task.title}`, userId: user.id });
  revalidateAll();
  return { ok: true };
}

export async function deleteTask(id: string) {
  const user = await requireAdmin();
  const task = await db.task.delete({ where: { id } });
  await logActivity({ type: "TASK_DELETED", title: `Task deleted: ${task.title}`, userId: user.id });
  revalidateAll();
  return { ok: true };
}

// ─── Deliverables ────────────────────────────────────────────────────────────

export async function createDeliverable(data: {
  title: string;
  description?: string;
  status?: DeliverableStatus;
  dueDate?: string;
  projectId: string;
}) {
  const user = await requireAdmin();
  const d = await db.deliverable.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status || "PLANNED",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      projectId: data.projectId,
    },
    include: { project: true },
  });
  await logActivity({
    type: "DELIVERABLE_UPDATED",
    title: `Deliverable created: ${d.title}`,
    clientId: d.project.clientId,
    userId: user.id,
  });
  revalidateAll();
  return { ok: true, id: d.id };
}

export async function updateDeliverable(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: DeliverableStatus;
    dueDate: string;
    deliveredAt: string;
  }>
) {
  const user = await requireAdmin();
  const d = await db.deliverable.update({
    where: { id },
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : undefined,
    },
    include: { project: true },
  });
  await logActivity({
    type: "DELIVERABLE_UPDATED",
    title: `Deliverable updated: ${d.title}`,
    clientId: d.project.clientId,
    userId: user.id,
  });
  if (d.status === "DELIVERED" || d.status === "APPROVED") {
    await notifyClientUsers(d.project.clientId, {
      title: `Deliverable ${d.status.toLowerCase()}`,
      message: d.title,
      link: "/portal",
    });
  }
  revalidateAll();
  return { ok: true };
}

export async function deleteDeliverable(id: string) {
  await requireAdmin();
  await db.deliverable.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function createClient(data: {
  name: string;
  company: string;
  email: string;
  phone?: string;
  status?: string;
}) {
  await requireAdmin();
  const client = await db.client.create({ data });
  revalidateAll();
  return { ok: true, id: client.id };
}

export async function updateClient(
  id: string,
  data: Partial<{ name: string; company: string; email: string; phone: string; status: string }>
) {
  await requireAdmin();
  await db.client.update({ where: { id }, data });
  revalidateAll();
  return { ok: true };
}

export async function deleteClient(id: string) {
  await requireAdmin();
  await db.client.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function createProject(data: {
  name: string;
  description?: string;
  clientId: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
}) {
  await requireAdmin();
  const project = await db.project.create({
    data: {
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      status: data.status || "active",
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      budget: data.budget,
    },
  });
  revalidateAll();
  return { ok: true, id: project.id };
}

// ─── Agreements ──────────────────────────────────────────────────────────────

export async function createAgreement(data: {
  title: string;
  description?: string;
  status?: AgreementStatus;
  value?: number;
  startDate?: string;
  endDate?: string;
  clientId: string;
}) {
  const user = await requireAdmin();
  const a = await db.agreement.create({ data: { ...data, status: data.status || "DRAFT" } });
  await logActivity({
    type: "AGREEMENT_SIGNED",
    title: `Agreement created: ${a.title}`,
    clientId: a.clientId,
    userId: user.id,
  });
  revalidateAll();
  return { ok: true, id: a.id };
}

export async function updateAgreement(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: AgreementStatus;
    value: number;
    startDate: string;
    endDate: string;
    signedAt: string;
  }>
) {
  const user = await requireAdmin();
  const a = await db.agreement.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      signedAt: data.signedAt ? new Date(data.signedAt) : undefined,
    },
  });
  if (a.status === "SIGNED") {
    await notifyClientUsers(a.clientId, {
      title: "Agreement signed",
      message: a.title,
      link: "/portal/agreements",
    });
  }
  revalidateAll();
  return { ok: true };
}

export async function deleteAgreement(id: string) {
  await requireAdmin();
  await db.agreement.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export async function createInvoice(data: {
  number: string;
  clientId: string;
  amount: number;
  tax?: number;
  dueDate?: string;
  notes?: string;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number }>;
}) {
  const user = await requireAdmin();
  const tax = data.tax ?? 0;
  const lineTotal =
    data.lineItems?.reduce((s, l) => s + l.quantity * l.unitPrice, 0) ?? data.amount;
  const total = lineTotal + tax;

  const invoice = await db.invoice.create({
    data: {
      number: data.number,
      clientId: data.clientId,
      amount: lineTotal,
      tax,
      total,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      notes: data.notes,
      lineItems: data.lineItems
        ? {
            create: data.lineItems.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              total: l.quantity * l.unitPrice,
            })),
          }
        : undefined,
    },
    include: { client: true },
  });
  await logActivity({
    type: "INVOICE_SENT",
    title: `Invoice created: ${invoice.number}`,
    clientId: invoice.clientId,
    userId: user.id,
  });
  revalidateAll();
  return { ok: true, id: invoice.id };
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const user = await requireAdmin();
  const invoice = await db.invoice.update({
    where: { id },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : undefined,
    },
    include: { client: true },
  });

  if (status === "SENT") {
    await notifyClientUsers(invoice.clientId, {
      title: "New invoice available",
      message: invoice.number,
      link: "/portal/invoices",
    });
    await emailInvoiceSent({
      clientEmail: invoice.client.email,
      clientName: invoice.client.name,
      invoiceNumber: invoice.number,
      total: `$${invoice.total.toFixed(2)}`,
      dueDate: invoice.dueDate?.toLocaleDateString(),
    });
    await logActivity({
      type: "INVOICE_SENT",
      title: `Invoice sent: ${invoice.number}`,
      clientId: invoice.clientId,
      userId: user.id,
    });
  }

  if (status === "PAID") {
    await logActivity({
      type: "INVOICE_PAID",
      title: `Invoice paid: ${invoice.number}`,
      clientId: invoice.clientId,
      userId: user.id,
    });
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteInvoice(id: string) {
  await requireAdmin();
  await db.invoice.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function createExpense(data: {
  title: string;
  description?: string;
  amount: number;
  category: string;
  date: string;
  projectId?: string;
}) {
  const user = await requireAuth();
  const expense = await db.expense.create({
    data: {
      ...data,
      date: new Date(data.date),
      submittedById: user.id,
    },
  });
  await logActivity({
    type: "EXPENSE_SUBMITTED",
    title: `Expense submitted: ${expense.title}`,
    userId: user.id,
  });
  await notifyTeam({
    title: "Expense needs approval",
    message: `${expense.title} — $${expense.amount}`,
    link: "/expenses",
    excludeUserId: user.id,
  });
  revalidateAll();
  return { ok: true, id: expense.id };
}

export async function updateExpenseStatus(id: string, status: ExpenseStatus) {
  const user = await requireStaff();
  const expense = await db.expense.update({ where: { id }, data: { status } });
  if (status === "APPROVED") {
    await logActivity({
      type: "EXPENSE_APPROVED",
      title: `Expense approved: ${expense.title}`,
      userId: user.id,
    });
    await db.notification.create({
      data: {
        userId: expense.submittedById,
        title: "Expense approved",
        message: expense.title,
        link: "/expenses",
      },
    });
  }
  revalidateAll();
  return { ok: true };
}

export async function deleteExpense(id: string) {
  await requireAdmin();
  await db.expense.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

// ─── Timeline ────────────────────────────────────────────────────────────────

export async function createTimelineEvent(data: {
  title: string;
  description?: string;
  date: string;
  type?: string;
  projectId: string;
}) {
  await requireAdmin();
  await db.timelineEvent.create({
    data: { ...data, date: new Date(data.date) },
  });
  revalidateAll();
  return { ok: true };
}

export async function deleteTimelineEvent(id: string) {
  await requireAdmin();
  await db.timelineEvent.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function markNotificationRead(id: string) {
  const user = await requireAuth();
  await db.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const user = await requireAuth();
  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function getNotifications() {
  const user = await requireAuth();
  return db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getUnreadCount() {
  const user = await getSessionUser();
  if (!user) return 0;
  return db.notification.count({ where: { userId: user.id, read: false } });
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchAll(query: string) {
  await requireAuth();
  if (!query.trim()) return { tasks: [], clients: [], invoices: [] };

  const q = query.trim();
  const [tasks, clients, invoices] = await Promise.all([
    db.task.findMany({
      where: { title: { contains: q } },
      take: 5,
      include: { project: { include: { client: true } } },
    }),
    db.client.findMany({
      where: {
        OR: [{ name: { contains: q } }, { company: { contains: q } }],
      },
      take: 5,
    }),
    db.invoice.findMany({
      where: { number: { contains: q } },
      take: 5,
      include: { client: true },
    }),
  ]);

  return { tasks, clients, invoices };
}

// ─── Client portal user ──────────────────────────────────────────────────────

export async function createClientUser(data: {
  name: string;
  email: string;
  password: string;
  clientId: string;
}) {
  const user = await requireAdmin();
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(data.password, 10);
  await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: "CLIENT",
      clientId: data.clientId,
    },
  });
  await logActivity({
    type: "SYSTEM",
    title: `Client user created: ${data.email}`,
    clientId: data.clientId,
    userId: user.id,
  });
  revalidateAll();
  return { ok: true };
}
