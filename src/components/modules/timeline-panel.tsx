"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Modal, Button, Input, Select } from "@/components/ui/forms";
import { createTimelineEvent, deleteTimelineEvent } from "@/lib/actions";
import { formatDate } from "@/lib/utils";

type Event = {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  type: string;
  project: { name: string; client: { company: string } };
};

export function TimelinePanel({ events, projects }: { events: Event[]; projects: Array<{ id: string; name: string; client: { company: string } }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(form: FormData) {
    startTransition(async () => {
      await createTimelineEvent({
        title: form.get("title") as string,
        description: (form.get("description") as string) || undefined,
        date: form.get("date") as string,
        type: form.get("type") as string,
        projectId: form.get("projectId") as string,
      });
      setOpen(false);
      router.refresh();
    });
  }

  const grouped = events.reduce((acc, e) => {
    const k = e.project.client.company;
    if (!acc[k]) acc[k] = [];
    acc[k].push(e);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Event</Button>
      </div>
      <div className="space-y-8">
        {Object.entries(grouped).map(([client, clientEvents]) => (
          <div key={client}>
            <h2 className="mb-4 text-lg font-semibold text-white">{client}</h2>
            <div className="relative ml-4 border-l border-white/10 pl-8">
              {clientEvents.map((event) => (
                <div key={event.id} className="relative mb-6">
                  <div className="absolute -left-[37px] h-3 w-3 rounded-full bg-cyan-500" />
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium text-white">{event.title}</p>
                        <p className="text-sm text-slate-500">{event.project.name}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <p className="text-sm text-slate-300">{formatDate(event.date)}</p>
                        <button onClick={() => confirm("Delete?") && startTransition(async () => { await deleteTimelineEvent(event.id); router.refresh(); })} className="text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Timeline Event">
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-4">
          <Input label="Title" name="title" required />
          <Select label="Project" name="projectId" options={projects.map((p) => ({ value: p.id, label: `${p.client.company} — ${p.name}` }))} required />
          <Input label="Date" name="date" type="date" required />
          <Select label="Type" name="type" options={[
            { value: "milestone", label: "Milestone" },
            { value: "deadline", label: "Deadline" },
            { value: "event", label: "Event" },
          ]} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Add</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
