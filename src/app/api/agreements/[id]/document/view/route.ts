import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/file-storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const agreement = await db.agreement.findUnique({
    where: { id },
    select: { documentUrl: true, clientId: true, title: true },
  });

  if (!agreement?.documentUrl) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const isStaff = session.user.role === "ADMIN" || session.user.role === "TEAM";
  const isClientOwner =
    session.user.role === "CLIENT" && session.user.clientId === agreement.clientId;

  if (!isStaff && !isClientOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const file = await readStoredFile(agreement.documentUrl);
    return new NextResponse(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${agreement.title.replace(/[^\w.-]+/g, "_")}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open file";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
