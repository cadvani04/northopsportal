import { NextRequest, NextResponse } from "next/server";
import { syncFirefliesTranscript } from "@/lib/fireflies/sync-meeting";
import type { FirefliesTranscript } from "@/lib/fireflies/client";

interface FirefliesWebhookPayload {
  meetingId?: string;
  meeting_id?: string;
  id?: string;
  event?: string;
  eventType?: string;
  title?: string;
  date?: string;
  duration?: number;
  participants?: string[] | string;
  summary?: FirefliesTranscript["summary"];
  sentences?: Array<{ text: string }>;
  transcript_url?: string;
  recording_url?: string;
  client_email?: string;
  organizer_email?: string;
}

function resolveFirefliesId(payload: FirefliesWebhookPayload) {
  return payload.meetingId || payload.meeting_id || payload.id || null;
}

function webhookPayloadToTranscript(payload: FirefliesWebhookPayload, firefliesId: string): FirefliesTranscript {
  return {
    id: firefliesId,
    title: payload.title,
    date: payload.date,
    duration: payload.duration,
    organizer_email: payload.organizer_email || payload.client_email,
    participants: payload.participants,
    transcript_url: payload.transcript_url,
    recording_url: payload.recording_url,
    summary: payload.summary,
    sentences: payload.sentences,
  };
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-fireflies-secret");
  const expectedSecret = process.env.FIREFLIES_WEBHOOK_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload: FirefliesWebhookPayload = await request.json();
    const firefliesId = resolveFirefliesId(payload);

    if (!firefliesId) {
      return NextResponse.json({ error: "Missing meeting ID" }, { status: 400 });
    }

    const result = await syncFirefliesTranscript(
      webhookPayloadToTranscript(payload, firefliesId),
      { fetchDetails: !!process.env.FIREFLIES_API_KEY, processWithAI: true }
    );

    if (result.status === "skipped") {
      return NextResponse.json({ message: "Meeting already synced", id: result.meetingId });
    }

    return NextResponse.json({
      success: true,
      meetingId: result.meetingId,
      tasksCreated: result.tasksCreated,
      deliverablesCreated: result.deliverablesCreated,
      eventsCreated: result.eventsCreated,
      usedAI: result.usedAI,
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
    historicalSync: "POST /api/fireflies/sync with FIREFLIES_API_KEY set",
  });
}
