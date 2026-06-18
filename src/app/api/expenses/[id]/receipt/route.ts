import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { deleteStoredFile, RECEIPT_TYPES, uploadFile } from "@/lib/file-storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    if (expense.receiptUrl) {
      await deleteStoredFile(expense.receiptUrl, "/uploads/receipts/");
    }

    const receiptUrl = await uploadFile(`receipts/${id}`, file, {
      allowedTypes: RECEIPT_TYPES,
      localDir: "uploads/receipts",
    });

    await db.expense.update({ where: { id }, data: { receiptUrl } });
    ["/expenses", "/kpis"].forEach((p) => revalidatePath(p));

    return NextResponse.json({ ok: true, receiptUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  if (expense.receiptUrl) {
    await deleteStoredFile(expense.receiptUrl, "/uploads/receipts/");
  }

  await db.expense.update({ where: { id }, data: { receiptUrl: null } });
  revalidatePath("/expenses");
  return NextResponse.json({ ok: true });
}
