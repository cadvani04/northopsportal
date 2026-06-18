"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Phone,
  Mail,
  Share2,
  Calendar,
  ArrowRight,
  Target,
  Users,
  Send,
  Clock,
} from "lucide-react";
import { StatCard, Badge, EmptyState } from "@/components/ui";
import { Modal, Button, Input, Select, Textarea } from "@/components/ui/forms";
import {
  createSalesAccount,
  logOutreachTouch,
  updateSalesAccount,
} from "@/lib/actions/sales";
import {
  PIPELINE_STAGES,
  OPEN_PIPELINE_STAGES,
  OUTREACH_CHANNELS,
  OUTREACH_OUTCOMES,
  CLIENT_SOURCES,
  pipelineStageLabel,
  outreachChannelLabel,
  outreachOutcomeLabel,
} from "@/lib/sales/constants";
import { formatCurrency, formatDate, formatRelative, cn } from "@/lib/utils";
import type { getSalesCrmData } from "@/lib/queries/sales";
import type { OutreachChannel, OutreachOutcome, PipelineStage } from "@/generated/prisma/enums";

type SalesCrmData = Awaited<ReturnType<typeof getSalesCrmData>>;
type SalesAccount = SalesCrmData["accounts"][number];

type Tab = "pipeline" | "outreach" | "activity";

