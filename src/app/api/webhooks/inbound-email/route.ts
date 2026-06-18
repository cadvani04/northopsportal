import { NextResponse } from "next/server";
import { processInboundEmail } from "@/lib/actions";

interface ResendInboundPayload {
  type?: string;
  data?: {
    from?: string;
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
  };
  from?: string;
  to?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
}

function extractEmailFields(payload: ResendInboundPayload) {
  const data = payload.data ?? payload;
  const to = Array.isArray(data.to) ? data.to.join(", ") : data.to || "";
  return {
    from: data.from || "unknown",
    to,
    subject: data.subject || "(no subject)",
    body: data.text || data.html || "",
  };
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-inbound-email-secret");
  const expected = process.env.INBOUND_EMAIL_SECRET || process.env.RESEND_WEBHOOK_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as ResendInboundPayload;
    const fields = extractEmailFields(payload);

    const allowedTo = (process.env.INBOUND_EMAIL_ADDRESS || "dev@northops.org").toLowerCase();
    if (!fields.to.toLowerCase().includes(allowedTo.split("@")[0])) {
      // Still process if addressed to configured domain
    }

    const result = await processInboundEmail(fields);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Inbound email error:", error);
    const message = error instanceof Error ? error.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/inbound-email",
    address: process.env.INBOUND_EMAIL_ADDRESS || "dev@northops.org",
    description: "Inbound email → deliverable automation for NorthOps",
  });
}
