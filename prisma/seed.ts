import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { seedNorthopsData } from "./seed-northops";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "northops123";

async function ensureAdminUser() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: "curran@northops.io" },
    create: {
      email: "curran@northops.io",
      name: "Curran Advani",
      role: "ADMIN",
      passwordHash,
    },
    update: {
      name: "Curran Advani",
      role: "ADMIN",
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

  const admin = await ensureAdminUser();
  console.log("Admin user ready:", admin.email);

  const counts = await seedNorthopsData(prisma, admin.id);
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
  console.log("\nLogin: curran@northops.io /", DEFAULT_PASSWORD);
  console.log("\nUncertain statuses preserved for: TFP (prospect), Nielsen (committed), Mynt (prospect).");
  console.log("Only SKAPS marked as signed/active client.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
