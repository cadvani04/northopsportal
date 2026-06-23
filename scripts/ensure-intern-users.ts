import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ensureNorthOpsInterns, NORTHOPS_INTERNS } from "../prisma/intern-users";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  await ensureNorthOpsInterns(prisma);
  for (const user of NORTHOPS_INTERNS) {
    console.log("Ensured intern user:", user.email);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
