const CATEGORY_ROUTES: Record<string, string> = {
  general: "ops",
  bug: "dev",
  feature: "dev",
  content: "fulfillment",
  design: "fulfillment",
  billing: "sales",
  email: "dev",
};

export async function findAssigneeForCategory(
  db: { user: { findFirst: (args: object) => Promise<{ id: string } | null> } },
  category: string
) {
  const teamRole = CATEGORY_ROUTES[category] || "ops";

  const byRole = await db.user.findFirst({
    where: { role: { in: ["ADMIN", "TEAM"] }, teamRole },
    orderBy: { createdAt: "asc" },
  });
  if (byRole) return byRole.id;

  const admin = await db.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  return admin?.id ?? null;
}

export function normalizeEmailCategory(subject: string, body: string): string {
  const text = `${subject} ${body}`.toLowerCase();
  if (text.includes("bug") || text.includes("broken") || text.includes("error")) return "bug";
  if (text.includes("invoice") || text.includes("billing") || text.includes("payment")) return "billing";
  if (text.includes("content") || text.includes("copy") || text.includes("blog")) return "content";
  if (text.includes("feature") || text.includes("build") || text.includes("dashboard")) return "feature";
  return "email";
}
