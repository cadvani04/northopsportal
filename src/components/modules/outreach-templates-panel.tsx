"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Trash2, FileText } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { Modal, Button, Input, Textarea } from "@/components/ui/forms";
import { formatRelative } from "@/lib/utils";
import type { getOutreachTemplates } from "@/lib/queries/sales";

type Template = Awaited<ReturnType<typeof getOutreachTemplates>>[number];

export function OutreachTemplatesPanel({ templates: initial }: { templates: Template[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [templates, setTemplates] = useState<Template[]>(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [detailCount, setDetailCount] = useState<string>("");

  function openDetail(t: Template) {
    setDetailTemplate(t);
    setDetailCount(String(t.count));
  }

  function closeDetail() {
    setDetailTemplate(null);
    setDetailCount("");
  }

  function patchTemplate(id: string, patch: Partial<{ count: number; name: string; body: string }>) {
    startTransition(async () => {
      const res = await fetch(`/api/outreach/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...data.template } : t))
      );
      if (detailTemplate?.id === id) {
        setDetailTemplate((prev) => (prev ? { ...prev, ...data.template } : prev));
        setDetailCount(String(data.template.count));
      }
      router.refresh();
    });
  }

  function adjustCount(t: Template, delta: number) {
    const next = Math.max(0, Math.min(t.goal, t.count + delta));
    if (next === t.count) return;
    patchTemplate(t.id, { count: next });
  }

  function saveDetailCount(t: Template) {
    const parsed = parseInt(detailCount, 10);
    if (isNaN(parsed)) { setDetailCount(String(t.count)); return; }
    const clamped = Math.max(0, Math.min(t.goal, parsed));
    setDetailCount(String(clamped));
    if (clamped !== t.count) patchTemplate(t.id, { count: clamped });
  }

  function deleteTemplate(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/outreach/templates/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (detailTemplate?.id === id) closeDetail();
      router.refresh();
    });
  }

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) { setError("Name and message are required."); return; }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/outreach/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), body: body.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to create template."); return; }
      setTemplates((prev) => [data.template, ...prev]);
      setName("");
      setBody("");
      setAddOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No outreach templates yet"
          description="Add a template to start tracking your cold outreach messaging campaigns."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              pending={pending}
              onAdjust={(delta) => adjustCount(t, delta)}
              onDoubleClick={() => openDetail(t)}
              onDelete={() => deleteTemplate(t.id)}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setError(null); }} title="Add New Template" wide>
        <form onSubmit={submitNew} className="space-y-4">
          <Input
            label="Template name"
            placeholder="e.g. LinkedIn intro — AI angle"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            label="Message"
            placeholder="Paste the outreach message here…"
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setAddOpen(false); setError(null); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create Template"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      {detailTemplate && (
        <Modal open={!!detailTemplate} onClose={closeDetail} title={detailTemplate.name} wide>
          <div className="space-y-6">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-400">Message</p>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300 whitespace-pre-wrap">
                {detailTemplate.body}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium text-slate-400">People reached</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => adjustCount(detailTemplate, -1)}
                  disabled={pending || detailTemplate.count <= 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={0}
                  max={detailTemplate.goal}
                  value={detailCount}
                  onChange={(e) => setDetailCount(e.target.value)}
                  onBlur={() => saveDetailCount(detailTemplate)}
                  onKeyDown={(e) => e.key === "Enter" && saveDetailCount(detailTemplate)}
                  className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-lg font-semibold text-white focus:border-cyan-500/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => adjustCount(detailTemplate, 1)}
                  disabled={pending || detailTemplate.count >= detailTemplate.goal}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-sm text-slate-400">/ {detailTemplate.goal}</span>
              </div>
              <ProgressBar count={detailTemplate.count} goal={detailTemplate.goal} className="mt-4" />
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <p className="text-xs text-slate-500">
                Created by {detailTemplate.createdBy?.name ?? "Unknown"} · {formatRelative(detailTemplate.createdAt)}
              </p>
              <Button
                variant="danger"
                onClick={() => deleteTemplate(detailTemplate.id)}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function TemplateCard({
  template,
  pending,
  onAdjust,
  onDoubleClick,
  onDelete,
}: {
  template: Template;
  pending: boolean;
  onAdjust: (delta: number) => void;
  onDoubleClick: () => void;
  onDelete: () => void;
}) {
  const pct = Math.round((template.count / template.goal) * 100);
  const done = template.count >= template.goal;

  return (
    <Card
      className="group cursor-pointer transition-colors hover:border-white/20"
      padding={false}
    >
      <div className="p-5" onDoubleClick={onDoubleClick}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{template.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {template.createdBy?.name ?? "Unknown"} · {formatRelative(template.createdAt)}
            </p>
          </div>
          <span className={`shrink-0 text-sm font-semibold ${done ? "text-emerald-400" : "text-cyan-400"}`}>
            {template.count}/{template.goal}
          </span>
        </div>

        <p className="mt-3 line-clamp-3 text-xs text-slate-400">{template.body}</p>

        <ProgressBar count={template.count} goal={template.goal} className="mt-4" />

        <p className="mt-1 text-right text-xs text-slate-600">{pct}% · double-click to expand</p>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAdjust(-1); }}
            disabled={pending || template.count <= 0}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAdjust(1); }}
            disabled={pending || template.count >= template.goal}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={pending}
          className="text-slate-600 hover:text-red-400 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}

function ProgressBar({ count, goal, className }: { count: number; goal: number; className?: string }) {
  const pct = Math.min(100, Math.round((count / goal) * 100));
  const done = count >= goal;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/10 ${className ?? ""}`}>
      <div
        className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : "bg-cyan-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
