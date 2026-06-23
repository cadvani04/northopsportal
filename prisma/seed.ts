import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { seedNorthopsData } from "./seed-northops";
import { seedSalesCrmData } from "./seed-sales";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "northops123";

const MOCK_USER_EMAILS = ["alex@northops.io", "morgan@northops.io"];

const NORTHOPS_ADMINS = [
  { email: "curran@northops.io", name: "Curran Advani", teamRole: "sales" },
  { email: "kayden@northops.io", name: "Kayden", teamRole: "sales" },
  { email: "chaavan@northops.io", name: "Chaavan", teamRole: "dev" },
] as const;

const NORTHOPS_INTERNS = [
  { email: "intern@northops.io", name: "Sales Intern" },
  { email: "intern2@northops.io", name: "Sales Intern 2" },
  { email: "camille@northops.io", name: "Camille Garipova" },
] as const;

async function ensureNorthOpsInterns() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const user of NORTHOPS_INTERNS) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        name: user.name,
        role: "INTERN",
        teamRole: "sales",
        passwordHash,
      },
      update: {
        name: user.name,
        role: "INTERN",
        teamRole: "sales",
      },
    });
  }
}

async function ensureNorthOpsAdmins() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const user of NORTHOPS_ADMINS) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        name: user.name,
        role: "ADMIN",
        teamRole: user.teamRole,
        passwordHash,
      },
      update: {
        name: user.name,
        role: "ADMIN",
        teamRole: user.teamRole,
      },
    });
  }

  return prisma.user.findUniqueOrThrow({ where: { email: "curran@northops.io" } });
}

async function removeMockUsers() {
  const curran = await prisma.user.findUnique({ where: { email: "curran@northops.io" } });
  if (!curran) return;

  for (const email of MOCK_USER_EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) continue;

    await prisma.task.updateMany({ where: { assigneeId: user.id }, data: { assigneeId: curran.id } });
    await prisma.task.updateMany({ where: { createdById: user.id }, data: { createdById: curran.id } });
    await prisma.notification.updateMany({ where: { userId: user.id }, data: { userId: curran.id } });
    await prisma.clientRequest.updateMany({ where: { assigneeId: user.id }, data: { assigneeId: curran.id } });
    await prisma.clientRequest.updateMany({ where: { submittedById: user.id }, data: { submittedById: null } });
    await prisma.expense.updateMany({ where: { submittedById: user.id }, data: { submittedById: curran.id } });
    await prisma.activityLog.updateMany({ where: { userId: user.id }, data: { userId: curran.id } });

    try {
      await prisma.user.delete({ where: { id: user.id } });
      console.log("Removed mock user:", email);
    } catch {
      console.warn("Could not remove mock user (still referenced):", email);
    }
  }
}

async function ensurePortalUsers() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const skaps = await prisma.client.findFirst({
    where: { company: { contains: "SKAPS", mode: "insensitive" } },
  });
  if (!skaps) return;

  await prisma.user.upsert({
    where: { email: "kush.vyas@skaps.com" },
    create: {
      email: "kush.vyas@skaps.com",
      name: "Kush Vyas",
      role: "CLIENT",
      clientId: skaps.id,
      passwordHash,
    },
    update: {
      name: "Kush Vyas",
      role: "CLIENT",
      clientId: skaps.id,
    },
  });
}

async function seedDefaultKpis() {
  const existing = await prisma.kpiGoal.count();
  if (existing > 0) return;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);

  await prisma.kpiGoal.createMany({
    data: [
      {
        title: "Close active client implementations",
        description: "SKAPS onboarding + Nielsen kickoff",
        target: 2,
        current: 0,
        unit: "count",
        period: "weekly",
        startDate: weekStart,
      },
      {
        title: "Move TFP to signed pilot",
        target: 1,
        current: 0,
        unit: "count",
        period: "monthly",
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      },
      {
        title: "Monthly revenue collected",
        target: 25000,
        current: 0,
        unit: "currency",
        period: "monthly",
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      },
      {
        title: "Fire-protection outreach meetings",
        target: 5,
        current: 0,
        unit: "count",
        period: "weekly",
        startDate: weekStart,
      },
    ],
  });
}

async function main() {
  console.log("Seeding NorthOps dashboard (idempotent — existing records preserved)...");

  const admin = await ensureNorthOpsAdmins();
  await ensureNorthOpsInterns();
  await removeMockUsers();
  console.log("Admin users ready:", NORTHOPS_ADMINS.map((u) => u.email).join(", "));

  const counts = await seedNorthopsData(prisma, admin.id);
  const salesCounts = await seedSalesCrmData(prisma);
  await ensurePortalUsers();
  await seedDefaultKpis();

  console.log("\nNorthOps seed complete.");
  console.log("Records upserted:");
  console.log(`  Clients:          ${counts.clients}`);
  console.log(`  Projects:         ${counts.projects}`);
  console.log(`  Agreements:       ${counts.agreements}`);
  console.log(`  Invoices:         ${counts.invoices}`);
  console.log(`  Meetings:         ${counts.meetings}`);
  console.log(`  Tasks:            ${counts.tasks}`);
  console.log(`  Deliverables:     ${counts.deliverables}`);
  console.log(`  Timeline events:  ${counts.timelineEvents}`);
  console.log(`  Activities:       ${counts.activities}`);
  console.log(`  CRM accounts:     ${salesCounts.accounts}`);
  console.log(`  CRM contacts:     ${salesCounts.contacts}`);
  console.log(`  Outreach touches: ${salesCounts.touches}`);
  console.log("\nAdmin portal: curran@northops.io, kayden@northops.io, chaavan@northops.io");
  console.log("Sales interns: intern@northops.io, intern2@northops.io, camille@northops.io");
  console.log("Initial password (change after first login):", DEFAULT_PASSWORD);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
