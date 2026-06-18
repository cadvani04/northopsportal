import { NextResponse } from "next/server";
import { processInboundEmail } from "@/lib/actions";
import { parseInboundEmailRequest, verifyInboundEmailSecret } from "@/lib/inbound-email";

export async function POST(request: Request) {
  try {
    verifyInboundEmailSecret(request);
    const email = await parseInboundEmailRequest(request);
    const result = await processInboundEmail(email);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized webhook") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    auth: "Set INBOUND_EMAIL_SECRET and send it as x-inbound-email-secret or Authorization: Bearer",
    formats: ["application/json", "multipart/form-data (SendGrid, Mailgun)"],
    example: {
      from: "client@example.com",
      to: "dev@northops.org",
      subject: "New landing page request",
      text: "Please build a landing page for our Q3 campaign.",
    },
  });
}
