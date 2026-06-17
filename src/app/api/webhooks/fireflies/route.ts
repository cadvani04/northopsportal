import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { processMeeting } from "@/lib/ai/meeting-processor";

interface FirefliesActionItem {
  task?: string;
  text?: string;
  assignee?: string;
  due?: string;
}

interface FirefliesPayload {
  meetingId?: string;
  meeting_id?: string;
  id?: string;
  event?: string;
  eventType?: string;
  title?: string;
  date?: string;
  duration?: number;
  participants?: string[] | string;
  summary?: {
    overview?: string;
    action_items?: FirefliesActionItem[];
    keywords?: string[];
  };
  sentences?: Array<{ text: string }>;
  transcript_url?: string;
  recording_url?: string;
  client_email?: string;
  organizer_email?: string;
}

function resolveFirefliesId(payload: FirefliesPayload) {
  return payload.meetingId || payload.meeting_id || payload.id || null;
}

function resolveMeetingTitle(payload: FirefliesPayload, firefliesId: string) {
  if (payload.title) return payload.title;
  if (payload.eventType) return payload.eventType;
  if (payload.event) return `Fireflies: ${payload.event.replace(/\./g, " ")}`;
  return `Fireflies meeting ${firefliesId}`;
}

function extractActionItems(summary: FirefliesPayload["summary"]): string | null {
  if (!summary?.action_items?.length) return null;
  const items = summary.action_items.map((item) => ({
    task: item.task || item.text || "Untitled action item",
    assignee: item.assignee || "Unassigned",
    due: item.due || null,
  }));
  return JSON.stringify(items);
}

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

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-fireflies-secret");
  const expectedSecret = process.env.FIREFLIES_WEBHOOK_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload: FirefliesPayload = await request.json();
    const firefliesId = resolveFirefliesId(payload);

    if (!firefliesId) {
      return NextResponse.json({ error: "Missing meeting ID" }, { status: 400 });
    }

    const existing = await db.meeting.findUnique({ where: { firefliesId } });
    if (existing) {
      return NextResponse.json({ message: "Meeting already synced", id: existing.id });
    }

    const clientId = await matchClientFromParticipants(
      payload.participants,
      payload.organizer_email || payload.client_email
    );

    const actionItems = extractActionItems(payload.summary);
    const participantsStr = Array.isArray(payload.participants)
      ? payload.participants.join(", ")
      : payload.participants;

    const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
    const transcript = payload.sentences?.map((s) => s.text).join("\n") || null;

    const meeting = await db.meeting.create({
      data: {
        firefliesId,
        title: resolveMeetingTitle(payload, firefliesId),
        date: payload.date ? new Date(payload.date) : new Date(),
        duration: payload.duration,
        participants: participantsStr,
        summary: payload.summary?.overview || null,
        actionItems,
        transcript,
        recordingUrl: payload.recording_url || payload.transcript_url || null,
        clientId,
      },
    });

    await logActivity({
      type: "MEETING_SYNCED",
      title: "Meeting synced from Fireflies",
      description: `${meeting.title} — processing transcript`,
      clientId,
      userId: admin?.id,
      metadata: { meetingId: meeting.id, firefliesId },
    });

    const result = await processMeeting({
      meetingId: meeting.id,
      title: meeting.title,
      summary: meeting.summary,
      transcript,
      actionItemsJson: actionItems,
      clientId,
      adminUserId: admin?.id ?? null,
    });

    return NextResponse.json({
      success: true,
      meetingId: meeting.id,
      ...result,
    });
  } catch (error) {
    console.error("Fireflies webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/webhooks/fireflies",
    description: "Fireflies meeting completion webhook for NorthOps",
  });
}
