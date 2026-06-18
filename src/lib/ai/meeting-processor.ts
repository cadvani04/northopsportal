import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { logActivity, notifyClientUsers, notifyTeam } from "@/lib/activity";
import { emailMeetingSynced, emailTeamNotification } from "@/lib/email";
import { meetingSourceMarker } from "@/lib/client-matching";
import { findActiveProjectForClient } from "@/lib/routing";

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
Only include items clearly discussed. Prefer actionable items. Return JSON only — no markdown fences or commentary.`;

function getClaudeApiKey() {
  return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || null;
}

function getClaudeModel() {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
}

function parseJsonResponse(raw: string): MeetingExtraction {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonText = fenced ? fenced[1] : trimmed;
  return JSON.parse(jsonText) as MeetingExtraction;
}

async function extractWithAI(transcript: string, title: string): Promise<MeetingExtraction | null> {
  const apiKey = getClaudeApiKey();
  if (!apiKey) return null;

  const anthropic = new Anthropic({ apiKey });
  const content = transcript.slice(0, 12000);

  const response = await anthropic.messages.create({
    model: getClaudeModel(),
    max_tokens: 4096,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Meeting: ${title}\n\nTranscript:\n${content}`,
      },
    ],
  });

  const block = response.content.find((part) => part.type === "text");
  if (!block || block.type !== "text") return null;

  return parseJsonResponse(block.text);
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

function findAssignee(
  team: Array<{ id: string; name: string; teamRole: string | null }>,
  assigneeName?: string
) {
  if (!assigneeName) return null;
  const lower = assigneeName.toLowerCase();

  const byName = team.find((user) => {
    const parts = user.name.toLowerCase().split(/\s+/);
    return parts.some((part) => part.length > 2 && lower.includes(part));
  });
  if (byName) return byName;

  const byRole = team.find((user) => user.teamRole && lower.includes(user.teamRole));
  return byRole ?? null;
}

export async function processMeeting(params: {
  meetingId: string;
  title: string;
  summary: string | null;
  transcript: string | null;
  actionItemsJson: string | null;
  clientId: string | null;
  adminUserId: string | null;
  skipNotifications?: boolean;
}) {
  const marker = meetingSourceMarker(params.meetingId);
  const extraction =
    (params.transcript && (await extractWithAI(params.transcript, params.title))) ||
    extractRuleBased(params.summary, params.actionItemsJson);

  const team = await db.user.findMany({
    where: { role: { in: ["ADMIN", "TEAM"] } },
    select: { id: true, name: true, email: true, teamRole: true },
  });

  let projectId: string | null = null;
  if (params.clientId) {
    const project = await findActiveProjectForClient(db, params.clientId);
    projectId = project?.id ?? null;
  }

  let tasksCreated = 0;
  let deliverablesCreated = 0;
  let eventsCreated = 0;

  for (const task of extraction.tasks) {
    const assignee = findAssignee(team, task.assignee ?? undefined);
    await db.task.create({
      data: {
        title: task.title,
        description: `${marker} Auto-created from meeting`,
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
    for (const deliverable of extraction.deliverables) {
      await db.deliverable.create({
        data: {
          title: deliverable.title,
          description: deliverable.description
            ? `${marker} ${deliverable.description}`
            : `${marker} From meeting: ${params.title}`,
          status: "PLANNED",
          dueDate: deliverable.dueDate ? new Date(deliverable.dueDate) : undefined,
          projectId,
        },
      });
      deliverablesCreated++;
    }

    for (const event of extraction.timelineEvents) {
      await db.timelineEvent.create({
        data: {
          title: event.title,
          description: event.description
            ? `${marker} ${event.description}`
            : `${marker} From meeting: ${params.title}`,
          date: new Date(event.date),
          type: event.type || "milestone",
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

  if (!params.skipNotifications) {
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

    const teamEmails = team.map((user) => user.email);
    await emailTeamNotification({
      emails: teamEmails,
      subject: `Meeting synced: ${params.title}`,
      body: `Created ${tasksCreated} tasks, ${deliverablesCreated} deliverables, ${eventsCreated} timeline events.`,
    });
  }

  await logActivity({
    type: "MEETING_SYNCED",
    title: `Meeting AI extraction: ${params.title}`,
    description: `${tasksCreated} tasks, ${deliverablesCreated} deliverables, ${eventsCreated} events`,
    clientId: params.clientId ?? undefined,
    userId: params.adminUserId ?? undefined,
    metadata: { meetingId: params.meetingId, tasksCreated, deliverablesCreated, eventsCreated },
  });

  return { tasksCreated, deliverablesCreated, eventsCreated, usedAI: !!getClaudeApiKey() };
}
