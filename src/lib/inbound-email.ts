export interface InboundEmailPayload {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export function parseSenderEmail(from: string): string | null {
  const trimmed = from.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? trimmed).trim().toLowerCase();
  const match = candidate.match(/[^\s<>",]+@[^\s<>",]+/);
  return match?.[0] ?? null;
}

function firstString(value: FormDataEntryValue | null | undefined) {
  return typeof value === "string" ? value : "";
}

function joinRecipients(value: FormDataEntryValue | null | undefined) {
  const raw = firstString(value);
  if (!raw) return "";
  return raw;
}

/** Normalize inbound payloads from JSON or common email providers. */
export async function parseInboundEmailRequest(request: Request): Promise<InboundEmailPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await request.json()) as Record<string, unknown>;
    const from = String(payload.from ?? payload.sender ?? payload.envelope ?? "unknown");
    const toRaw = payload.to ?? payload.recipient;
    const to = Array.isArray(toRaw)
      ? toRaw.map(String).join(", ")
      : String(toRaw ?? "");
    const subject = String(payload.subject ?? "(no subject)");
    const body = String(
      payload.text ?? payload.body ?? payload["stripped-text"] ?? payload.html ?? payload["stripped-html"] ?? "",
    );
    return { from, to, subject, body };
  }

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const form = await request.formData();
    const from =
      firstString(form.get("from")) ||
      firstString(form.get("sender")) ||
      firstString(form.get("envelope")) ||
      "unknown";
    const to =
      joinRecipients(form.get("to")) ||
      joinRecipients(form.get("recipient")) ||
      joinRecipients(form.get("Recipients"));
    const subject = firstString(form.get("subject")) || "(no subject)";
    const body =
      firstString(form.get("text")) ||
      firstString(form.get("body")) ||
      firstString(form.get("stripped-text")) ||
      firstString(form.get("html")) ||
      firstString(form.get("stripped-html"));
    return { from, to, subject, body };
  }

  const text = await request.text();
  if (!text.trim()) {
    throw new Error("Empty request body");
  }

  try {
    const payload = JSON.parse(text) as Record<string, unknown>;
    const from = String(payload.from ?? payload.sender ?? "unknown");
    const toRaw = payload.to ?? payload.recipient;
    const to = Array.isArray(toRaw)
      ? toRaw.map(String).join(", ")
      : String(toRaw ?? "");
    const subject = String(payload.subject ?? "(no subject)");
    const body = String(payload.text ?? payload.body ?? payload.html ?? "");
    return { from, to, subject, body };
  } catch {
    throw new Error("Unsupported content type — send JSON or form-encoded email payload");
  }
}

export function verifyInboundEmailSecret(request: Request) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret) return;

  const header = request.headers.get("x-inbound-email-secret");
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (header === secret || bearer === secret) return;

  throw new Error("Unauthorized webhook");
}
