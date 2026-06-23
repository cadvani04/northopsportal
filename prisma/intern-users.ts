import type { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

export const DEFAULT_INTERN_PASSWORD = "northops123";

export const NORTHOPS_INTERNS = [
  { email: "intern@northops.io", name: "Sales Intern" },
  { email: "intern2@northops.io", name: "Sales Intern 2" },
  { email: "camille@northops.io", name: "Camille Garipova" },
] as const;

export async function ensureNorthOpsInterns(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash(DEFAULT_INTERN_PASSWORD, 10);

  for (const user of NORTHOPS_INTERNS) {
    const email = user.email.toLowerCase();
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: user.name,
        role: "INTERN",
        teamRole: "sales",
        passwordHash,
      },
      update: {
        name: user.name,
        role: "INTERN",
        teamRole: "sales",
        passwordHash,
      },
    });
  }
}
