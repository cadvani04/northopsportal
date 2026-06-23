"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Send, Paperclip } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { Modal, Button, Input, Select, Textarea } from "@/components/ui/forms";
import {
  updateSalesAccount,
  logOutreachTouch,
  createContact,
  deleteContact,
  deleteOutreachTouch,
} from "@/lib/actions/sales";
import {
  PIPELINE_STAGES,
  OUTREACH_CHANNELS,
  OUTREACH_OUTCOMES,
  CLIENT_SOURCES,
  pipelineStageLabel,
  outreachChannelLabel,
  outreachOutcomeLabel,
} from "@/lib/sales/constants";
import { formatCurrency, formatDate, formatRelative } from "@/lib/utils";
import type { getSalesAccount, getSalesTeam } from "@/lib/queries/sales";
import type { OutreachChannel, OutreachOutcome, PipelineStage } from "@/generated/prisma/enums";

type Account = NonNullable<Awaited<ReturnType<typeof getSalesAccount>>>;
type SalesTeamMember = Awaited<ReturnType<typeof getSalesTeam>>[number];

export function SalesAccountPanel({
  account,
  salesTeam,
}: {
  account: Account;
  salesTeam: SalesTeamMember[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submitEdit(form: FormData) {
    startTransition(async () => {
      await updateSalesAccount(account.id, {
        company: form.get("company") as string,
        name: form.get("name") as string,
        email: form.get("email") as string,
        phone: (form.get("phone") as string) || undefined,
        pipelineStage: form.get("pipelineStage") as PipelineStage,
        ownerId: (form.get("ownerId") as string) || undefined,
        source: (form.get("source") as string) || undefined,
        industry: (form.get("industry") as string) || undefined,
        dealValue: form.get("dealValue") ? Number(form.get("dealValue")) : undefined,
        probability: form.get("probability") ? Number(form.get("probability")) : undefined,
        nextFollowUp: (form.get("nextFollowUp") as string) || "",
        notes: (form.get("notes") as string) || undefined,
      });
      setEditOpen(false);
      router.refresh();
    });
  }

  function submitTouch(form: FormData) {
    startTransition(async () => {
      await logOutreachTouch({
        clientId: account.id,
        contactId: (form.get("contactId") as string) || undefined,
        channel: form.get("channel") as OutreachChannel,
        subject: (form.get("subject") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
        outcome: (form.get("outcome") as OutreachOutcome) || "SENT",
        touchedAt: (form.get("touchedAt") as string) || undefined,
        nextFollowUp: (form.get("nextFollowUp") as string) || undefined,
      });
      setTouchOpen(false);
      router.refresh();
    });
  }

  function submitContact(form: FormData) {
    startTransition(async () => {
      await createContact({
        clientId: account.id,
        name: form.get("name") as string,
        title: (form.get("title") as string) || undefined,
        email: (form.get("email") as string) || undefined,
        phone: (form.get("phone") as string) || undefined,
        linkedin: (form.get("linkedin") as string) || undefined,
        isPrimary: form.get("isPrimary") === "on",
        notes: (form.get("notes") as string) || undefined,
      });
      setContactOpen(false);
      router.refresh();
    });
  }

  function removeContact(contactId: string) {
    if (!confirm("Remove this contact?")) return;
    startTransition(async () => {
      await deleteContact(contactId, account.id);
      router.refresh();
    });
  }

  function removeTouch(touchId: string) {
    if (!confirm("Delete this outreach log?")) return;
    startTransition(async () => {
      await deleteOutreachTouch(touchId, account.id);
      router.refresh();
    });
  }

  const openTasks = account.projects.flatMap((p) => p.tasks);

  return (
    <>
      <div className="mb-6">
        <Link href="/sales" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Sales CRM
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">{account.company}</h1>
            <Badge status={account.pipelineStage}>{pipelineStageLabel(account.pipelineStage)}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {account.name} · {account.email}
            {account.owner && ` · Owner: ${account.owner.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setTouchOpen(true)}>
            <Send className="h-4 w-4" /> Log outreach
          </Button>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit account</Button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">Deal value</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {account.dealValue != null ? formatCurrency(account.dealValue) : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Probability</p>
          <p className="mt-1 text-xl font-semibold text-white">{account.probability}%</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Weighted value</p>
          <p className="mt-1 text-xl font-semibold text-emerald-400">
            {account.dealValue != null
              ? formatCurrency(account.dealValue * (account.probability / 100))
              : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Next follow-up</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {account.nextFollowUp ? formatDate(account.nextFollowUp) : "—"}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Outreach history</h2>
            <span className="text-xs text-slate-500">{account.outreachTouches.length} touches</span>
          </div>
          <div className="space-y-3">
            {account.outreachTouches.map((touch) => (
              <Card key={touch.id} className="relative">
                <button
                  onClick={() => removeTouch(touch.id)}
                  className="absolute right-4 top-4 text-slate-600 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={touch.channel}>{outreachChannelLabel(touch.channel)}</Badge>
                  <Badge status={touch.outcome}>{outreachOutcomeLabel(touch.outcome)}</Badge>
                </div>
                {touch.subject && <p className="mt-2 text-sm text-white">{touch.subject}</p>}
                {touch.notes && <p className="mt-1 text-sm text-slate-400">{touch.notes}</p>}
                {touch.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {touch.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={`/api/outreach/attachments/${att.id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
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
            ))}
            {account.outreachTouches.length === 0 && (
              <Card>
                <p className="text-sm text-slate-500">No outreach logged yet.</p>
              </Card>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Contacts</h2>
              <Button variant="ghost" className="text-xs" onClick={() => setContactOpen(true)}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {account.contacts.map((contact) => (
                <Card key={contact.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white">
                        {contact.name}
                        {contact.isPrimary && (
                          <span className="ml-2 text-xs text-cyan-400">Primary</span>
                        )}
                      </p>
                      {contact.title && <p className="text-sm text-slate-500">{contact.title}</p>}
                      {contact.email && <p className="text-sm text-slate-400">{contact.email}</p>}
                      {contact.linkedin && <p className="text-sm text-slate-400">{contact.linkedin}</p>}
                    </div>
                    <button onClick={() => removeContact(contact.id)} className="text-slate-600 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))}
              {account.contacts.length === 0 && (
                <Card><p className="text-sm text-slate-500">No contacts yet.</p></Card>
              )}
            </div>
          </section>

          {account.notes && (
            <section>
              <h2 className="mb-4 text-lg font-medium text-white">Notes</h2>
              <Card><p className="whitespace-pre-wrap text-sm text-slate-300">{account.notes}</p></Card>
            </section>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section>
          <h2 className="mb-4 text-lg font-medium text-white">Meetings</h2>
          <div className="space-y-2">
            {account.meetings.map((m) => (
              <Card key={m.id} padding className="!p-4">
                <p className="text-sm font-medium text-white">{m.title}</p>
                <p className="text-xs text-slate-500">{formatDate(m.date)}</p>
              </Card>
            ))}
            {account.meetings.length === 0 && <p className="text-sm text-slate-500">No meetings linked.</p>}
          </div>
        </section>
        <section>
          <h2 className="mb-4 text-lg font-medium text-white">Agreements</h2>
          <div className="space-y-2">
            {account.agreements.map((a) => (
              <Card key={a.id} padding className="!p-4">
                <p className="text-sm font-medium text-white">{a.title}</p>
                <p className="text-xs text-slate-500">
                  {a.status}
                  {a.value != null && ` · ${formatCurrency(a.value)}`}
                </p>
              </Card>
            ))}
            {account.agreements.length === 0 && <p className="text-sm text-slate-500">No agreements yet.</p>}
          </div>
        </section>
        <section>
          <h2 className="mb-4 text-lg font-medium text-white">Open tasks</h2>
          <div className="space-y-2">
            {openTasks.map((t) => (
              <Card key={t.id} padding className="!p-4">
                <p className="text-sm text-white">{t.title}</p>
                <p className="text-xs text-slate-500">
                  {t.assignee?.name ?? "Unassigned"}
                  {t.dueDate && ` · ${formatDate(t.dueDate)}`}
                </p>
              </Card>
            ))}
            {openTasks.length === 0 && <p className="text-sm text-slate-500">No open tasks.</p>}
          </div>
        </section>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit account" wide>
        <form onSubmit={(e) => { e.preventDefault(); submitEdit(new FormData(e.currentTarget)); }} className="grid gap-4 sm:grid-cols-2">
          <Input label="Company" name="company" required defaultValue={account.company} className="sm:col-span-2" />
          <Input label="Primary contact" name="name" required defaultValue={account.name} />
          <Input label="Email" name="email" type="email" required defaultValue={account.email} />
          <Input label="Phone" name="phone" defaultValue={account.phone ?? ""} />
          <Input label="Industry" name="industry" defaultValue={account.industry ?? ""} />
          <Select
            label="Source"
            name="source"
            options={CLIENT_SOURCES.map((s) => ({ value: s, label: s }))}
            defaultValue={account.source ?? "Cold outreach"}
          />
          <Select
            label="Stage"
            name="pipelineStage"
            options={PIPELINE_STAGES.map((s) => ({ value: s.value, label: s.label }))}
            defaultValue={account.pipelineStage}
          />
          <Select
            label="Owner"
            name="ownerId"
            options={salesTeam.map((u) => ({ value: u.id, label: u.name }))}
            defaultValue={account.owner?.id ?? ""}
          />
          <Input label="Deal value ($)" name="dealValue" type="number" defaultValue={account.dealValue ?? ""} />
          <Input label="Probability (%)" name="probability" type="number" defaultValue={account.probability} />
          <Input
            label="Next follow-up"
            name="nextFollowUp"
            type="date"
            defaultValue={account.nextFollowUp ? account.nextFollowUp.toISOString().slice(0, 10) : ""}
            className="sm:col-span-2"
          />
          <Textarea label="Notes" name="notes" rows={4} defaultValue={account.notes ?? ""} className="sm:col-span-2" />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={touchOpen} onClose={() => setTouchOpen(false)} title="Log outreach" wide>
        <form onSubmit={(e) => { e.preventDefault(); submitTouch(new FormData(e.currentTarget)); }} className="space-y-4">
          {account.contacts.length > 0 && (
            <Select
              label="Contact"
              name="contactId"
              options={[
                { value: "", label: "—" },
                ...account.contacts.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          )}
          <Select label="Channel" name="channel" options={OUTREACH_CHANNELS.map((c) => ({ value: c.value, label: c.label }))} />
          <Select label="Outcome" name="outcome" options={OUTREACH_OUTCOMES.map((o) => ({ value: o.value, label: o.label }))} />
          <Input label="Subject" name="subject" />
          <Textarea label="Notes" name="notes" rows={4} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Date" name="touchedAt" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} />
            <Input label="Next follow-up" name="nextFollowUp" type="date" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTouchOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Log touch</Button>
          </div>
        </form>
      </Modal>

      <Modal open={contactOpen} onClose={() => setContactOpen(false)} title="Add contact">
        <form onSubmit={(e) => { e.preventDefault(); submitContact(new FormData(e.currentTarget)); }} className="space-y-4">
          <Input label="Name" name="name" required />
          <Input label="Title" name="title" />
          <Input label="Email" name="email" type="email" />
          <Input label="Phone" name="phone" />
          <Input label="LinkedIn" name="linkedin" placeholder="https://linkedin.com/in/..." />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="isPrimary" className="rounded border-white/20" />
            Primary contact
          </label>
          <Textarea label="Notes" name="notes" rows={3} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setContactOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Add contact</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
