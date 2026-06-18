"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button, Input, Select } from "@/components/ui/forms";
import { submitClientRequest } from "@/lib/actions";

interface Props {
  projects: Array<{ id: string; name: string }>;
}

export function ClientRequestForm({ projects }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(form: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await submitClientRequest({
        title: form.get("title") as string,
        description: (form.get("description") as string) || undefined,
        category: form.get("category") as string,
        projectId: (form.get("projectId") as string) || undefined,
      });

      if (!result.ok) {
        setError(result.error ?? "Could not submit request");
        return;
      }

      setMessage("Request submitted — our team has been notified.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
      <Input label="What do you need?" name="title" required placeholder="e.g. Update homepage hero section" />
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-400">Details</span>
        <textarea
          name="description"
          rows={4}
          placeholder="Describe the request, links, deadlines, etc."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
        />
      </label>
      <Select
        label="Type"
        name="category"
        options={[
          { value: "general", label: "General request" },
          { value: "bug", label: "Bug / issue" },
          { value: "feature", label: "Feature / change" },
          { value: "content", label: "Content update" },
          { value: "billing", label: "Billing / invoice" },
        ]}
      />
      {projects.length > 0 && (
        <Select
          label="Project"
          name="projectId"
          options={[
            { value: "", label: "Default project" },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      )}
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        <Send className="h-4 w-4" />
        {pending ? "Submitting…" : "Submit Request"}
      </Button>
    </form>
  );
}
