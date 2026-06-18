import type { OutreachChannel, OutreachOutcome, PipelineStage } from "@/generated/prisma/enums";

export const PIPELINE_STAGES: {
  value: PipelineStage;
  label: string;
  shortLabel: string;
}[] = [
  { value: "COLD_OUTREACH", label: "Cold Outreach", shortLabel: "Outreach" },
  { value: "DISCOVERY", label: "Discovery", shortLabel: "Discovery" },
  { value: "PROPOSAL", label: "Proposal", shortLabel: "Proposal" },
  { value: "NEGOTIATION", label: "Negotiation", shortLabel: "Negotiation" },
  { value: "COMMITTED", label: "Committed", shortLabel: "Committed" },
  { value: "ACTIVE", label: "Active Client", shortLabel: "Active" },
  { value: "CLOSED_LOST", label: "Closed Lost", shortLabel: "Lost" },
];

export const OPEN_PIPELINE_STAGES: PipelineStage[] = [
  "COLD_OUTREACH",
  "DISCOVERY",
  "PROPOSAL",
  "NEGOTIATION",
  "COMMITTED",
];

export const OUTREACH_CHANNELS: { value: OutreachChannel; label: string }[] = [
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "EMAIL", label: "Email" },
  { value: "CALL", label: "Phone call" },
  { value: "TEXT", label: "Text / SMS" },
  { value: "IN_PERSON", label: "In person" },
  { value: "OTHER", label: "Other" },
];

export const OUTREACH_OUTCOMES: { value: OutreachOutcome; label: string }[] = [
  { value: "SENT", label: "Sent / attempted" },
  { value: "OPENED", label: "Opened / viewed" },
  { value: "REPLIED", label: "Replied" },
  { value: "NO_RESPONSE", label: "No response" },
  { value: "MEETING_BOOKED", label: "Meeting booked" },
  { value: "NOT_INTERESTED", label: "Not interested" },
];

export const CLIENT_SOURCES = [
  "Cold outreach",
  "LinkedIn",
  "Referral",
  "Inbound",
  "Conference",
  "Partner",
  "Existing relationship",
  "Other",
];

export function pipelineStageLabel(stage: PipelineStage) {
  return PIPELINE_STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export function outreachChannelLabel(channel: OutreachChannel) {
  return OUTREACH_CHANNELS.find((c) => c.value === channel)?.label ?? channel;
}

export function outreachOutcomeLabel(outcome: OutreachOutcome) {
  return OUTREACH_OUTCOMES.find((o) => o.value === outcome)?.label ?? outcome;
}

export function statusToPipelineStage(status: string): PipelineStage {
  switch (status) {
    case "prospect":
      return "COLD_OUTREACH";
    case "prospect-advanced":
      return "NEGOTIATION";
    case "committed":
      return "COMMITTED";
    case "closed-lost":
      return "CLOSED_LOST";
    case "active":
    case "implementation":
    case "internal":
    case "legacy-marketing":
      return "ACTIVE";
    default:
      return "DISCOVERY";
  }
}
