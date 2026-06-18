import type { PrismaClient } from "../src/generated/prisma/client";
import type { OutreachChannel, OutreachOutcome, PipelineStage } from "../src/generated/prisma/enums";
import { findClientByCompany } from "./seed-helpers";
import { statusToPipelineStage } from "../src/lib/sales/constants";

type CrmAccountUpdate = {
  company: string;
  pipelineStage?: PipelineStage;
  source?: string;
  industry?: string;
  dealValue?: number;
  probability?: number;
  ownerEmail?: string;
  notes?: string;
};

type ContactSeed = {
  company: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  isPrimary?: boolean;
  notes?: string;
};

type OutreachSeed = {
  company: string;
  contactName?: string;
  channel: OutreachChannel;
  outcome: OutreachOutcome;
  subject?: string;
  notes?: string;
  touchedAt: Date;
  nextFollowUp?: Date;
  ownerEmail?: string;
};

async function findOwner(prisma: PrismaClient, email?: string) {
  if (!email) return null;
  return prisma.user.findUnique({ where: { email } });
}

async function upsertCrmAccount(prisma: PrismaClient, data: CrmAccountUpdate) {
  const client = await findClientByCompany(prisma, data.company);
  if (!client) return null;

  const owner = await findOwner(prisma, data.ownerEmail);

  return prisma.client.update({
    where: { id: client.id },
    data: {
      pipelineStage: data.pipelineStage ?? statusToPipelineStage(client.status),
      source: data.source,
      industry: data.industry,
      dealValue: data.dealValue,
      probability: data.probability,
      ownerId: owner?.id,
      notes: data.notes,
    },
  });
}

async function upsertContact(prisma: PrismaClient, data: ContactSeed) {
  const client = await findClientByCompany(prisma, data.company);
  if (!client) return null;

  const existing = await prisma.contact.findFirst({
    where: { clientId: client.id, name: { equals: data.name, mode: "insensitive" } },
  });

  if (existing) {
    return prisma.contact.update({
      where: { id: existing.id },
      data: {
        title: data.title ?? existing.title,
        email: data.email ?? existing.email,
        phone: data.phone ?? existing.phone,
        linkedin: data.linkedin ?? existing.linkedin,
        isPrimary: data.isPrimary ?? existing.isPrimary,
        notes: data.notes ?? existing.notes,
      },
    });
  }

  if (data.isPrimary) {
    await prisma.contact.updateMany({
      where: { clientId: client.id },
      data: { isPrimary: false },
    });
  }

  return prisma.contact.create({
    data: {
      clientId: client.id,
      name: data.name,
      title: data.title,
      email: data.email,
      phone: data.phone,
      linkedin: data.linkedin,
      isPrimary: data.isPrimary ?? false,
      notes: data.notes,
    },
  });
}

async function upsertOutreachTouch(prisma: PrismaClient, data: OutreachSeed) {
  const client = await findClientByCompany(prisma, data.company);
  if (!client) return null;

  const owner = await findOwner(prisma, data.ownerEmail);
  const contact = data.contactName
    ? await prisma.contact.findFirst({
        where: { clientId: client.id, name: { equals: data.contactName, mode: "insensitive" } },
      })
    : null;

  const existing = await prisma.outreachTouch.findFirst({
    where: {
      clientId: client.id,
      channel: data.channel,
      subject: data.subject ?? null,
      touchedAt: data.touchedAt,
    },
  });

  if (existing) return existing;

  return prisma.outreachTouch.create({
    data: {
      clientId: client.id,
      contactId: contact?.id,
      channel: data.channel,
      outcome: data.outcome,
      subject: data.subject,
      notes: data.notes,
      touchedAt: data.touchedAt,
      nextFollowUp: data.nextFollowUp,
      ownerId: owner?.id,
    },
  });
}

