import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deleteAgreementPdf, uploadAgreementPdf } from "@/lib/agreement-documents";
import { revalidatePath } from "next/cache";

type RouteContext = { params: Promise<{ id: string }> };

function revalidateAgreementPages() {
  ["/agreements", "/portal", "/portal/agreements"].forEach((p) => revalidatePath(p));
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const agreement = await db.agreement.findUnique({ where: { id } });
  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
  }

  try {
    if (agreement.documentUrl) {
      await deleteAgreementPdf(agreement.documentUrl);
    }

    const documentUrl = await uploadAgreementPdf(id, file);
    await db.agreement.update({
      where: { id },
      data: { documentUrl },
    });

    revalidateAgreementPages();
    return NextResponse.json({ ok: true, documentUrl });
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
  const agreement = await db.agreement.findUnique({ where: { id } });
  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  }

  if (agreement.documentUrl) {
    await deleteAgreementPdf(agreement.documentUrl);
  }

  await db.agreement.update({
    where: { id },
    data: { documentUrl: null },
  });

  revalidateAgreementPages();
  return NextResponse.json({ ok: true });
}
