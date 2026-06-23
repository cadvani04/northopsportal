"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ImagePlus,
  Paperclip,
  Plus,
  Search,
  Send,
  X,
} from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { Modal, Button, Input, Select, Textarea } from "@/components/ui/forms";
import {
  OUTREACH_CHANNELS,
  OUTREACH_OUTCOMES,
  outreachChannelLabel,
  outreachOutcomeLabel,
  pipelineStageLabel,
} from "@/lib/sales/constants";
import { formatRelative } from "@/lib/utils";
import type { getOutreachLogData } from "@/lib/queries/sales";
import type { OutreachChannel, OutreachOutcome } from "@/generated/prisma/enums";

type LogData = Awaited<ReturnType<typeof getOutreachLogData>>;
type Prospect = LogData["prospects"][number];
type RecentTouch = LogData["recentTouches"][number];

export function OutreachLogPanel({
  data,
  showBackLink = true,
  isIntern = false,
}: {
  data: LogData;
  showBackLink?: boolean;
  isIntern?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [channel, setChannel] = useState<OutreachChannel>("LINKEDIN");
  const [outcome, setOutcome] = useState<OutreachOutcome>("SENT");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [localProspects, setLocalProspects] = useState<Prospect[]>([]);

  const allProspects = useMemo(() => {
    const byId = new Map<string, Prospect>();
    for (const p of data.prospects) byId.set(p.id, p);
    for (const p of localProspects) byId.set(p.id, p);
    return Array.from(byId.values()).sort((a, b) => a.company.localeCompare(b.company));
  }, [data.prospects, localProspects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allProspects.slice(0, 12);
    return allProspects.filter(
      (p) =>
        p.company.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.contacts.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [allProspects, search]);

  function addImages(files: FileList | null) {
    if (!files?.length) return;
    setImages((prev) => [...prev, ...Array.from(files)]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setSubject("");
    setNotes("");
    setImages([]);
    setError(null);
  }

  function submitProspect(form: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/outreach/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.get("company"),
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone") || undefined,
          linkedin: form.get("linkedin") || undefined,
          notes: form.get("notes") || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Failed to add prospect");
        return;
      }
      setLocalProspects((prev) => [...prev, body.prospect]);
      setSelected(body.prospect);
      setSearch(body.prospect.company);
      setAddOpen(false);
      router.refresh();
    });
  }

  function submit() {
    if (!selected) {
      setError("Select a prospect account first.");
      return;
    }

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("clientId", selected.id);
    const primaryContact = selected.contacts[0];
    if (primaryContact) formData.append("contactId", primaryContact.id);
    formData.append("channel", channel);
    formData.append("outcome", outcome);
    if (subject) formData.append("subject", subject);
    if (notes) formData.append("notes", notes);
    images.forEach((file) => formData.append("images", file));

    startTransition(async () => {
      const res = await fetch("/api/outreach/log", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Failed to log outreach");
        return;
      }
      setSuccess(
        `Logged ${outreachChannelLabel(channel)} touch for ${selected.company}` +
          (body.attachmentCount ? ` with ${body.attachmentCount} screenshot(s)` : "")
      );
      resetForm();
      router.refresh();
    });
  }

  return (
    <>
      {showBackLink && (
      <div className="mb-6">
        <Link
          href="/sales"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Sales CRM
        </Link>
      </div>
      )}

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <h2 className="mb-4 text-lg font-medium text-white">Log cold outreach</h2>
            <p className="mb-6 text-sm text-slate-400">
              Paste message text, drop screenshots, and attach them to a prospect in one step.
            </p>

            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm text-slate-300">Prospect</label>
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New prospect
                  </button>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (selected && e.target.value !== selected.company) setSelected(null);
                    }}
                    placeholder="Search company or contact…"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
                {selected ? (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{selected.company}</p>
                      <p className="text-xs text-slate-400">
                        {selected.name}
                        {selected.contacts[0] && ` · ${selected.contacts[0].name}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {filtered.map((prospect) => (
                      <button
                        key={prospect.id}
                        type="button"
                        onClick={() => {
                          setSelected(prospect);
                          setSearch(prospect.company);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/5"
                      >
                        <div>
                          <p className="text-sm text-white">{prospect.company}</p>
                          <p className="text-xs text-slate-500">{prospect.name}</p>
                        </div>
                        <Badge status={prospect.pipelineStage}>
                          {pipelineStageLabel(prospect.pipelineStage)}
                        </Badge>
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <div className="px-3 py-2">
                        <p className="text-sm text-slate-500">No matching prospects.</p>
                        {search.trim() && (
                          <button
                            type="button"
                            onClick={() => setAddOpen(true)}
                            className="mt-2 text-sm text-cyan-400 hover:text-cyan-300"
                          >
                            Add &ldquo;{search.trim()}&rdquo; as new prospect
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Channel"
                  name="channel"
                  options={OUTREACH_CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as OutreachChannel)}
                />
                <Select
                  label="Outcome"
                  name="outcome"
                  options={OUTREACH_OUTCOMES.map((o) => ({ value: o.value, label: o.label }))}
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as OutreachOutcome)}
                />
              </div>

              <Input
                label="Subject (optional)"
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Follow-up on AI consulting intro"
              />

              <Textarea
                label="Message / notes"
                name="notes"
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste the outreach message, reply, or call notes here…"
              />

              <div>
                <label className="mb-2 block text-sm text-slate-300">Screenshots</label>
                <div
                  className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 hover:border-cyan-500/40"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    addImages(e.dataTransfer.files);
                  }}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="mb-2 h-8 w-8 text-slate-500" />
                  <p className="text-sm text-slate-400">
                    Drop screenshots or click to upload
                  </p>
                  <p className="mt-1 text-xs text-slate-600">PNG, JPG, WEBP, GIF · up to 4 MB each</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addImages(e.target.files);
                    e.target.value = "";
                  }}
                />
                {images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300"
                      >
                        <Paperclip className="h-3 w-3" />
                        <span className="max-w-[140px] truncate">{file.name}</span>
                        <button type="button" onClick={() => removeImage(i)} className="text-slate-500 hover:text-red-400">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-emerald-400">{success}</p>}

              <div className="flex justify-end">
                <Button onClick={submit} disabled={pending || !selected}>
                  <Send className="h-4 w-4" />
                  {pending ? "Logging…" : "Log outreach"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-medium text-white">Recent touches</h2>
          <div className="space-y-3">
            {data.recentTouches.map((touch) => (
              <TouchCard key={touch.id} touch={touch} isIntern={isIntern} />
            ))}
            {data.recentTouches.length === 0 && (
              <Card>
                <p className="text-sm text-slate-500">No outreach logged yet.</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add prospect" wide>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitProspect(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <Input
            label="Company"
            name="company"
            required
            defaultValue={search.trim()}
          />
          <Input label="Contact name" name="name" required />
          <Input label="Email" name="email" type="email" required />
          <Input label="Phone" name="phone" />
          <Input
            label="LinkedIn"
            name="linkedin"
            placeholder="https://linkedin.com/in/..."
          />
          <Textarea label="Notes" name="notes" rows={3} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add prospect"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function TouchCard({ touch, isIntern = false }: { touch: RecentTouch; isIntern?: boolean }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge status={touch.channel}>{outreachChannelLabel(touch.channel)}</Badge>
        <Badge status={touch.outcome}>{outreachOutcomeLabel(touch.outcome)}</Badge>
      </div>
      {isIntern ? (
        <p className="mt-2 text-sm font-medium text-white">{touch.client.company}</p>
      ) : (
        <Link
          href={`/sales/${touch.client.id}`}
          className="mt-2 block text-sm font-medium text-cyan-400 hover:text-cyan-300"
        >
          {touch.client.company}
        </Link>
      )}
      {touch.subject && <p className="mt-1 text-sm text-white">{touch.subject}</p>}
      {touch.notes && (
        <p className="mt-1 line-clamp-3 text-sm text-slate-400">{touch.notes}</p>
      )}
      {touch.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {touch.attachments.map((att) => (
            <a
              key={att.id}
              href={`/api/outreach/attachments/${att.id}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-xs text-slate-400 hover:text-cyan-400"
            >
              <Paperclip className="h-3 w-3" />
              {att.filename ?? "Screenshot"}
            </a>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">
        {touch.owner?.name ?? "Unknown"} · {formatRelative(touch.touchedAt)}
        {touch.contact && ` · ${touch.contact.name}`}
      </p>
    </Card>
  );
}
