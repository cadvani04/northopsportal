"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal, Button, Input, Select } from "@/components/ui/forms";
import { Badge } from "@/components/ui";
import { createDeliverable, updateDeliverable, deleteDeliverable } from "@/lib/actions";
import { formatDate, formatStatus } from "@/lib/utils";

type Deliverable = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  projectId: string;
  project: { name: string; client: { company: string } };
};

interface Props {
  deliverables: Deliverable[];
  projects: Array<{ id: string; name: string; client: { company: string } }>;
}

const statuses = ["PLANNED", "IN_PROGRESS", "REVIEW", "DELIVERED", "APPROVED"].map((s) => ({
  value: s,
  label: formatStatus(s),
}));

export function DeliverablesPanel({ deliverables, projects }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const edit = editId ? deliverables.find((d) => d.id === editId) : null;

  function submit(form: FormData) {
    const data = {
      title: form.get("title") as string,
      description: (form.get("description") as string) || undefined,
      status: form.get("status") as never,
      dueDate: (form.get("dueDate") as string) || undefined,
      projectId: form.get("projectId") as string,
    };
    startTransition(async () => {
      if (editId) await updateDeliverable(editId, data);
      else await createDeliverable(data);
      setOpen(false);
      setEditId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => { setEditId(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> New Deliverable
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {deliverables.map((d) => (
          <div key={d.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="font-medium text-white">{d.title}</h3>
              <div className="flex gap-1">
                <button onClick={() => { setEditId(d.id); setOpen(true); }} className="text-slate-400 hover:text-white">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => confirm("Delete?") && startTransition(async () => { await deleteDeliverable(d.id); router.refresh(); })}
                  className="text-slate-400 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Badge status={d.status}>{formatStatus(d.status)}</Badge>
            <p className="mt-3 text-xs text-slate-500">{d.project.client.company} · {d.project.name}</p>
            {d.dueDate && <p className="mt-1 text-xs text-slate-400">Due {formatDate(d.dueDate)}</p>}
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Edit Deliverable" : "New Deliverable"}>
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-4">
          <Input label="Title" name="title" required defaultValue={edit?.title} />
          <Select
            label="Project"
            name="projectId"
            required
            options={projects.map((p) => ({ value: p.id, label: `${p.client.company} — ${p.name}` }))}
            defaultValue={edit?.projectId ?? projects[0]?.id}
          />
          <Select label="Status" name="status" options={statuses} defaultValue={edit?.status ?? "PLANNED"} />
          <Input label="Due date" name="dueDate" type="date" defaultValue={edit?.dueDate?.toISOString().split("T")[0]} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
