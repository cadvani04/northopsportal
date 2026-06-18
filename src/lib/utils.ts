import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDueDate(date: Date | string): string {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isPast(d)) return `Overdue · ${format(d, "MMM d")}`;
  return format(d, "MMM d, yyyy");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const statusColors: Record<string, string> = {
  TODO: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  IN_PROGRESS: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  REVIEW: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  DONE: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  BLOCKED: "bg-red-500/20 text-red-300 border-red-500/30",
  PLANNED: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  DELIVERED: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  APPROVED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  DRAFT: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  SENT: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  SIGNED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  PAID: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  OVERDUE: "bg-red-500/20 text-red-300 border-red-500/30",
  PENDING: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  EXPIRED: "bg-red-500/20 text-red-300 border-red-500/30",
  CANCELLED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type MeetingActionItem = {
  task: string;
  assignee: string;
  due?: string | null;
};

/** Parse meeting actionItems — supports JSON arrays and legacy plain-text seed data. */
export function parseMeetingActionItems(raw: string | null | undefined): MeetingActionItem[] {
  if (!raw?.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => {
      if (typeof item === "string") {
        return { task: item, assignee: "Unassigned" };
      }
      if (item && typeof item === "object") {
        const record = item as { task?: string; text?: string; assignee?: string; due?: string | null };
        return {
          task: record.task || record.text || "Untitled action item",
          assignee: record.assignee || "Unassigned",
          due: record.due,
        };
      }
      return { task: String(item), assignee: "Unassigned" };
    });
  } catch {
    return raw
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((task) => ({ task, assignee: "Unassigned" }));
  }
}

export function formatActionItemsJson(items: string[]): string {
  return JSON.stringify(
    items.map((task) => ({ task, assignee: "Unassigned", due: null }))
  );
}
