import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canLogOutreach } from "@/lib/auth/permissions";
import { createOutreachProspect } from "@/lib/outreach/service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !canLogOutreach(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const company = typeof body.company === "string" ? body.company.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!company || !name || !email) {
    return NextResponse.json(
      { error: "Company, contact name, and email are required" },
      { status: 400 }
    );
  }

  try {
    const prospect = await createOutreachProspect({
      company,
      name,
      email,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      linkedin: typeof body.linkedin === "string" ? body.linkedin : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      ownerId: session.user.id,
    });

    ["/sales", "/sales/outreach", "/clients", "/activity"].forEach((p) => revalidatePath(p));

    return NextResponse.json({ ok: true, prospect });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add prospect";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
