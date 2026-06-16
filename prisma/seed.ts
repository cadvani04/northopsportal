import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "northops123";

async function main() {
  console.log("Seeding NorthOps database...");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.agreement.deleteMany();
  await prisma.deliverable.deleteMany();
  await prisma.task.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();

  const clients = await Promise.all([
    prisma.client.create({ data: { name: "Sarah Chen", company: "Meridian Health", email: "sarah.chen@meridianhealth.com", phone: "+1 (415) 555-0142", status: "active" } }),
    prisma.client.create({ data: { name: "James Okonkwo", company: "Atlas Logistics", email: "james@atlaslogistics.io", status: "active" } }),
    prisma.client.create({ data: { name: "Elena Vasquez", company: "BrightPath Education", email: "elena@brightpath.edu", status: "active" } }),
  ]);

  const team = await Promise.all([
    prisma.user.create({ data: { email: "curran@northops.io", name: "Curran Advani", role: "ADMIN", passwordHash } }),
    prisma.user.create({ data: { email: "alex@northops.io", name: "Alex Rivera", role: "TEAM", passwordHash } }),
    prisma.user.create({ data: { email: "morgan@northops.io", name: "Morgan Lee", role: "TEAM", passwordHash } }),
    prisma.user.create({ data: { email: "sarah.chen@meridianhealth.com", name: "Sarah Chen", role: "CLIENT", clientId: clients[0].id, passwordHash } }),
  ]);

  const [curran, alex, morgan] = team;

  const projects = await Promise.all([
    prisma.project.create({ data: { name: "Patient Portal Redesign", clientId: clients[0].id, status: "active", budget: 85000 } }),
    prisma.project.create({ data: { name: "Fleet Management System", clientId: clients[1].id, status: "active", budget: 120000 } }),
    prisma.project.create({ data: { name: "Learning Analytics Dashboard", clientId: clients[2].id, status: "active", budget: 65000 } }),
  ]);

  await prisma.task.createMany({
    data: [
      { title: "Finalize wireframes for patient dashboard", status: "IN_PROGRESS", priority: "high", dueDate: new Date("2026-06-18"), projectId: projects[0].id, assigneeId: alex.id, createdById: curran.id, isClientVisible: true },
      { title: "Review HIPAA compliance checklist", status: "TODO", priority: "high", dueDate: new Date("2026-06-20"), projectId: projects[0].id, assigneeId: curran.id, createdById: curran.id },
      { title: "Set up GPS integration API", status: "IN_PROGRESS", priority: "high", projectId: projects[1].id, assigneeId: morgan.id, createdById: curran.id, isClientVisible: true },
    ],
  });

  await prisma.deliverable.createMany({
    data: [
      { title: "UX Research Report", status: "APPROVED", projectId: projects[0].id },
      { title: "Patient Dashboard MVP", status: "IN_PROGRESS", dueDate: new Date("2026-07-01"), projectId: projects[0].id },
    ],
  });

  await prisma.agreement.create({ data: { title: "MSA — Meridian Health", status: "SIGNED", value: 85000, clientId: clients[0].id, signedAt: new Date("2025-12-15") } });

  await prisma.invoice.create({
    data: {
      number: "INV-2026-0042", status: "PAID", amount: 21250, tax: 0, total: 21250, clientId: clients[0].id,
      lineItems: { create: [{ description: "Design Sprint", quantity: 1, unitPrice: 21250, total: 21250 }] },
    },
  });

  await prisma.expense.create({ data: { title: "Figma Enterprise", amount: 45, category: "Software", status: "PENDING", date: new Date(), submittedById: alex.id } });

  console.log("Seed complete! Password:", DEFAULT_PASSWORD);
  console.log("  Admin:  curran@northops.io");
  console.log("  Client: sarah.chen@meridianhealth.com");
}

main().catch(console.error).finally(() => prisma.$disconnect());
