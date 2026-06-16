import OpenAI from "openai";
import { db } from "@/lib/db";
import { logActivity, notifyClientUsers, notifyTeam } from "@/lib/activity";
import { emailMeetingSynced, emailTeamNotification } from "@/lib/email";

export interface MeetingExtraction {
  tasks: Array<{
    title: string;
    assignee?: string;
    dueDate?: string;
    priority?: string;
    clientVisible?: boolean;
  }>;
  deliverables: Array<{
    title: string;
    dueDate?: string;
    description?: string;
  }>;
  timelineEvents: Array<{
    title: string;
    date: string;
    type?: string;
    description?: string;
  }>;
  summary: string;
}

const SYSTEM_PROMPT = `You extract structured project data from meeting transcripts for NorthOps, a consulting/ops agency.
Return valid JSON only with this shape:
{
  "summary": "2-3 sentence overview",
  "tasks": [{ "title": "", "assignee": "first name or null", "dueDate": "YYYY-MM-DD or null", "priority": "low|medium|high", "clientVisible": false }],
  "deliverables": [{ "title": "", "dueDate": "YYYY-MM-DD or null", "description": "" }],
  "timelineEvents": [{ "title": "", "date": "YYYY-MM-DD", "type": "milestone|deadline|event", "description": "" }]
}
Only include items clearly discussed. Prefer actionable items.`;

async function extractWithAI(transcript: string, title: string): Promise<MeetingExtraction | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const content = transcript.slice(0, 12000);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Meeting: ${title}\n\nTranscript:\n${content}`,
      },
    ],
    temperature: 0.2,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return null;
  return JSON.parse(raw) as MeetingExtraction;
}

function extractRuleBased(
  summary: string | null,
  actionItemsJson: string | null
): MeetingExtraction {
  const tasks: MeetingExtraction["tasks"] = [];

  if (actionItemsJson) {
    try {
      const items = JSON.parse(actionItemsJson) as Array<{ task: string; assignee?: string; due?: string }>;
      for (const item of items) {
        tasks.push({
          title: item.task,
          assignee: item.assignee,
          dueDate: item.due,
          priority: "medium",
          clientVisible: false,
        });
      }
    } catch {
      /* ignore */
    }
  }

  return {
    summary: summary || "Meeting synced",
    tasks,
    deliverables: [],
    timelineEvents: [],
  };
}

export async function processMeeting(params: {
  meetingId: string;
  title: string;
  summary: string | null;
  transcript: string | null;
  actionItemsJson: string | null;
  clientId: string | null;
  adminUserId: string | null;
}) {
  const extraction =
    (params.transcript && (await extractWithAI(params.transcript, params.title))) ||
    extractRuleBased(params.summary, params.actionItemsJson);

  const team = await db.user.findMany({ where: { role: { in: ["ADMIN", "TEAM"] } } });
  let projectId: string | null = null;
  if (params.clientId) {
    const project = await db.project.findFirst({
      where: { clientId: params.clientId, status: "active" },
    });
    projectId = project?.id ?? null;
  }

  let tasksCreated = 0;
  let deliverablesCreated = 0;
  let eventsCreated = 0;

  for (const task of extraction.tasks) {
    const assignee = team.find((u) =>
      task.assignee?.toLowerCase().includes(u.name.split(" ")[0].toLowerCase())
    );
    await db.task.create({
      data: {
        title: task.title,
        description: "Auto-created from meeting",
        status: "TODO",
        priority: task.priority || "medium",
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        projectId: projectId ?? undefined,
        assigneeId: assignee?.id,
        createdById: params.adminUserId ?? undefined,
        isClientVisible: task.clientVisible ?? false,
      },
    });
    tasksCreated++;
  }

  if (projectId) {
    for (const d of extraction.deliverables) {
      await db.deliverable.create({
        data: {
          title: d.title,
          description: d.description,
          status: "PLANNED",
          dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
          projectId,
        },
      });
      deliverablesCreated++;
    }

    for (const e of extraction.timelineEvents) {
      await db.timelineEvent.create({
        data: {
          title: e.title,
          description: e.description,
          date: new Date(e.date),
          type: e.type || "milestone",
          projectId,
        },
      });
      eventsCreated++;
    }
  }

  if (extraction.summary && params.summary !== extraction.summary) {
    await db.meeting.update({
      where: { id: params.meetingId },
      data: { summary: extraction.summary },
    });
  }

  await notifyTeam({
    title: "Meeting processed",
    message: `${params.title}: ${tasksCreated} tasks, ${deliverablesCreated} deliverables, ${eventsCreated} timeline events`,
    link: "/meetings",
  });

  if (params.clientId) {
    await notifyClientUsers(params.clientId, {
      title: "New meeting notes available",
      message: params.title,
      link: "/portal",
    });

    const client = await db.client.findUnique({ where: { id: params.clientId } });
    if (client) {
      await emailMeetingSynced({
        clientEmail: client.email,
        clientName: client.name,
        meetingTitle: params.title,
        summary: extraction.summary,
      });
    }
  }

  const teamEmails = team.map((u) => u.email);
  await emailTeamNotification({
    emails: teamEmails,
    subject: `Meeting synced: ${params.title}`,
    body: `Created ${tasksCreated} tasks, ${deliverablesCreated} deliverables, ${eventsCreated} timeline events.`,
  });

  return { tasksCreated, deliverablesCreated, eventsCreated, usedAI: !!process.env.OPENAI_API_KEY };
}
