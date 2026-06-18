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
    "/requests",
    "/kpis",
    "/sales",
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

export async function toggleTaskComplete(id: string) {
  await requireStaff();
  const task = await db.task.findUnique({ where: { id } });
  if (!task) return { ok: false as const };

  const status: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
  await db.task.update({ where: { id }, data: { status } });
  revalidateAll();
  return { ok: true as const, status };
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

  try {
    await db.$transaction(async (tx) => {
      const projects = await tx.project.findMany({
        where: { clientId: id },
        select: { id: true },
      });
      const projectIds = projects.map((p) => p.id);

      if (projectIds.length > 0) {
        await tx.task.deleteMany({ where: { projectId: { in: projectIds } } });
        await tx.deliverable.deleteMany({ where: { projectId: { in: projectIds } } });
        await tx.expense.deleteMany({ where: { projectId: { in: projectIds } } });
        await tx.timelineEvent.deleteMany({ where: { projectId: { in: projectIds } } });
        await tx.project.deleteMany({ where: { clientId: id } });
      }

      await tx.invoice.deleteMany({ where: { clientId: id } });
      await tx.agreement.deleteMany({ where: { clientId: id } });
      await tx.meeting.deleteMany({ where: { clientId: id } });
      await tx.activityLog.deleteMany({ where: { clientId: id } });
      await tx.clientRequest.deleteMany({ where: { clientId: id } });
      await tx.contact.deleteMany({ where: { clientId: id } });
      await tx.outreachTouch.deleteMany({ where: { clientId: id } });

      const linkedUsers = await tx.user.findMany({
        where: { clientId: id },
        select: { id: true },
      });
      const userIds = linkedUsers.map((u) => u.id);

      if (userIds.length > 0) {
        await tx.expense.deleteMany({ where: { submittedById: { in: userIds } } });
        await tx.task.updateMany({
          where: { assigneeId: { in: userIds } },
          data: { assigneeId: null },
        });
        await tx.task.updateMany({
          where: { createdById: { in: userIds } },
          data: { createdById: null },
        });
        await tx.activityLog.updateMany({
          where: { userId: { in: userIds } },
          data: { userId: null },
        });
        await tx.user.deleteMany({ where: { clientId: id } });
      }

      await tx.client.delete({ where: { id } });
    });

    revalidateAll();
    return { ok: true as const };
  } catch (error) {
    console.error("deleteClient failed:", error);
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Could not delete client. Remove linked records or try again.",
    };
  }
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
  try {
    const user = await requireAdmin();
    const a = await db.agreement.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status || "DRAFT",
        clientId: data.clientId,
        value: data.value != null && Number.isFinite(data.value) ? data.value : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    await logActivity({
      type: "AGREEMENT_SIGNED",
      title: `Agreement created: ${a.title}`,
      clientId: a.clientId,
      userId: user.id,
    });
    revalidateAll();
    return { ok: true as const, id: a.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create agreement";
    return { ok: false as const, error: message };
  }
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
  const agreement = await db.agreement.findUnique({ where: { id } });
  if (agreement?.documentUrl) {
    const { deleteAgreementPdf } = await import("@/lib/agreement-documents");
    await deleteAgreementPdf(agreement.documentUrl);
  }
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

// ─── Client requests ─────────────────────────────────────────────────────────

export async function submitClientRequest(data: {
  title: string;
  description?: string;
  category?: string;
  projectId?: string;
}) {
  const user = await requireAuth();
  if (user.role !== "CLIENT" || !user.clientId) {
    return { ok: false as const, error: "Client access required" };
  }

  const { findAssigneeForCategory } = await import("@/lib/routing");
  const category = data.category || "general";
  const assigneeId = await findAssigneeForCategory(db, category);

  const project =
    (data.projectId
      ? await db.project.findFirst({ where: { id: data.projectId, clientId: user.clientId } })
      : null) ||
    (await db.project.findFirst({
      where: { clientId: user.clientId, status: { in: ["active", "implementation"] } },
      orderBy: { updatedAt: "desc" },
    }));

  const task = await db.task.create({
    data: {
      title: data.title,
      description: data.description || `Client request (${category})`,
      status: "TODO",
      priority: category === "bug" ? "high" : "medium",
      projectId: project?.id,
      assigneeId: assigneeId ?? undefined,
      createdById: user.id,
      isClientVisible: true,
    },
  });

  let deliverableId: string | undefined;
  if (project && ["content", "feature", "email"].includes(category)) {
    const deliverable = await db.deliverable.create({
      data: {
        title: data.title,
        description: data.description,
        status: "PLANNED",
        projectId: project.id,
      },
    });
    deliverableId = deliverable.id;
  }

  const request = await db.clientRequest.create({
    data: {
      title: data.title,
      description: data.description,
      category,
      source: "portal",
      clientId: user.clientId,
      projectId: project?.id,
      submittedById: user.id,
      assigneeId: assigneeId ?? undefined,
      taskId: task.id,
      deliverableId,
    },
  });

  if (assigneeId) {
    await db.notification.create({
      data: {
        userId: assigneeId,
        title: "New client request",
        message: `${data.title} from ${user.name}`,
        link: "/requests",
      },
    });
  }

  await notifyTeam({
    title: "Client request submitted",
    message: data.title,
    link: "/requests",
    excludeUserId: user.id,
  });

  await logActivity({
    type: "TASK_CREATED",
    title: `Client request: ${data.title}`,
    description: data.description,
    clientId: user.clientId,
    userId: user.id,
    metadata: { requestId: request.id, category },
  });

  revalidateAll();
  return { ok: true as const, id: request.id };
}

export async function updateClientRequestStatus(id: string, status: string) {
  await requireStaff();
  await db.clientRequest.update({ where: { id }, data: { status } });
  revalidateAll();
  return { ok: true };
}

export async function processInboundEmail(data: {
  from: string;
  to: string;
  subject: string;
  body: string;
  clientId?: string;
}) {
  const { parseSenderEmail } = await import("@/lib/inbound-email");
  const fromEmail = parseSenderEmail(data.from);
  if (!fromEmail && !data.clientId) {
    throw new Error("Could not parse sender email");
  }

  let client = data.clientId
    ? await db.client.findUnique({ where: { id: data.clientId } })
    : null;
  if (data.clientId && !client) {
    throw new Error("Client not found");
  }

  const senderLabel = fromEmail ?? data.from;

  if (!client && fromEmail) {
    client = await db.client.findFirst({
      where: { email: { equals: fromEmail, mode: "insensitive" } },
    });
    if (!client) {
      const portalUser = await db.user.findUnique({
        where: { email: fromEmail },
        select: { clientId: true },
      });
      if (portalUser?.clientId) {
        client = await db.client.findUnique({ where: { id: portalUser.clientId } });
      }
    }
  }

  const { findAssigneeForCategory, normalizeEmailCategory, findActiveProjectForClient } = await import("@/lib/routing");
  const category = normalizeEmailCategory(data.subject, data.body);
  const assigneeId = await findAssigneeForCategory(db, category);

  const project = client
    ? await findActiveProjectForClient(db, client.id)
    : null;

  if (!client || !project) {
    if (!client) {
      await notifyTeam({
        title: "Inbound email (unknown sender)",
        message: `${data.subject} from ${senderLabel}`,
        link: "/requests",
      });
      throw new Error(`No client matched for ${senderLabel}`);
    }

    const request = await db.clientRequest.create({
      data: {
        title: data.subject || "Inbound email",
        description: `${data.body}\n\n---\nFrom: ${data.from}\nTo: ${data.to}`,
        category,
        source: "email",
        status: "open",
        clientId: client.id,
        assigneeId: assigneeId ?? undefined,
      },
    });
    await notifyTeam({
      title: "Inbound email (no active project)",
      message: data.subject,
      link: "/requests",
    });
    revalidateAll();
    return { ok: true, requestId: request.id, matched: false };
  }

  const deliverable = await db.deliverable.create({
    data: {
      title: data.subject || "Email request",
      description: `${data.body}\n\n---\nFrom: ${data.from}`,
      status: "PLANNED",
      projectId: project.id,
    },
  });

  const task = await db.task.create({
    data: {
      title: `Email: ${data.subject}`,
      description: data.body.slice(0, 2000),
      status: "TODO",
      priority: "medium",
      projectId: project.id,
      assigneeId: assigneeId ?? undefined,
      isClientVisible: true,
    },
  });

  const request = await db.clientRequest.create({
    data: {
      title: data.subject || "Inbound email",
      description: data.body,
      category,
      source: "email",
      status: "open",
      clientId: client.id,
      projectId: project.id,
      assigneeId: assigneeId ?? undefined,
      taskId: task.id,
      deliverableId: deliverable.id,
    },
  });

  if (assigneeId) {
    await db.notification.create({
      data: {
        userId: assigneeId,
        title: "Email routed to deliverables",
        message: data.subject,
        link: "/deliverables",
      },
    });
  }

  await notifyTeam({
    title: "Email → deliverable created",
    message: `${data.subject} from ${senderLabel}`,
    link: "/deliverables",
  });

  await logActivity({
    type: "DELIVERABLE_UPDATED",
    title: `Email deliverable: ${data.subject}`,
    description: `From ${senderLabel}`,
    clientId: client.id,
    metadata: { requestId: request.id, deliverableId: deliverable.id },
  });

  revalidateAll();
  return { ok: true, requestId: request.id, deliverableId: deliverable.id, matched: true };
}

export async function logEmailRequest(data: {
  clientId: string;
  from: string;
  subject: string;
  body: string;
}) {
  await requireStaff();
  try {
    const result = await processInboundEmail({
      from: data.from,
      to: process.env.INBOUND_EMAIL_ADDRESS || "dev@northops.org",
      subject: data.subject,
      body: data.body,
      clientId: data.clientId,
    });
    return { ok: true as const, requestId: result.requestId, deliverableId: result.deliverableId, matched: result.matched };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not log email";
    return { ok: false as const, error: message };
  }
}

// ─── KPI goals ───────────────────────────────────────────────────────────────

export async function createKpiGoal(data: {
  title: string;
  description?: string;
  target: number;
  current?: number;
  unit?: string;
  period: string;
  startDate: string;
  endDate?: string;
}) {
  await requireAdmin();
  await db.kpiGoal.create({
    data: {
      title: data.title,
      description: data.description,
      target: data.target,
      current: data.current ?? 0,
      unit: data.unit || "count",
      period: data.period,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  revalidateAll();
  return { ok: true };
}

export async function updateKpiGoal(
  id: string,
  data: Partial<{ title: string; description: string; target: number; current: number; unit: string; period: string; startDate: string; endDate: string }>
) {
  await requireAdmin();
  await db.kpiGoal.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  revalidateAll();
  return { ok: true };
}

export async function deleteKpiGoal(id: string) {
  await requireAdmin();
  await db.kpiGoal.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}
