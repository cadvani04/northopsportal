"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Send, CheckCircle } from "lucide-react";
import { Modal, Button, Input, Select } from "@/components/ui/forms";
import { Badge } from "@/components/ui";
import { createInvoice, updateInvoiceStatus, deleteInvoice } from "@/lib/actions";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";

type Invoice = {
  id: string;
  number: string;
  status: string;
  total: number;
  dueDate: Date | null;
  client: { id: string; company: string };
};

interface Props {
  invoices: Invoice[];
  clients: Array<{ id: string; company: string }>;
}

export function InvoicesPanel({ invoices, clients }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(form: FormData) {
    startTransition(async () => {
      await createInvoice({
        number: form.get("number") as string,
        clientId: form.get("clientId") as string,
        amount: parseFloat(form.get("amount") as string),
        tax: parseFloat(form.get("tax") as string) || 0,
        dueDate: (form.get("dueDate") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Invoice</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-slate-500">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-white/5">
                <td className="px-4 py-3 font-medium text-white">{inv.number}</td>
                <td className="px-4 py-3 text-slate-400">{inv.client.company}</td>
                <td className="px-4 py-3 text-white">{formatCurrency(inv.total)}</td>
                <td className="px-4 py-3 text-slate-400">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                <td className="px-4 py-3"><Badge status={inv.status}>{formatStatus(inv.status)}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {inv.status === "DRAFT" && (
                      <button
                        title="Send to client"
                        onClick={() => startTransition(async () => { await updateInvoiceStatus(inv.id, "SENT"); router.refresh(); })}
                        className="rounded p-1 text-cyan-400 hover:text-cyan-300"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    {inv.status === "SENT" && (
                      <button
                        title="Mark paid"
                        onClick={() => startTransition(async () => { await updateInvoiceStatus(inv.id, "PAID"); router.refresh(); })}
                        className="rounded p-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => confirm("Delete?") && startTransition(async () => { await deleteInvoice(inv.id); router.refresh(); })}
                      className="rounded p-1 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="New Invoice">
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-4">
          <Input label="Invoice number" name="number" required placeholder="INV-2026-0060" />
          <Select label="Client" name="clientId" options={clients.map((c) => ({ value: c.id, label: c.company }))} required />
          <Input label="Amount" name="amount" type="number" step="0.01" required />
          <Input label="Tax" name="tax" type="number" step="0.01" defaultValue="0" />
          <Input label="Due date" name="dueDate" type="date" />
          <Input label="Notes" name="notes" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Create</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
