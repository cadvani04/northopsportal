import { parseSenderEmail } from "@/lib/inbound-email";

export function extractEmailsFromText(text: string): string[] {
  const matches = text.match(/[^\s<>",]+@[^\s<>",]+/gi) ?? [];
  const parsed = matches.map((raw) => parseSenderEmail(raw) ?? raw.toLowerCase());
  return [...new Set(parsed.filter(Boolean))];
}

type ClientDb = {
  client: {
    findFirst: (args: object) => Promise<{ id: string } | null>;
  };
  user: {
    findFirst: (args: object) => Promise<{ clientId: string | null } | null>;
  };
};

export async function matchClientFromEmails(
  db: ClientDb,
  emails: string[]
): Promise<string | null> {
  for (const email of emails) {
    const client = await db.client.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (client) return client.id;

    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { clientId: true },
    });
    if (user?.clientId) return user.clientId;
  }

  return null;
}

export async function matchClientFromParticipants(
  db: ClientDb,
  participants: string[] | string | undefined,
  organizerEmail?: string
): Promise<string | null> {
  const emails: string[] = [];

  if (typeof participants === "string") {
    emails.push(...extractEmailsFromText(participants));
  } else if (Array.isArray(participants)) {
    for (const participant of participants) {
      emails.push(...extractEmailsFromText(participant));
    }
  }

  if (organizerEmail) {
    emails.push(...extractEmailsFromText(organizerEmail));
  }

  return matchClientFromEmails(db, emails);
}

export function meetingSourceMarker(meetingId: string) {
  return `[meeting:${meetingId}]`;
}
