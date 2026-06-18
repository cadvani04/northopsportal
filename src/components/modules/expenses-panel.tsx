"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { Modal, Button, Input, Select } from "@/components/ui/forms";
import { Badge } from "@/components/ui";
import { ExpenseReceiptUpload } from "@/components/modules/expense-receipt-upload";
import { createExpense, updateExpenseStatus, deleteExpense } from "@/lib/actions";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  status: string;
  date: Date;
  receiptUrl: string | null;
  submittedBy: { name: string };
  project: { name: string } | null;
};

interface Props {
  expenses: Expense[];
  projects: Array<{ id: string; name: string }>;
  isAdmin: boolean;
}

const CATEGORIES = [
  "Travel",
  "Software",
  "Infrastructure",
  "Meals",
  "Apollo",
  "Cursor",
  "Google",
  "Uber",
  "Trip",
  "Other",
];

export function ExpensesPanel({ expenses, projects, isAdmin }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  function submit(form: FormData) {
    startTransition(async () => {
      const result = await createExpense({
        title: form.get("title") as string,
        amount: parseFloat(form.get("amount") as string),
        category: form.get("category") as string,
        date: form.get("date") as string,
        projectId: (form.get("projectId") as string) || undefined,
        description: (form.get("description") as string) || undefined,
      });

      if (result.id && receiptFile) {
        const fd = new FormData();
        fd.append("file", receiptFile);
        await fetch(`/api/expenses/${result.id}/receipt`, { method: "POST", body: fd });
      }

      setReceiptFile(null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Submit Expense</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-slate-500">
              <th className="px-4 py-3">Expense</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Receipt</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white">{e.title}</td>
                <td className="px-4 py-3 text-slate-400">{e.category}</td>
                <td className="px-4 py-3 text-slate-400">{e.submittedBy.name}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(e.date)}</td>
                <td className="px-4 py-3 text-white">{formatCurrency(e.amount)}</td>
                <td className="px-4 py-3">
                  <ExpenseReceiptUpload expenseId={e.id} receiptUrl={e.receiptUrl} onChange={() => router.refresh()} />
                </td>
                <td className="px-4 py-3"><Badge status={e.status}>{formatStatus(e.status)}</Badge></td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {e.status === "PENDING" && (
                        <>
                          <button onClick={() => startTransition(async () => { await updateExpenseStatus(e.id, "APPROVED"); router.refresh(); })} className="text-emerald-400"><Check className="h-4 w-4" /></button>
                          <button onClick={() => startTransition(async () => { await updateExpenseStatus(e.id, "REJECTED"); router.refresh(); })} className="text-red-400"><X className="h-4 w-4" /></button>
                        </>
                      )}
                      <button onClick={() => confirm("Delete?") && startTransition(async () => { await deleteExpense(e.id); router.refresh(); })} className="text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Submit Expense">
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-4">
          <Input label="Title" name="title" required />
          <Input label="Amount" name="amount" type="number" step="0.01" required />
          <Select label="Category" name="category" options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <Input label="Date" name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
          <Select label="Project" name="projectId" options={[{ value: "", label: "None" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-400">Receipt (optional)</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Submit</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
