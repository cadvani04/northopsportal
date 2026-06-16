"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal, Button, Input, Select } from "@/components/ui/forms";
import { createClient, updateClient, deleteClient, createClientUser } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";

type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  status: string;
  _count: { projects: number; invoices: number; agreements: number };
};

export function ClientsPanel({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const edit = editId ? clients.find((c) => c.id === editId) : null;

  function submitClient(form: FormData) {
    const data = {
      name: form.get("name") as string,
      company: form.get("company") as string,
      email: form.get("email") as string,
      phone: (form.get("phone") as string) || undefined,
      status: form.get("status") as string,
    };
    startTransition(async () => {
      if (editId) await updateClient(editId, data);
      else await createClient(data);
      setOpen(false);
      setEditId(null);
      router.refresh();
    });
  }

  function submitUser(form: FormData) {
    startTransition(async () => {
      await createClientUser({
        name: form.get("name") as string,
        email: form.get("email") as string,
        password: form.get("password") as string,
        clientId: userOpen!,
      });
      setUserOpen(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => { setEditId(null); setOpen(true); }}><Plus className="h-4 w-4" /> New Client</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((c) => (
          <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-medium text-white">{c.company}</h3>
                <p className="text-sm text-slate-500">{c.name}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditId(c.id); setOpen(true); }} className="text-slate-400 hover:text-white"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => confirm("Delete client?") && startTransition(async () => { await deleteClient(c.id); router.refresh(); })} className="text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <p className="text-sm text-slate-400">{c.email}</p>
            <div className="mt-4 flex gap-4 text-xs text-slate-500">
              <span>{c._count.projects} projects</span>
              <span>{c._count.invoices} invoices</span>
            </div>
            <Button variant="secondary" className="mt-4 w-full text-xs" onClick={() => setUserOpen(c.id)}>
              Add portal login
            </Button>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Edit Client" : "New Client"}>
        <form onSubmit={(e) => { e.preventDefault(); submitClient(new FormData(e.currentTarget)); }} className="space-y-4">
          <Input label="Contact name" name="name" required defaultValue={edit?.name} />
          <Input label="Company" name="company" required defaultValue={edit?.company} />
          <Input label="Email" name="email" type="email" required defaultValue={edit?.email} />
          <Input label="Phone" name="phone" defaultValue={edit?.phone ?? ""} />
          <Select label="Status" name="status" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} defaultValue={edit?.status ?? "active"} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Save</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!userOpen} onClose={() => setUserOpen(null)} title="Create client portal login">
        <form onSubmit={(e) => { e.preventDefault(); submitUser(new FormData(e.currentTarget)); }} className="space-y-4">
          <Input label="Name" name="name" required />
          <Input label="Email" name="email" type="email" required />
          <Input label="Password" name="password" type="password" required minLength={8} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setUserOpen(null)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Create login</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
