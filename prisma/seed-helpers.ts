import type { PrismaClient } from "../src/generated/prisma/client";
import type {
  ActivityType,
  AgreementStatus,
  DeliverableStatus,
  InvoiceStatus,
  TaskStatus,
} from "../src/generated/prisma/enums";

export function companySlug(company: string) {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Placeholder email when a real address is not confirmed. */
export function placeholderEmail(company: string, contact?: string) {
  const slug = companySlug(company);
  const contactPart = contact ? `+${companySlug(contact)}` : "";
  return `unknown${contactPart}@${slug}.northops-seed`;
}

export type ClientSeed = {
  company: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
};

export async function findClientByCompany(prisma: PrismaClient, company: string) {
  return prisma.client.findFirst({
    where: { company: { equals: company, mode: "insensitive" } },
  });
}

export async function upsertClient(prisma: PrismaClient, data: ClientSeed) {
  const existing = await findClientByCompany(prisma, data.company);
  if (existing) {
    return prisma.client.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        email: existing.email.includes("northops-seed") ? data.email : existing.email,
        phone: data.phone ?? existing.phone,
        status: data.status,
      },
    });
  }
  return prisma.client.create({ data });
}

export async function upsertProject(
  prisma: PrismaClient,
  clientId: string,
  name: string,
  data: {
    description?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    budget?: number;
  }
) {
  const existing = await prisma.project.findFirst({
    where: { clientId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    return prisma.project.update({
      where: { id: existing.id },
      data: {
        description: data.description ?? existing.description,
        status: data.status ?? existing.status,
        startDate: data.startDate ?? existing.startDate,
        endDate: data.endDate ?? existing.endDate,
        budget: data.budget ?? existing.budget,
      },
    });
  }
  return prisma.project.create({
    data: { clientId, name, ...data },
  });
}

export async function upsertAgreement(
  prisma: PrismaClient,
  clientId: string,
  title: string,
  data: {
    description?: string;
    status: AgreementStatus;
    value?: number;
    startDate?: Date;
    endDate?: Date;
    signedAt?: Date;
  }
) {
  const existing = await prisma.agreement.findFirst({
    where: { clientId, title: { equals: title, mode: "insensitive" } },
  });
  if (existing) {
    return prisma.agreement.update({
      where: { id: existing.id },
      data: {
        description: data.description ?? existing.description,
        status: data.status,
        value: data.value ?? existing.value,
        startDate: data.startDate ?? existing.startDate,
        endDate: data.endDate ?? existing.endDate,
        signedAt: data.signedAt ?? existing.signedAt,
      },
    });
  }
  return prisma.agreement.create({
    data: { clientId, title, ...data },
  });
}

export async function upsertInvoice(
  prisma: PrismaClient,
  clientId: string,
  number: string,
  data: {
    status: InvoiceStatus;
    amount: number;
    tax?: number;
    total: number;
    dueDate?: Date;
    paidAt?: Date;
    notes?: string;
    lineItems?: { description: string; quantity: number; unitPrice: number; total: number }[];
  }
) {
  const existing = await prisma.invoice.findUnique({ where: { number } });
  if (existing) {
    return prisma.invoice.update({
      where: { id: existing.id },
      data: {
        status: data.status,
        amount: data.amount,
        tax: data.tax ?? existing.tax,
        total: data.total,
        dueDate: data.dueDate ?? existing.dueDate,
        paidAt: data.paidAt ?? existing.paidAt,
        notes: data.notes ?? existing.notes,
      },
    });
  }
  return prisma.invoice.create({
    data: {
      clientId,
      number,
      amount: data.amount,
      tax: data.tax ?? 0,
      total: data.total,
      status: data.status,
      dueDate: data.dueDate,
      paidAt: data.paidAt,
      notes: data.notes,
      lineItems: data.lineItems
        ? { create: data.lineItems }
        : undefined,
    },
  });
}

export async function upsertMeeting(
  prisma: PrismaClient,
  clientId: string,
  title: string,
  date: Date,
  data: {
    duration?: number;
    participants?: string;
    summary?: string;
    actionItems?: string;
  }
) {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const existing = await prisma.meeting.findFirst({
    where: {
      clientId,
      title: { equals: title, mode: "insensitive" },
      date: { gte: dayStart, lte: dayEnd },
    },
  });
  if (existing) {
    return prisma.meeting.update({
      where: { id: existing.id },
      data: {
        duration: data.duration ?? existing.duration,
        participants: data.participants ?? existing.participants,
        summary: data.summary ?? existing.summary,
        actionItems: data.actionItems ?? existing.actionItems,
      },
    });
  }
  return prisma.meeting.create({
    data: { clientId, title, date, ...data },
  });
}

export async function upsertTimelineEvent(
  prisma: PrismaClient,
  projectId: string,
  title: string,
  date: Date,
  data: { description?: string; type?: string }
) {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const existing = await prisma.timelineEvent.findFirst({
    where: {
      projectId,
      title: { equals: title, mode: "insensitive" },
      date: { gte: dayStart, lte: dayEnd },
    },
  });
  if (existing) {
    return prisma.timelineEvent.update({
      where: { id: existing.id },
      data: {
        description: data.description ?? existing.description,
        type: data.type ?? existing.type,
      },
    });
  }
  return prisma.timelineEvent.create({
    data: { projectId, title, date, ...data },
  });
}

export async function upsertTask(
  prisma: PrismaClient,
  title: string,
  data: {
    projectId?: string;
    description?: string;
    status?: TaskStatus;
    priority?: string;
    dueDate?: Date;
    assigneeId?: string;
    createdById?: string;
    isClientVisible?: boolean;
  }
) {
  const existing = await prisma.task.findFirst({
    where: {
      title: { equals: title, mode: "insensitive" },
      projectId: data.projectId ?? null,
    },
  });
  if (existing) {
    return prisma.task.update({
      where: { id: existing.id },
      data: {
        description: data.description ?? existing.description,
        status: data.status ?? existing.status,
        priority: data.priority ?? existing.priority,
        dueDate: data.dueDate ?? existing.dueDate,
        assigneeId: data.assigneeId ?? existing.assigneeId,
        isClientVisible: data.isClientVisible ?? existing.isClientVisible,
      },
    });
  }
  return prisma.task.create({ data: { title, ...data } });
}

export async function upsertDeliverable(
  prisma: PrismaClient,
  projectId: string,
  title: string,
  data: {
    description?: string;
    status?: DeliverableStatus;
    dueDate?: Date;
  }
) {
  const existing = await prisma.deliverable.findFirst({
    where: { projectId, title: { equals: title, mode: "insensitive" } },
  });
  if (existing) {
    return prisma.deliverable.update({
      where: { id: existing.id },
      data: {
        description: data.description ?? existing.description,
        status: data.status ?? existing.status,
        dueDate: data.dueDate ?? existing.dueDate,
      },
    });
  }
  return prisma.deliverable.create({
    data: { projectId, title, ...data },
  });
}

export async function upsertActivity(
  prisma: PrismaClient,
  title: string,
  type: ActivityType,
  data: {
    description?: string;
    clientId?: string;
    userId?: string;
    metadata?: string;
    createdAt?: Date;
  }
) {
  const existing = await prisma.activityLog.findFirst({
    where: {
      title: { equals: title, mode: "insensitive" },
      clientId: data.clientId ?? null,
    },
  });
  if (existing) {
    return prisma.activityLog.update({
      where: { id: existing.id },
      data: {
        description: data.description ?? existing.description,
        type,
        metadata: data.metadata ?? existing.metadata,
      },
    });
  }
  return prisma.activityLog.create({
    data: {
      title,
      type,
      description: data.description,
      clientId: data.clientId,
      userId: data.userId,
      metadata: data.metadata,
      createdAt: data.createdAt,
    },
  });
}
