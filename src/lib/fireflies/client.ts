const FIREFLIES_API_URL = "https://api.fireflies.ai/graphql";

export interface FirefliesActionItem {
  task?: string;
  text?: string;
  assignee?: string;
  due?: string;
}

export interface FirefliesSummary {
  overview?: string;
  action_items?: FirefliesActionItem[] | string[];
  keywords?: string[];
}

export interface FirefliesTranscript {
  id: string;
  title?: string;
  date?: string;
  duration?: number;
  organizer_email?: string;
  participants?: string[] | string;
  transcript_url?: string;
  recording_url?: string;
  summary?: FirefliesSummary;
  sentences?: Array<{ text: string; speaker_name?: string }>;
}

async function firefliesQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) {
    throw new Error("FIREFLIES_API_KEY is not set. Add it in Vercel environment variables.");
  }

  const res = await fetch(FIREFLIES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (!res.ok || json.errors?.length) {
    const message = json.errors?.map((e) => e.message).join("; ") || `Fireflies API error (${res.status})`;
    throw new Error(message);
  }

  if (!json.data) {
    throw new Error("Fireflies API returned no data");
  }

  return json.data;
}

const TRANSCRIPT_LIST_QUERY = `
  query ListTranscripts($from: DateTime, $to: DateTime, $limit: Int, $skip: Int) {
    transcripts(fromDate: $from, toDate: $to, limit: $limit, skip: $skip) {
      id
      title
      date
      duration
      organizer_email
      participants
      transcript_url
      recording_url
      summary {
        overview
        action_items
      }
    }
  }
`;

const TRANSCRIPT_DETAIL_QUERY = `
  query GetTranscript($id: String!) {
    transcript(id: $id) {
      id
      title
      date
      duration
      organizer_email
      participants
      transcript_url
      recording_url
      summary {
        overview
        action_items
      }
      sentences {
        text
        speaker_name
      }
    }
  }
`;

export async function listFirefliesTranscripts(params: {
  fromDate: Date;
  toDate: Date;
  limit?: number;
  skip?: number;
}) {
  const data = await firefliesQuery<{ transcripts: FirefliesTranscript[] }>(
    TRANSCRIPT_LIST_QUERY,
    {
      from: params.fromDate.toISOString(),
      to: params.toDate.toISOString(),
      limit: params.limit ?? 50,
      skip: params.skip ?? 0,
    }
  );
  return data.transcripts ?? [];
}

export async function getFirefliesTranscript(id: string) {
  const data = await firefliesQuery<{ transcript: FirefliesTranscript | null }>(
    TRANSCRIPT_DETAIL_QUERY,
    { id }
  );
  return data.transcript;
}

export async function fetchAllFirefliesTranscripts(fromDate: Date, toDate: Date) {
  const all: FirefliesTranscript[] = [];
  const pageSize = 50;
  let skip = 0;

  while (true) {
    const page = await listFirefliesTranscripts({
      fromDate,
      toDate,
      limit: pageSize,
      skip,
    });
    all.push(...page);
    if (page.length < pageSize) break;
    skip += pageSize;
  }

  return all;
}

export function extractActionItemsJson(summary: FirefliesSummary | undefined): string | null {
  if (!summary?.action_items?.length) return null;

  const items = summary.action_items.map((item) => {
    if (typeof item === "string") {
      return { task: item, assignee: "Unassigned", due: null };
    }
    return {
      task: item.task || item.text || "Untitled action item",
      assignee: item.assignee || "Unassigned",
      due: item.due || null,
    };
  });

  return JSON.stringify(items);
}

export function extractTranscriptText(transcript: FirefliesTranscript): string | null {
  if (!transcript.sentences?.length) return null;
  return transcript.sentences.map((s) => s.text).join("\n");
}

export function participantsToString(participants: string[] | string | undefined) {
  if (!participants) return undefined;
  return Array.isArray(participants) ? participants.join(", ") : participants;
}
