import { db } from "@/lib/db";
import type { PipelineStage } from "@/generated/prisma/enums";
import { OPEN_PIPELINE_STAGES } from "@/lib/sales/constants";

export async function getSalesTeam() {
  return db.user.findMany({
    where: { role: { in: ["ADMIN", "TEAM"] } },
    select: { id: true, name: true, email: true, teamRole: true },
    orderBy: { name: "asc" },
  });
}

export async function getSalesCrmData() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [accounts, recentTouches, followUpsDue, salesTeam] = await Promise.all([
    db.client.findMany({
      where: { status: { not: "internal" } },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
        _count: {
          select: {
            outreachTouches: true,
            meetings: true,
            agreements: true,
            projects: true,
          },
        },
        outreachTouches: {
          orderBy: { touchedAt: "desc" },
          take: 1,
          include: {
            owner: { select: { id: true, name: true } },
            contact: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ pipelineStage: "asc" }, { company: "asc" }],
    }),
    db.outreachTouch.findMany({
      include: {
        client: { select: { id: true, company: true } },
        contact: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { touchedAt: "desc" },
      take: 50,
    }),
    db.client.findMany({
      where: {
        pipelineStage: { in: OPEN_PIPELINE_STAGES },
        nextFollowUp: { lte: now },
        status: { not: "internal" },
      },
      include: {
        owner: { select: { id: true, name: true } },
      },
      orderBy: { nextFollowUp: "asc" },
      take: 20,
    }),
    getSalesTeam(),
  ]);

  const openPipeline = accounts.filter((a) => OPEN_PIPELINE_STAGES.includes(a.pipelineStage));
  const coldOutreach = accounts.filter((a) => a.pipelineStage === "COLD_OUTREACH");
  const touchesThisWeek = recentTouches.filter((t) => t.touchedAt >= weekAgo).length;

  const weightedPipeline = openPipeline.reduce((sum, account) => {
    const value = account.dealValue ?? 0;
    const probability = account.probability ?? 0;
    return sum + value * (probability / 100);
  }, 0);

  const totalPipeline = openPipeline.reduce((sum, account) => sum + (account.dealValue ?? 0), 0);

  const byStage = OPEN_PIPELINE_STAGES.map((stage) => ({
    stage,
    accounts: accounts.filter((a) => a.pipelineStage === stage),
  }));

  return {
    stats: {
      openDeals: openPipeline.length,
      coldOutreachCount: coldOutreach.length,
      touchesThisWeek,
      followUpsDue: followUpsDue.length,
      weightedPipeline,
      totalPipeline,
    },
    accounts,
    byStage,
    recentTouches,
    followUpsDue,
    salesTeam,
  };
}

export async function getSalesAccount(id: string) {
  return db.client.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      outreachTouches: {
        include: {
          contact: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
          attachments: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { touchedAt: "desc" },
      },
      meetings: { orderBy: { date: "desc" }, take: 10 },
      agreements: { orderBy: { createdAt: "desc" } },
      projects: {
        include: {
          tasks: {
            where: { status: { not: "DONE" } },
            orderBy: { dueDate: "asc" },
            take: 5,
            include: { assignee: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
}

export async function getOutreachQueue() {
  return db.client.findMany({
    where: { pipelineStage: "COLD_OUTREACH", status: { not: "internal" } },
    include: {
      owner: { select: { id: true, name: true } },
      contacts: { where: { isPrimary: true }, take: 1 },
      outreachTouches: { orderBy: { touchedAt: "desc" }, take: 1 },
    },
    orderBy: [{ nextFollowUp: "asc" }, { company: "asc" }],
  });
}

export async function getOutreachLogData() {
  const [prospects, recentTouches, salesTeam] = await Promise.all([
    db.client.findMany({
      where: { status: { not: "internal" } },
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
      orderBy: { company: "asc" },
    }),
    db.outreachTouch.findMany({
      include: {
        client: { select: { id: true, company: true } },
        contact: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { touchedAt: "desc" },
      take: 30,
    }),
    getSalesTeam(),
  ]);

  return { prospects, recentTouches, salesTeam };
}
