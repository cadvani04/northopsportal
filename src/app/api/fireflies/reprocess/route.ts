import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { reprocessAllIncompleteMeetings } from "@/lib/fireflies/sync-meeting";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let force = false;
  try {
    const body = await request.json().catch(() => ({}));
    force = body.force === true;
  } catch {
    /* default */
  }

  try {
    const results = await reprocessAllIncompleteMeetings({ force });
    ["/meetings", "/tasks", "/deliverables", "/timeline", "/activity", "/"].forEach((path) =>
      revalidatePath(path)
    );
    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reprocess failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
