import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canLogOutreach } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/file-storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || !canLogOutreach(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const attachment = await db.outreachAttachment.findUnique({
    where: { id },
    select: { url: true, filename: true, mimeType: true },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  try {
    const file = await readStoredFile(attachment.url);
    const filename = attachment.filename ?? `outreach-${id}`;
    return new NextResponse(file.body, {
      headers: {
        "Content-Type": attachment.mimeType || file.contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open file";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
