"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toggleTaskComplete } from "@/lib/actions";
import { cn } from "@/lib/utils";

interface Props {
  taskId: string;
  completed: boolean;
  size?: "sm" | "md";
}

export function TaskCheckbox({ taskId, completed, size = "md" }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleTaskComplete(taskId);
      router.refresh();
    });
  }

  const dim = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const icon = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={completed ? "Mark task incomplete" : "Mark task complete"}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
        dim,
        completed
          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
          : "border-white/20 bg-white/5 text-transparent hover:border-cyan-500/50 hover:bg-cyan-500/10"
      )}
    >
      {completed && <Check className={icon} strokeWidth={3} />}
    </button>
  );
}
