import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { processMeeting } from "@/lib/ai/meeting-processor";
import {
  extractActionItemsJson,
  extractTranscriptText,
  getFirefliesTranscript,
  participantsToString,
  type FirefliesTranscript,
} from "@/lib/fireflies/client";

async function matchClientFromParticipants(
  participants: string[] | string | undefined,
  organizerEmail?: string
): Promise<string | null> {
  const emails: string[] = [];
  if (typeof participants === "string") {
    emails.push(...participants.split(",").map((p) => p.trim()));
  } else if (Array.isArray(participants)) {
    emails.push(...participants);
  }
  if (organizerEmail) emails.push(organizerEmail);

  for (const email of emails) {
    const match = email.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (!match) continue;
    const client = await db.client.findFirst({
      where: { email: match[0] },
    });
    if (client) return client.id;

    const user = await db.user.findUnique({
      where: { email: match[0] },
      select: { clientId: true },
    });
    if (user?.clientId) return user.clientId;
  }

  return null;
}

export async function syncFirefliesTranscript(
  transcript: FirefliesTranscript,
  options?: { fetchDetails?: boolean; processWithAI?: boolean; skipNotifications?: boolean }
) {
  const firefliesId = transcript.id;
  if (!firefliesId) {
    throw new Error("Transcript missing id");
  }

  const existing = await db.meeting.findUnique({ where: { firefliesId } });
  if (existing) {
    return {
      status: "skipped" as const,
      meetingId: existing.id,
      firefliesId,
      title: existing.title,
    };
  }

  let full = transcript;
  if (options?.fetchDetails !== false && !transcript.sentences?.length) {
    const detail = await getFirefliesTranscript(firefliesId);
    if (detail) full = { ...transcript, ...detail };
  }

  const clientId = await matchClientFromParticipants(
    full.participants,
    full.organizer_email
  );
  const actionItems = extractActionItemsJson(full.summary);
  const transcriptText = extractTranscriptText(full);
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });

  const meeting = await db.meeting.create({
    data: {
      firefliesId,
      title: full.title || `Fireflies meeting ${firefliesId}`,
      date: full.date ? new Date(full.date) : new Date(),
      duration: full.duration,
      participants: participantsToString(full.participants),
      summary: full.summary?.overview || null,
      actionItems,
      transcript: transcriptText,
      recordingUrl: full.recording_url || full.transcript_url || null,
      clientId,
    },
  });

  await logActivity({
    type: "MEETING_SYNCED",
    title: "Meeting synced from Fireflies",
    description: `${meeting.title} — imported from Fireflies API`,
    clientId,
    userId: admin?.id,
    metadata: { meetingId: meeting.id, firefliesId },
  });

  let processing = {
    tasksCreated: 0,
    deliverablesCreated: 0,
    eventsCreated: 0,
    usedAI: false,
  };

  if (options?.processWithAI !== false) {
    processing = await processMeeting({
      meetingId: meeting.id,
      title: meeting.title,
      summary: meeting.summary,
      transcript: transcriptText,
      actionItemsJson: actionItems,
      clientId,
      adminUserId: admin?.id ?? null,
      skipNotifications: options?.skipNotifications,
    });
  }

  return {
    status: "created" as const,
    meetingId: meeting.id,
    firefliesId,
    title: meeting.title,
    ...processing,
  };
}

export async function syncFirefliesDateRange(fromDate: Date, toDate: Date) {
  const { fetchAllFirefliesTranscripts } = await import("@/lib/fireflies/client");
  const transcripts = await fetchAllFirefliesTranscripts(fromDate, toDate);

  const results = {
    total: transcripts.length,
    created: 0,
    skipped: 0,
    errors: [] as string[],
    meetings: [] as Array<{ title: string; status: string }>,
  };

  for (const transcript of transcripts) {
    try {
      const result = await syncFirefliesTranscript(transcript, {
        skipNotifications: true,
      });
      if (result.status === "created") results.created++;
      else results.skipped++;
      results.meetings.push({ title: result.title, status: result.status });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      results.errors.push(`${transcript.title || transcript.id}: ${message}`);
    }
  }

  return results;
}
