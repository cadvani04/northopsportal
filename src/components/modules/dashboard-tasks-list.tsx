"use client";

import { Badge } from "@/components/ui";
import { TaskCheckbox } from "@/components/modules/task-checkbox";
import { formatDueDate, formatStatus, cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  project: { client: { company: string } } | null;
};

export function DashboardTasksList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <p className="py-4 text-center text-sm text-slate-500">No open tasks assigned to you</p>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const done = task.status === "DONE";
        return (
          <div
            key={task.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3",
              done && "opacity-60"
            )}
          >
            <TaskCheckbox taskId={task.id} completed={done} size="sm" />
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium text-white", done && "line-through text-slate-500")}>
                {task.title}
              </p>
              {task.project && <p className="text-xs text-slate-500">{task.project.client.company}</p>}
            </div>
            <div className="flex items-center gap-3">
              {task.dueDate && !done && (
                <span className="text-xs text-slate-400">{formatDueDate(task.dueDate)}</span>
              )}
              {!done && <Badge status={task.status}>{formatStatus(task.status)}</Badge>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
