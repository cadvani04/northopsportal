import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.EMAIL_FROM || "NorthOps <onboarding@resend.dev>";

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.log("[email skipped — no RESEND_API_KEY]", params.subject, "→", params.to);
    return { ok: true as const, skipped: true };
  }

  try {
    await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { ok: true as const, skipped: false };
  } catch (error) {
    console.error("Email send failed:", error);
    return { ok: false as const, skipped: false };
  }
}

export async function emailInvoiceSent(params: {
  clientEmail: string;
  clientName: string;
  invoiceNumber: string;
  total: string;
  dueDate?: string;
}) {
  return sendEmail({
    to: params.clientEmail,
    subject: `Invoice ${params.invoiceNumber} from NorthOps`,
    html: `
      <h2>Invoice ${params.invoiceNumber}</h2>
      <p>Hi ${params.clientName},</p>
      <p>Your invoice for <strong>${params.total}</strong> is ready.${params.dueDate ? ` Due ${params.dueDate}.` : ""}</p>
      <p>Log in to your <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal">NorthOps client portal</a> to view details.</p>
    `,
  });
}

export async function emailMeetingSynced(params: {
  clientEmail: string;
  clientName: string;
  meetingTitle: string;
  summary?: string;
}) {
  return sendEmail({
    to: params.clientEmail,
    subject: `Meeting notes: ${params.meetingTitle}`,
    html: `
      <h2>${params.meetingTitle}</h2>
      <p>Hi ${params.clientName},</p>
      <p>Your meeting notes are now available in the NorthOps portal.</p>
      ${params.summary ? `<p>${params.summary.slice(0, 500)}${params.summary.length > 500 ? "…" : ""}</p>` : ""}
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/portal">View in portal →</a></p>
    `,
  });
}

export async function emailTeamNotification(params: {
  emails: string[];
  subject: string;
  body: string;
}) {
  if (params.emails.length === 0) return;
  return sendEmail({
    to: params.emails,
    subject: params.subject,
    html: `<p>${params.body}</p>`,
  });
}
