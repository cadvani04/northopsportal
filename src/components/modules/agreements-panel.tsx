"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Modal, Button, Input, Select } from "@/components/ui/forms";
import { Badge } from "@/components/ui";
import { createAgreement, updateAgreement, deleteAgreement } from "@/lib/actions";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";

type Agreement = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  value: number | null;
  startDate: Date | null;
  endDate: Date | null;
  client: { company: string };
};

interface Props {
  agreements: Agreement[];
  clients: Array<{ id: string; company: string }>;
}

export function AgreementsPanel({ agreements, clients }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(form: FormData) {
    startTransition(async () => {
      await createAgreement({
        title: form.get("title") as string,
        description: (form.get("description") as string) || undefined,
        clientId: form.get("clientId") as string,
        value: parseFloat(form.get("value") as string) || undefined,
        status: form.get("status") as never,
        startDate: (form.get("startDate") as string) || undefined,
        endDate: (form.get("endDate") as string) || undefined,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Agreement</Button>
      </div>
      <div className="space-y-4">
        {agreements.map((a) => (
          <div key={a.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <h3 className="font-medium text-white">{a.title}</h3>
                  <Badge status={a.status}>{formatStatus(a.status)}</Badge>
                </div>
                <p className="text-sm text-slate-500">{a.client.company}</p>
                {a.value && <p className="mt-2 text-sm text-slate-300">{formatCurrency(a.value)}</p>}
              </div>
              <div className="flex gap-2">
                {a.status === "SENT" && (
                  <Button variant="secondary" className="text-xs" onClick={() => startTransition(async () => { await updateAgreement(a.id, { status: "SIGNED", signedAt: new Date().toISOString() }); router.refresh(); })}>
                    Mark signed
                  </Button>
                )}
                <button onClick={() => confirm("Delete?") && startTransition(async () => { await deleteAgreement(a.id); router.refresh(); })} className="text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="New Agreement" wide>
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-4">
          <Input label="Title" name="title" required />
          <Select label="Client" name="clientId" options={clients.map((c) => ({ value: c.id, label: c.company }))} required />
          <Input label="Value" name="value" type="number" step="0.01" />
          <Select label="Status" name="status" options={["DRAFT", "SENT", "SIGNED", "EXPIRED"].map((s) => ({ value: s, label: formatStatus(s) }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start date" name="startDate" type="date" />
            <Input label="End date" name="endDate" type="date" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Create</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