export async function seedSalesCrmData(prisma: PrismaClient) {
  const counts = { accounts: 0, contacts: 0, touches: 0 };

  const accounts: CrmAccountUpdate[] = [
    { company: "SKAPS Industries", pipelineStage: "ACTIVE", dealValue: 15000, probability: 100, source: "Referral", industry: "Industrial manufacturing", ownerEmail: "curran@northops.io" },
    { company: "Total Fire Protection", pipelineStage: "NEGOTIATION", dealValue: 40000, probability: 45, source: "Existing relationship", industry: "Fire protection", ownerEmail: "curran@northops.io", notes: "Fort Myers pilot proposal in play. Three stakeholder meetings completed." },
    { company: "Nielsen Studios", pipelineStage: "COMMITTED", dealValue: 12000, probability: 75, source: "Inbound", industry: "Architecture / design", ownerEmail: "kayden@northops.io" },
    { company: "Mynt Systems", pipelineStage: "DISCOVERY", dealValue: 25000, probability: 20, source: "Referral", industry: "Solar / energy", ownerEmail: "kayden@northops.io" },
    { company: "University of California, Santa Cruz", pipelineStage: "DISCOVERY", dealValue: 30000, probability: 25, source: "Cold outreach", industry: "Higher education", ownerEmail: "kayden@northops.io" },
    { company: "Summit Fire & Security", pipelineStage: "COLD_OUTREACH", dealValue: 20000, probability: 10, source: "LinkedIn", industry: "Fire protection", ownerEmail: "kayden@northops.io", notes: "Andre Dunn — Sprinkler Operations Manager. Initial outreach should not sound like immediate sales pitch." },
    { company: "VSC Fire & Security", pipelineStage: "COLD_OUTREACH", dealValue: 15000, probability: 10, source: "LinkedIn", industry: "Fire protection", ownerEmail: "kayden@northops.io" },
    { company: "Ameripipe Supply", pipelineStage: "COLD_OUTREACH", dealValue: 15000, probability: 10, source: "Cold outreach", industry: "Fire protection", ownerEmail: "curran@northops.io" },
    { company: "Protegis Fire & Safety", pipelineStage: "COLD_OUTREACH", dealValue: 15000, probability: 10, source: "Cold outreach", industry: "Fire protection", ownerEmail: "curran@northops.io" },
    { company: "Clarke Fire Protection", pipelineStage: "COLD_OUTREACH", dealValue: 15000, probability: 10, source: "Cold outreach", industry: "Fire protection", ownerEmail: "curran@northops.io" },
  ];

  for (const account of accounts) {
    if (await upsertCrmAccount(prisma, account)) counts.accounts++;
  }

  const contacts: ContactSeed[] = [
    { company: "Summit Fire & Security", name: "Andre Dunn", title: "Sprinkler Operations Manager", isPrimary: true, notes: "15+ years, NICET, NFPA 25/13. Trains technicians." },
    { company: "University of California, Santa Cruz", name: "Kimberly Chamlin", isPrimary: true },
    { company: "University of California, Santa Cruz", name: "Bijuu", title: "Systems / financial operations" },
    { company: "University of California, Santa Cruz", name: "Margaret", title: "Accounting" },
    { company: "Total Fire Protection", name: "TFP Stakeholder", isPrimary: true, notes: "Primary stakeholder for Fort Myers pilot discussions." },
  ];

  for (const contact of contacts) {
    if (await upsertContact(prisma, contact)) counts.contacts++;
  }

  const d = (iso: string) => new Date(iso);
  const touches: OutreachSeed[] = [
    {
      company: "Summit Fire & Security",
      contactName: "Andre Dunn",
      channel: "LINKEDIN",
      outcome: "SENT",
      subject: "LinkedIn connection request",
      notes: "Personalized note referencing technician training and field-to-office handoff — not a hard pitch.",
      touchedAt: d("2026-06-10T15:00:00.000Z"),
      nextFollowUp: d("2026-06-17"),
      ownerEmail: "kayden@northops.io",
    },
    {
      company: "VSC Fire & Security",
      channel: "LINKEDIN",
      outcome: "SENT",
      subject: "LinkedIn outreach — fire protection ops",
      notes: "Identified via LinkedIn search. No response yet.",
      touchedAt: d("2026-06-08T16:00:00.000Z"),
      nextFollowUp: d("2026-06-15"),
      ownerEmail: "kayden@northops.io",
    },
    {
      company: "Ameripipe Supply",
      channel: "EMAIL",
      outcome: "SENT",
      subject: "Intro — workflow systems for fire protection distributors",
      notes: "Cold email sent. Awaiting response.",
      touchedAt: d("2026-06-05T14:00:00.000Z"),
      nextFollowUp: d("2026-06-12"),
      ownerEmail: "curran@northops.io",
    },
    {
      company: "University of California, Santa Cruz",
      contactName: "Kimberly Chamlin",
      channel: "EMAIL",
      outcome: "MEETING_BOOKED",
      subject: "UCSC operational automation intro",
      notes: "Kayden originated meeting. Curran and intern planned to attend.",
      touchedAt: d("2026-06-01T12:00:00.000Z"),
      ownerEmail: "kayden@northops.io",
    },
    {
      company: "Total Fire Protection",
      channel: "CALL",
      outcome: "REPLIED",
      subject: "Stakeholder follow-up call",
      notes: "Discussed Fort Myers pilot scope and timeline.",
      touchedAt: d("2026-06-12T18:00:00.000Z"),
      nextFollowUp: d("2026-06-20"),
      ownerEmail: "curran@northops.io",
    },
  ];

  for (const touch of touches) {
    if (await upsertOutreachTouch(prisma, touch)) counts.touches++;
  }

  // Sync next follow-up on clients from latest touch or explicit dates
  for (const account of accounts) {
    const client = await findClientByCompany(prisma, account.company);
    if (!client) continue;
    const latestTouch = await prisma.outreachTouch.findFirst({
      where: { clientId: client.id, nextFollowUp: { not: null } },
      orderBy: { nextFollowUp: "asc" },
    });
    if (latestTouch?.nextFollowUp) {
      await prisma.client.update({
        where: { id: client.id },
        data: { nextFollowUp: latestTouch.nextFollowUp },
      });
    }
  }

  return counts;
}
