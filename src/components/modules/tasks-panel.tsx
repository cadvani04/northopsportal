"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal, Button, Input, Select, Checkbox } from "@/components/ui/forms";
import { Badge } from "@/components/ui";
import { createTask, updateTask, deleteTask } from "@/lib/actions";
import { TaskCheckbox } from "@/components/modules/task-checkbox";
import { formatDueDate, formatStatus, cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  projectId: string | null;
  assigneeId: string | null;
  isClientVisible: boolean;
  assignee: { id: string; name: string } | null;
  project: { id: string; name: string; client: { company: string } } | null;
};

interface Props {
  tasks: Task[];
  projects: Array<{ id: string; name: string; client: { company: string } }>;
  team: Array<{ id: string; name: string }>;
}

const statuses = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"].map((s) => ({
  value: s,
  label: formatStatus(s),
}));

export function TasksPanel({ tasks, projects, team }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editTask = editId ? tasks.find((t) => t.id === editId) : null;

  function submit(form: FormData) {
    const data = {
      title: form.get("title") as string,
      description: (form.get("description") as string) || undefined,
      status: form.get("status") as never,
      priority: form.get("priority") as string,
      dueDate: (form.get("dueDate") as string) || undefined,
      projectId: (form.get("projectId") as string) || undefined,
      assigneeId: (form.get("assigneeId") as string) || undefined,
      isClientVisible: form.get("isClientVisible") === "on",
    };

    startTransition(async () => {
      if (editId) await updateTask(editId, data);
      else await createTask(data);
      setOpen(false);
      setEditId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => { setEditId(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-slate-500">
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const done = task.status === "DONE";
              return (
              <tr
                key={task.id}
                className={cn(
                  "border-b border-white/5 hover:bg-white/[0.02]",
                  done && "opacity-60"
                )}
              >
                <td className="px-4 py-3">
                  <TaskCheckbox taskId={task.id} completed={done} size="sm" />
                </td>
                <td className={cn("px-4 py-3 font-medium text-white", done && "line-through text-slate-500")}>
                  {task.title}
                </td>
                <td className="px-4 py-3 text-slate-400">{task.project?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-400">{task.assignee?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-400">
                  {task.dueDate ? formatDueDate(task.dueDate) : "—"}
                </td>
                <td className="px-4 py-3">
                  {!done && <Badge status={task.status}>{formatStatus(task.status)}</Badge>}
                  {done && <span className="text-xs text-emerald-400">Done</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditId(task.id); setOpen(true); }}
                      className="rounded p-1 text-slate-400 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        confirm("Delete this task?") &&
                        startTransition(async () => {
                          await deleteTask(task.id);
                          router.refresh();
                        })
                      }
                      className="rounded p-1 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Edit Task" : "New Task"} wide>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <Input label="Title" name="title" required defaultValue={editTask?.title} />
          <TextareaField label="Description" name="description" defaultValue={editTask?.description ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" name="status" options={statuses} defaultValue={editTask?.status ?? "TODO"} />
            <Select
              label="Priority"
              name="priority"
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
              defaultValue={editTask?.priority ?? "medium"}
            />
          </div>
          <Input
            label="Due date"
            name="dueDate"
            type="date"
            defaultValue={editTask?.dueDate?.toISOString().split("T")[0]}
          />
          <Select
            label="Project"
            name="projectId"
            options={[{ value: "", label: "None" }, ...projects.map((p) => ({ value: p.id, label: `${p.client.company} — ${p.name}` }))]}
            defaultValue={editTask?.projectId ?? ""}
          />
          <Select
            label="Assignee"
            name="assigneeId"
            options={[{ value: "", label: "Unassigned" }, ...team.map((t) => ({ value: t.id, label: t.name }))]}
            defaultValue={editTask?.assigneeId ?? ""}
          />
          <Checkbox label="Visible to client" name="isClientVisible" defaultChecked={editTask?.isClientVisible} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function TextareaField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
      />
    </label>
  );
}
