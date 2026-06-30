import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canLogOutreach } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !canLogOutreach(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name?.trim() || !body?.body?.trim()) {
    return NextResponse.json({ error: "name and body are required" }, { status: 400 });
  }

  const template = await db.outreachTemplate.create({
    data: {
      name: body.name.trim(),
      body: body.body.trim(),
      createdById: session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  revalidatePath("/sales/outreach-templates");
  return NextResponse.json({ template });
}