export function SalesCrmPanel({ data }: { data: SalesCrmData }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pipeline");
  const [accountOpen, setAccountOpen] = useState(false);
  const [touchOpen, setTouchOpen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitAccount(form: FormData) {
    startTransition(async () => {
      const result = await createSalesAccount({
        company: form.get("company") as string,
        name: form.get("name") as string,
        email: form.get("email") as string,
        phone: (form.get("phone") as string) || undefined,
        pipelineStage: (form.get("pipelineStage") as PipelineStage) || "COLD_OUTREACH",
        ownerId: (form.get("ownerId") as string) || undefined,
        source: (form.get("source") as string) || undefined,
        industry: (form.get("industry") as string) || undefined,
        dealValue: form.get("dealValue") ? Number(form.get("dealValue")) : undefined,
        probability: form.get("probability") ? Number(form.get("probability")) : undefined,
        nextFollowUp: (form.get("nextFollowUp") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
      });
      if (result.ok) {
        setAccountOpen(false);
        router.push(`/sales/${result.id}`);
      }
    });
  }

  function submitTouch(form: FormData) {
    const clientId = touchOpen!;
    startTransition(async () => {
      await logOutreachTouch({
        clientId,
        channel: form.get("channel") as OutreachChannel,
        subject: (form.get("subject") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
        outcome: (form.get("outcome") as OutreachOutcome) || "SENT",
        touchedAt: (form.get("touchedAt") as string) || undefined,
        nextFollowUp: (form.get("nextFollowUp") as string) || undefined,
      });
      setTouchOpen(null);
      router.refresh();
    });
  }

  function moveStage(clientId: string, stage: PipelineStage) {
    startTransition(async () => {
      await updateSalesAccount(clientId, { pipelineStage: stage });
      router.refresh();
    });
  }

  const touchAccount = touchOpen ? data.accounts.find((a) => a.id === touchOpen) : null;

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Open pipeline"
          value={formatCurrency(data.stats.weightedPipeline)}
          subtitle={`${data.stats.openDeals} deals · ${formatCurrency(data.stats.totalPipeline)} total`}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          title="Cold outreach"
          value={data.stats.coldOutreachCount}
          subtitle="Accounts in outreach stage"
          icon={<Send className="h-5 w-5" />}
        />
        <StatCard
          title="Touches this week"
          value={data.stats.touchesThisWeek}
          subtitle="Logged outreach activity"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Follow-ups due"
          value={data.stats.followUpsDue}
          subtitle="Need attention today"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {data.followUpsDue.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="mb-3 text-sm font-medium text-amber-200">Follow-ups due</p>
          <div className="flex flex-wrap gap-2">
            {data.followUpsDue.map((account) => (
              <Link
                key={account.id}
                href={`/sales/${account.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/20 bg-black/20 px-3 py-1.5 text-xs text-amber-100 hover:bg-black/40"
              >
                {account.company}
                {account.nextFollowUp && (
                  <span className="text-amber-300/70">{formatDate(account.nextFollowUp)}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-lg border border-white/10 bg-white/[0.02] p-1">
          {(
            [
              { id: "pipeline", label: "Pipeline" },
              { id: "outreach", label: "Cold outreach" },
              { id: "activity", label: "Activity" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === item.id ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setAccountOpen(true)}>
          <Plus className="h-4 w-4" /> New prospect
        </Button>
      </div>

      {tab === "pipeline" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4">
            {data.byStage.map(({ stage, accounts }) => (
              <div key={stage} className="w-72 shrink-0">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-300">{pipelineStageLabel(stage)}</h3>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-500">
                    {accounts.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <PipelineCard
                      key={account.id}
                      account={account}
                      onLogTouch={() => setTouchOpen(account.id)}
                      onMoveStage={moveStage}
                      pending={pending}
                    />
                  ))}
                  {accounts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-slate-600">
                      No accounts
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "outreach" && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Last touch</th>
                <th className="px-4 py-3 font-medium">Next follow-up</th>
                <th className="px-4 py-3 font-medium">Touches</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.accounts
                .filter((a) => a.pipelineStage === "COLD_OUTREACH")
                .map((account) => {
                  const last = account.outreachTouches[0];
                  return (
                    <tr key={account.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <Link href={`/sales/${account.id}`} className="font-medium text-white hover:text-cyan-400">
                          {account.company}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{account.name}</td>
                      <td className="px-4 py-3 text-slate-400">{account.owner?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {last ? (
                          <span>
                            {outreachChannelLabel(last.channel)} · {formatRelative(last.touchedAt)}
                          </span>
                        ) : (
                          <span className="text-amber-400">Not contacted</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {account.nextFollowUp ? formatDate(account.nextFollowUp) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{account._count.outreachTouches}</td>
                      <td className="px-4 py-3">
                        <Button variant="secondary" className="text-xs" onClick={() => setTouchOpen(account.id)}>
                          Log touch
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {data.accounts.filter((a) => a.pipelineStage === "COLD_OUTREACH").length === 0 && (
            <EmptyState title="No cold outreach targets" description="Add a prospect or move an account to Cold Outreach." />
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-3">
          {data.recentTouches.map((touch) => (
            <div
              key={touch.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <ChannelIcon channel={touch.channel} />
                  <Link href={`/sales/${touch.client.id}`} className="font-medium text-white hover:text-cyan-400">
                    {touch.client.company}
                  </Link>
                  <Badge status={touch.outcome}>{outreachOutcomeLabel(touch.outcome)}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {touch.subject || touch.notes || "No details"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {touch.owner?.name ?? "Unknown"} · {formatRelative(touch.touchedAt)}
                  {touch.contact && ` · ${touch.contact.name}`}
                </p>
              </div>
              {touch.nextFollowUp && (
                <span className="text-xs text-slate-500">Follow-up {formatDate(touch.nextFollowUp)}</span>
              )}
            </div>
          ))}
          {data.recentTouches.length === 0 && (
            <EmptyState title="No outreach logged yet" description="Log your first cold outreach touch to start tracking." />
          )}
        </div>
      )}

      <Modal open={accountOpen} onClose={() => setAccountOpen(false)} title="New sales prospect" wide>
        <form onSubmit={(e) => { e.preventDefault(); submitAccount(new FormData(e.currentTarget)); }} className="grid gap-4 sm:grid-cols-2">
          <Input label="Company" name="company" required className="sm:col-span-2" />
          <Input label="Primary contact" name="name" required />
          <Input label="Email" name="email" type="email" required />
          <Input label="Phone" name="phone" />
          <Input label="Industry" name="industry" placeholder="Fire protection, SaaS, etc." />
          <Select
            label="Source"
            name="source"
            options={CLIENT_SOURCES.map((s) => ({ value: s, label: s }))}
            defaultValue="Cold outreach"
          />
          <Select
            label="Stage"
            name="pipelineStage"
            options={PIPELINE_STAGES.map((s) => ({ value: s.value, label: s.label }))}
            defaultValue="COLD_OUTREACH"
          />
          <Select
            label="Owner"
            name="ownerId"
            options={[
              { value: "", label: "Me (default)" },
              ...data.salesTeam.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
          <Input label="Deal value ($)" name="dealValue" type="number" min="0" step="1000" />
          <Input label="Probability (%)" name="probability" type="number" min="0" max="100" defaultValue="10" />
          <Input label="Next follow-up" name="nextFollowUp" type="date" className="sm:col-span-2" />
          <Textarea label="Notes" name="notes" rows={3} className="sm:col-span-2" />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setAccountOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Create prospect</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!touchOpen} onClose={() => setTouchOpen(null)} title={`Log outreach · ${touchAccount?.company ?? ""}`} wide>
        <form onSubmit={(e) => { e.preventDefault(); submitTouch(new FormData(e.currentTarget)); }} className="space-y-4">
          <Select
            label="Channel"
            name="channel"
            options={OUTREACH_CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
            defaultValue="LINKEDIN"
          />
          <Select
            label="Outcome"
            name="outcome"
            options={OUTREACH_OUTCOMES.map((o) => ({ value: o.value, label: o.label }))}
            defaultValue="SENT"
          />
          <Input label="Subject / opener" name="subject" placeholder="Connection request, intro email, etc." />
          <Textarea label="Notes" name="notes" rows={4} placeholder="What was said, next step, objections..." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Date"
              name="touchedAt"
              type="datetime-local"
              defaultValue={new Date().toISOString().slice(0, 16)}
            />
            <Input label="Next follow-up" name="nextFollowUp" type="date" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTouchOpen(null)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Log touch</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function PipelineCard({
  account,
  onLogTouch,
  onMoveStage,
  pending,
}: {
  account: SalesAccount;
  onLogTouch: () => void;
  onMoveStage: (id: string, stage: PipelineStage) => void;
  pending: boolean;
}) {
  const last = account.outreachTouches[0];
  const stageIndex = OPEN_PIPELINE_STAGES.indexOf(account.pipelineStage);
  const nextStage = stageIndex >= 0 && stageIndex < OPEN_PIPELINE_STAGES.length - 1
    ? OPEN_PIPELINE_STAGES[stageIndex + 1]
    : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <Link href={`/sales/${account.id}`} className="font-medium text-white hover:text-cyan-400">
          {account.company}
        </Link>
        {account.dealValue != null && account.dealValue > 0 && (
          <span className="shrink-0 text-xs text-emerald-400">{formatCurrency(account.dealValue)}</span>
        )}
      </div>
      <p className="text-xs text-slate-500">{account.name}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge status={account.pipelineStage}>{account.probability}%</Badge>
        {account.source && <span className="text-xs text-slate-600">{account.source}</span>}
      </div>
      {last && (
        <p className="mt-2 text-xs text-slate-500">
          Last: {outreachChannelLabel(last.channel)} · {formatRelative(last.touchedAt)}
        </p>
      )}
      {account.nextFollowUp && (
        <p className="mt-1 text-xs text-amber-400/80">Follow-up {formatDate(account.nextFollowUp)}</p>
      )}
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onLogTouch}>
          Log touch
        </Button>
        {nextStage && (
          <button
            disabled={pending}
            onClick={() => onMoveStage(account.id, nextStage)}
            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
          >
            Advance <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function ChannelIcon({ channel }: { channel: OutreachChannel }) {
  const className = "h-4 w-4 text-slate-400";
  switch (channel) {
    case "LINKEDIN":
      return <Share2 className={className} />;
    case "EMAIL":
      return <Mail className={className} />;
    case "CALL":
    case "TEXT":
      return <Phone className={className} />;
    case "IN_PERSON":
      return <Calendar className={className} />;
    default:
      return <Send className={className} />;
  }
}
