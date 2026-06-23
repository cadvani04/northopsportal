import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canLogOutreach } from "@/lib/auth/permissions";
import { logOutreachWithAttachments, searchProspects } from "@/lib/outreach/service";
import type { OutreachChannel, OutreachOutcome } from "@/generated/prisma/enums";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !canLogOutreach(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const prospects = await searchProspects(q);
  return NextResponse.json({ prospects });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !canLogOutreach(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const clientId = formData.get("clientId");
  const channel = formData.get("channel");
  if (typeof clientId !== "string" || !clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }
  if (typeof channel !== "string" || !channel) {
    return NextResponse.json({ error: "channel is required" }, { status: 400 });
  }

  const contactId = formData.get("contactId");
  const subject = formData.get("subject");
  const notes = formData.get("notes");
  const outcome = formData.get("outcome");
  const touchedAt = formData.get("touchedAt");
  const nextFollowUp = formData.get("nextFollowUp");

  const files = formData
    .getAll("images")
    .filter((item): item is File => item instanceof File && item.size > 0);

  try {
    const { touch, attachments } = await logOutreachWithAttachments(
      {
        clientId,
        contactId: typeof contactId === "string" && contactId ? contactId : undefined,
        channel: channel as OutreachChannel,
        subject: typeof subject === "string" && subject ? subject : undefined,
        notes: typeof notes === "string" && notes ? notes : undefined,
        outcome:
          typeof outcome === "string" && outcome ? (outcome as OutreachOutcome) : "SENT",
        touchedAt:
          typeof touchedAt === "string" && touchedAt ? new Date(touchedAt) : new Date(),
        nextFollowUp:
          typeof nextFollowUp === "string" && nextFollowUp
            ? new Date(nextFollowUp)
            : undefined,
        ownerId: session.user.id,
      },
      files
    );

    ["/sales", "/sales/outreach", "/activity", "/kpis"].forEach((p) => revalidatePath(p));
    revalidatePath(`/sales/${clientId}`);

    return NextResponse.json({
      ok: true,
      touchId: touch.id,
      attachmentCount: attachments.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to log outreach";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
