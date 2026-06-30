import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canLogOutreach } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !canLogOutreach(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.body === "string" && body.body.trim()) data.body = body.body.trim();
  if (typeof body.count === "number") data.count = Math.max(0, Math.min(50, body.count));

  const template = await db.outreachTemplate.update({
    where: { id },
    data,
    include: { createdBy: { select: { id: true, name: true } } },
  });

  revalidatePath("/sales/outreach-templates");
  return NextResponse.json({ template });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !canLogOutreach(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.outreachTemplate.delete({ where: { id } });

  revalidatePath("/sales/outreach-templates");
  return NextResponse.json({ ok: true });
}
