import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { RECEIPT_TYPES, uploadBuffer, uploadFile } from "@/lib/file-storage";
import type { OutreachChannel, OutreachOutcome } from "@/generated/prisma/enums";

export type LogOutreachInput = {
  clientId: string;
  contactId?: string;
  channel: OutreachChannel;
  subject?: string;
  notes?: string;
  outcome?: OutreachOutcome;
  touchedAt?: Date;
  nextFollowUp?: Date;
  ownerId: string;
};

export type CreateOutreachProspectInput = {
  company: string;
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  notes?: string;
  ownerId: string;
};

export async function createOutreachProspect(input: CreateOutreachProspectInput) {
  const client = await db.client.create({
    data: {
      company: input.company.trim(),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || undefined,
      status: "prospect",
      pipelineStage: "COLD_OUTREACH",
      ownerId: input.ownerId,
      source: "Cold outreach",
      probability: 10,
      notes: input.notes?.trim() || undefined,
      contacts: {
        create: {
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone?.trim() || undefined,
          linkedin: input.linkedin?.trim() || undefined,
          isPrimary: true,
        },
      },
      projects: {
        create: {
          name: "Cold Outreach",
          status: "outreach",
        },
      },
    },
    select: {
      id: true,
      company: true,
      name: true,
      pipelineStage: true,
      contacts: {
        where: { isPrimary: true },
        take: 1,
        select: { id: true, name: true },
      },
    },
  });

  await logActivity({
    type: "SYSTEM",
    title: `Prospect added: ${client.company}`,
    clientId: client.id,
    userId: input.ownerId,
  });

  return client;
}

export async function searchProspects(query: string, limit = 20) {
  const q = query.trim();
  if (!q) return [];

  return db.client.findMany({
    where: {
      status: { not: "internal" },
      OR: [
        { company: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { contacts: { some: { name: { contains: q, mode: "insensitive" } } } },
      ],
    },
    select: {
      id: true,
      company: true,
      name: true,
      email: true,
      pipelineStage: true,
      contacts: {
        where: { isPrimary: true },
        take: 1,
        select: { id: true, name: true },
      },
    },
    orderBy: { company: "asc" },
    take: limit,
  });
}

export async function createOutreachTouch(input: LogOutreachInput) {
  const touch = await db.outreachTouch.create({
    data: {
      clientId: input.clientId,
      contactId: input.contactId || undefined,
      channel: input.channel,
      subject: input.subject,
      notes: input.notes,
      outcome: input.outcome ?? "SENT",
      touchedAt: input.touchedAt ?? new Date(),
      nextFollowUp: input.nextFollowUp,
      ownerId: input.ownerId,
    },
  });

  if (input.nextFollowUp) {
    await db.client.update({
      where: { id: input.clientId },
      data: { nextFollowUp: input.nextFollowUp },
    });
  }

  if (input.outcome === "MEETING_BOOKED") {
    const client = await db.client.findUnique({ where: { id: input.clientId } });
    if (client?.pipelineStage === "COLD_OUTREACH") {
      await db.client.update({
        where: { id: input.clientId },
        data: {
          pipelineStage: "DISCOVERY",
          status: "prospect",
          probability: Math.min(100, client.probability + 15),
        },
      });
    }
  }

  await logActivity({
    type: "OUTREACH_LOGGED",
    title: `Outreach logged: ${input.channel}`,
    description: input.subject || input.notes,
    clientId: input.clientId,
    userId: input.ownerId,
  });

  return touch;
}

export async function addTouchAttachmentFromFile(touchId: string, file: File) {
  const touch = await db.outreachTouch.findUnique({ where: { id: touchId } });
  if (!touch) throw new Error("Outreach touch not found");

  const url = await uploadFile(`outreach/${touchId}`, file, {
    allowedTypes: RECEIPT_TYPES,
    localDir: "uploads/outreach",
  });

  return db.outreachAttachment.create({
    data: {
      outreachTouchId: touchId,
      url,
      filename: file.name,
      mimeType: file.type || undefined,
    },
  });
}

export async function addTouchAttachmentFromBuffer(
  touchId: string,
  buffer: Buffer,
  filename: string,
  mimeType?: string
) {
  const touch = await db.outreachTouch.findUnique({ where: { id: touchId } });
  if (!touch) throw new Error("Outreach touch not found");

  const url = await uploadBuffer(`outreach/${touchId}`, buffer, filename, {
    allowedTypes: RECEIPT_TYPES,
    localDir: "uploads/outreach",
    mimeType,
  });

  return db.outreachAttachment.create({
    data: {
      outreachTouchId: touchId,
      url,
      filename,
      mimeType: mimeType || undefined,
    },
  });
}

export async function logOutreachWithAttachments(
  input: LogOutreachInput,
  files: File[] = []
) {
  const touch = await createOutreachTouch(input);
  const attachments = [];

  for (const file of files) {
    attachments.push(await addTouchAttachmentFromFile(touch.id, file));
  }

  return { touch, attachments };
}
