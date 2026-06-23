#!/usr/bin/env node
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  addTouchAttachmentFromBuffer,
  createOutreachTouch,
  searchProspects,
} from "@/lib/outreach/service";
import type { OutreachChannel, OutreachOutcome } from "@/generated/prisma/enums";

const CHANNELS = [
  "LINKEDIN",
  "EMAIL",
  "CALL",
  "TEXT",
  "IN_PERSON",
  "OTHER",
] as const;

const OUTCOMES = [
  "SENT",
  "OPENED",
  "REPLIED",
  "NO_RESPONSE",
  "MEETING_BOOKED",
  "NOT_INTERESTED",
] as const;

async function resolveOwnerId() {
  if (process.env.MCP_OWNER_USER_ID) {
    const user = await db.user.findUnique({ where: { id: process.env.MCP_OWNER_USER_ID } });
    if (user) return user.id;
  }

  const admin = await db.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new Error("No admin user found. Set MCP_OWNER_USER_ID in .env");
  return admin.id;
}

async function resolveClientId(input: { clientId?: string; company?: string }) {
  if (input.clientId) {
    const client = await db.client.findUnique({ where: { id: input.clientId } });
    if (!client) throw new Error(`Client not found: ${input.clientId}`);
    return client.id;
  }

  if (input.company) {
    const matches = await searchProspects(input.company, 5);
    if (matches.length === 0) throw new Error(`No prospect found for: ${input.company}`);
    const exact = matches.find(
      (m) => m.company.toLowerCase() === input.company!.toLowerCase()
    );
    return (exact ?? matches[0]).id;
  }

  throw new Error("Provide clientId or company");
}

function decodeBase64Image(data: string, index: number) {
  const match = data.match(/^data:([^;]+);base64,(.+)$/);
  const base64 = match ? match[2] : data;
  const mimeType = match?.[1] ?? "image/png";
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const buffer = Buffer.from(base64, "base64");
  return {
    buffer,
    filename: `screenshot-${index + 1}.${ext}`,
    mimeType,
  };
}

const server = new McpServer({
  name: "northops-outreach",
  version: "1.0.0",
});

server.tool(
  "search_prospects",
  "Search sales prospects by company name, contact name, or email.",
  {
    query: z.string().describe("Search text"),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)"),
  },
  async ({ query, limit }) => {
    const prospects = await searchProspects(query, limit ?? 20);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(prospects, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "log_outreach",
  "Log a cold outreach touch with optional text notes and base64-encoded screenshot images.",
  {
    clientId: z.string().optional().describe("Prospect client ID"),
    company: z.string().optional().describe("Company name if clientId is unknown"),
    contactId: z.string().optional(),
    channel: z.enum(CHANNELS).describe("Outreach channel"),
    subject: z.string().optional(),
    notes: z.string().optional().describe("Message text or call notes"),
    outcome: z.enum(OUTCOMES).optional(),
    touchedAt: z.string().optional().describe("ISO datetime"),
    nextFollowUp: z.string().optional().describe("ISO date for next follow-up"),
    images: z
      .array(z.string())
      .optional()
      .describe("Base64 image strings, optionally with data: URL prefix"),
  },
  async (input) => {
    const ownerId = await resolveOwnerId();
    const clientId = await resolveClientId({
      clientId: input.clientId,
      company: input.company,
    });

    const touch = await createOutreachTouch({
      clientId,
      contactId: input.contactId,
      channel: input.channel as OutreachChannel,
      subject: input.subject,
      notes: input.notes,
      outcome: (input.outcome ?? "SENT") as OutreachOutcome,
      touchedAt: input.touchedAt ? new Date(input.touchedAt) : new Date(),
      nextFollowUp: input.nextFollowUp ? new Date(input.nextFollowUp) : undefined,
      ownerId,
    });

    const attachments = [];
    for (const [i, image] of (input.images ?? []).entries()) {
      const decoded = decodeBase64Image(image, i);
      attachments.push(
        await addTouchAttachmentFromBuffer(
          touch.id,
          decoded.buffer,
          decoded.filename,
          decoded.mimeType
        )
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: true,
              touchId: touch.id,
              clientId,
              attachmentIds: attachments.map((a) => a.id),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "get_outreach_queue",
  "List cold outreach prospects that need follow-up.",
  {
    limit: z.number().int().min(1).max(100).optional(),
  },
  async ({ limit }) => {
    const queue = await db.client.findMany({
      where: { pipelineStage: "COLD_OUTREACH", status: { not: "internal" } },
      include: {
        owner: { select: { id: true, name: true } },
        contacts: { where: { isPrimary: true }, take: 1 },
        outreachTouches: { orderBy: { touchedAt: "desc" }, take: 1 },
      },
      orderBy: [{ nextFollowUp: "asc" }, { company: "asc" }],
      take: limit ?? 30,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(queue, null, 2) }],
    };
  }
);

server.tool(
  "list_recent_touches",
  "List recently logged outreach touches with attachments.",
  {
    limit: z.number().int().min(1).max(100).optional(),
  },
  async ({ limit }) => {
    const touches = await db.outreachTouch.findMany({
      include: {
        client: { select: { id: true, company: true } },
        contact: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        attachments: true,
      },
      orderBy: { touchedAt: "desc" },
      take: limit ?? 20,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(touches, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
