import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/file-storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const expense = await db.expense.findUnique({
    where: { id },
    select: { receiptUrl: true, description: true },
  });

  if (!expense?.receiptUrl) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  try {
    const file = await readStoredFile(expense.receiptUrl);
    return new NextResponse(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="receipt-${id}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open file";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
