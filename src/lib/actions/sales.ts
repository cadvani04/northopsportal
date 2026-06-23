"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireOutreachAccess } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { logOutreachWithAttachments, createOutreachProspect as createProspect } from "@/lib/outreach/service";
import type {
  OutreachChannel,
  OutreachOutcome,
  PipelineStage,
} from "@/generated/prisma/enums";
import { pipelineStageLabel } from "@/lib/sales/constants";

function revalidateSales() {
  ["/sales", "/clients", "/activity", "/kpis", "/"].forEach((p) => revalidatePath(p));
}

export async function createSalesAccount(data: {
  company: string;
  name: string;
  email: string;
  phone?: string;
  pipelineStage?: PipelineStage;
  ownerId?: string;
  source?: string;
  industry?: string;
  dealValue?: number;
  probability?: number;
  nextFollowUp?: string;
  notes?: string;
}) {
  const user = await requireAdmin();
  const stage = data.pipelineStage ?? "COLD_OUTREACH";

  const client = await db.client.create({
    data: {
      company: data.company,
      name: data.name,
      email: data.email,
      phone: data.phone,
      status: stage === "ACTIVE" ? "active" : stage === "CLOSED_LOST" ? "closed-lost" : "prospect",
      pipelineStage: stage,
      ownerId: data.ownerId || user.id,
      source: data.source,
      industry: data.industry,
      dealValue: data.dealValue,
      probability: data.probability ?? (stage === "COLD_OUTREACH" ? 10 : 25),
      nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : undefined,
      notes: data.notes,
      contacts: {
        create: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          isPrimary: true,
        },
      },
      projects: {
        create: {
          name: stage === "COLD_OUTREACH" ? "Cold Outreach" : "Sales Opportunity",
          status: stage === "COLD_OUTREACH" ? "outreach" : "discovery",
        },
      },
    },
  });

  await logActivity({
    type: "SYSTEM",
    title: `Sales account created: ${client.company}`,
    clientId: client.id,
    userId: user.id,
  });

  revalidateSales();
  return { ok: true as const, id: client.id };
}

export async function createOutreachProspect(data: {
  company: string;
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  notes?: string;
}) {
  const user = await requireOutreachAccess();

  const prospect = await createProspect({
    ...data,
    ownerId: user.id,
  });

  revalidateSales();
  revalidatePath("/sales/outreach");
  return { ok: true as const, prospect };
}

export async function updateSalesAccount(
  id: string,
  data: Partial<{
    company: string;
    name: string;
    email: string;
    phone: string;
    pipelineStage: PipelineStage;
    ownerId: string;
    source: string;
    industry: string;
    dealValue: number;
    probability: number;
    nextFollowUp: string;
    notes: string;
  }>
) {
  const user = await requireAdmin();
  const existing = await db.client.findUnique({ where: { id } });
  if (!existing) return { ok: false as const, error: "Account not found" };

  const stage = data.pipelineStage;
  const status =
    stage === "ACTIVE"
      ? "active"
      : stage === "COMMITTED"
        ? "committed"
        : stage === "NEGOTIATION"
          ? "prospect-advanced"
          : stage === "CLOSED_LOST"
            ? "closed-lost"
            : stage === "COLD_OUTREACH" || stage === "DISCOVERY" || stage === "PROPOSAL"
              ? "prospect"
              : existing.status;

  await db.client.update({
    where: { id },
    data: {
      company: data.company,
      name: data.name,
      email: data.email,
      phone: data.phone,
      pipelineStage: stage,
      status: stage ? status : undefined,
      ownerId: data.ownerId,
      source: data.source,
      industry: data.industry,
      dealValue: data.dealValue,
      probability: data.probability,
      nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : data.nextFollowUp === "" ? null : undefined,
      notes: data.notes,
    },
  });

  if (stage && stage !== existing.pipelineStage) {
    await logActivity({
      type: "STAGE_CHANGED",
      title: `${existing.company} moved to ${pipelineStageLabel(stage)}`,
      clientId: id,
      userId: user.id,
    });
  }

  revalidateSales();
  revalidatePath(`/sales/${id}`);
  return { ok: true as const };
}

export async function logOutreachTouch(data: {
  clientId: string;
  contactId?: string;
  channel: OutreachChannel;
  subject?: string;
  notes?: string;
  outcome?: OutreachOutcome;
  touchedAt?: string;
  nextFollowUp?: string;
}) {
  const user = await requireOutreachAccess();

  const { touch } = await logOutreachWithAttachments(
    {
      clientId: data.clientId,
      contactId: data.contactId,
      channel: data.channel,
      subject: data.subject,
      notes: data.notes,
      outcome: data.outcome ?? "SENT",
      touchedAt: data.touchedAt ? new Date(data.touchedAt) : new Date(),
      nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : undefined,
      ownerId: user.id,
    },
    []
  );

  revalidateSales();
  revalidatePath(`/sales/${data.clientId}`);
  return { ok: true as const, id: touch.id };
}

export async function createContact(data: {
  clientId: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  isPrimary?: boolean;
  notes?: string;
}) {
  const user = await requireAdmin();

  if (data.isPrimary) {
    await db.contact.updateMany({
      where: { clientId: data.clientId },
      data: { isPrimary: false },
    });
  }

  const contact = await db.contact.create({ data });

  await logActivity({
    type: "CONTACT_ADDED",
    title: `Contact added: ${contact.name}`,
    clientId: data.clientId,
    userId: user.id,
  });

  revalidateSales();
  revalidatePath(`/sales/${data.clientId}`);
  return { ok: true as const, id: contact.id };
}

export async function deleteContact(id: string, clientId: string) {
  await requireAdmin();
  await db.contact.delete({ where: { id } });
  revalidateSales();
  revalidatePath(`/sales/${clientId}`);
  return { ok: true as const };
}

export async function deleteOutreachTouch(id: string, clientId: string) {
  await requireAdmin();
  await db.outreachTouch.delete({ where: { id } });
  revalidateSales();
  revalidatePath(`/sales/${clientId}`);
  return { ok: true as const };
}
