import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { processMeeting } from "@/lib/ai/meeting-processor";
import {
  matchClientFromParticipants,
  meetingSourceMarker,
} from "@/lib/client-matching";
import {
  extractActionItemsJson,
  extractTranscriptText,
  getFirefliesTranscript,
  participantsToString,
  type FirefliesTranscript,
} from "@/lib/fireflies/client";

async function fetchFullTranscript(transcript: FirefliesTranscript) {
  if (!process.env.FIREFLIES_API_KEY || !transcript.id) return transcript;

  const detail = await getFirefliesTranscript(transcript.id);
  if (!detail) return transcript;

  return { ...transcript, ...detail };
}

async function resolveClientId(
  participants: string[] | string | undefined,
  organizerEmail?: string,
  existingClientId?: string | null
) {
  if (existingClientId) return existingClientId;
  return matchClientFromParticipants(db, participants, organizerEmail);
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
  if (options?.fetchDetails !== false) {
    full = await fetchFullTranscript(transcript);
  }

  const clientId = await resolveClientId(full.participants, full.organizer_email);
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

export async function reprocessMeeting(
  meetingId: string,
  options?: { force?: boolean; skipNotifications?: boolean }
) {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) {
    throw new Error("Meeting not found");
  }

  const marker = meetingSourceMarker(meetingId);
  const existingTasks = await db.task.count({
    where: { description: { contains: marker } },
  });

  if (existingTasks > 0 && !options?.force) {
    return {
      status: "skipped" as const,
      meetingId,
      reason: "already_processed",
      tasksCreated: 0,
      deliverablesCreated: 0,
      eventsCreated: 0,
      usedAI: false,
    };
  }

  let transcript = meeting.transcript;
  let summary = meeting.summary;
  let actionItems = meeting.actionItems;
  let clientId = meeting.clientId;
  let participants = meeting.participants;

  if (meeting.firefliesId) {
    const detail = await fetchFullTranscript({ id: meeting.firefliesId });
    if (detail) {
      transcript = extractTranscriptText(detail) ?? transcript;
      summary = detail.summary?.overview ?? summary;
      actionItems = extractActionItemsJson(detail.summary) ?? actionItems;
      participants = participantsToString(detail.participants) ?? participants;
      clientId = await resolveClientId(detail.participants, detail.organizer_email, clientId);
    }
  }

  if (!clientId && participants) {
    clientId = await matchClientFromParticipants(db, participants);
  }

  await db.meeting.update({
    where: { id: meetingId },
    data: {
      transcript,
      summary,
      actionItems,
      participants,
      clientId: clientId ?? undefined,
    },
  });

  if (options?.force) {
    await db.task.deleteMany({ where: { description: { contains: marker } } });
    await db.deliverable.deleteMany({ where: { description: { contains: marker } } });
    await db.timelineEvent.deleteMany({ where: { description: { contains: marker } } });
  }

  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  const processing = await processMeeting({
    meetingId,
    title: meeting.title,
    summary,
    transcript,
    actionItemsJson: actionItems,
    clientId,
    adminUserId: admin?.id ?? null,
    skipNotifications: options?.skipNotifications,
  });

  return {
    status: "processed" as const,
    meetingId,
    clientId,
    ...processing,
  };
}

export async function reprocessAllIncompleteMeetings(options?: { force?: boolean }) {
  const meetings = await db.meeting.findMany({
    orderBy: { date: "desc" },
  });

  const results = {
    total: meetings.length,
    processed: 0,
    skipped: 0,
    errors: [] as string[],
    tasksCreated: 0,
    deliverablesCreated: 0,
  };

  for (const meeting of meetings) {
    const marker = meetingSourceMarker(meeting.id);
    const hasTasks = await db.task.count({
      where: { description: { contains: marker } },
    });
    const needsWork =
      options?.force ||
      !meeting.transcript ||
      !meeting.clientId ||
      hasTasks === 0;

    if (!needsWork) {
      results.skipped++;
      continue;
    }

    try {
      const result = await reprocessMeeting(meeting.id, {
        force: options?.force,
        skipNotifications: true,
      });
      if (result.status === "skipped") {
        results.skipped++;
      } else {
        results.processed++;
        results.tasksCreated += result.tasksCreated;
        results.deliverablesCreated += result.deliverablesCreated;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      results.errors.push(`${meeting.title}: ${message}`);
    }
  }

  return results;
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
