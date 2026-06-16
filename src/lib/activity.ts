import { db } from "./db";
import type { ActivityType } from "@/generated/prisma/enums";

export async function logActivity(params: {
  type: ActivityType;
  title: string;
  description?: string;
  clientId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return db.activityLog.create({
    data: {
      type: params.type,
      title: params.title,
      description: params.description,
      clientId: params.clientId ?? undefined,
      userId: params.userId ?? undefined,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    },
  });
}

export async function notifyTeam(params: {
  title: string;
  message?: string;
  link?: string;
  excludeUserId?: string;
}) {
  const team = await db.user.findMany({
    where: {
      role: { in: ["ADMIN", "TEAM"] },
      ...(params.excludeUserId && { id: { not: params.excludeUserId } }),
    },
  });

  if (team.length === 0) return;

  await db.notification.createMany({
    data: team.map((u) => ({
      userId: u.id,
      title: params.title,
      message: params.message,
      link: params.link,
    })),
  });
}

export async function notifyUser(params: {
  userId: string;
  title: string;
  message?: string;
  link?: string;
}) {
  return db.notification.create({ data: params });
}

export async function notifyClientUsers(
  clientId: string,
  params: { title: string; message?: string; link?: string }
) {
  const users = await db.user.findMany({ where: { clientId, role: "CLIENT" } });
  if (users.length === 0) return;
  await db.notification.createMany({
    data: users.map((u) => ({ userId: u.id, ...params })),
  });
}
