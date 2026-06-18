import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { syncFirefliesDateRange } from "@/lib/fireflies/sync-meeting";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let days = 30;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.days === "number" && body.days > 0 && body.days <= 365) {
      days = body.days;
    }
  } catch {
    // Use default 30 days.
  }

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  try {
    const results = await syncFirefliesDateRange(fromDate, toDate);
    ["/meetings", "/activity", "/"].forEach((p) => revalidatePath(p));

    return NextResponse.json({
      ok: true,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      ...results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
