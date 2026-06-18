"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button, Input, Select } from "@/components/ui/forms";
import { logEmailRequest } from "@/lib/actions";

type Client = { id: string; company: string };

export function LogEmailRequestForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(form: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await logEmailRequest({
        clientId: form.get("clientId") as string,
        from: form.get("from") as string,
        subject: form.get("subject") as string,
        body: form.get("body") as string,
      });

      if (!result.ok) {
        setError(result.error ?? "Could not create deliverable");
        return;
      }

      setMessage("Deliverable and task created from email.");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-left transition hover:border-cyan-500/30 hover:bg-white/[0.04]"
      >
        <Mail className="h-5 w-5 text-cyan-400" />
        <div>
          <p className="text-sm font-medium text-white">Log an email as a request</p>
          <p className="text-xs text-slate-500">
            Paste a forwarded client email — creates a deliverable and task. No email routing setup needed.
          </p>
        </div>
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-white">Log email request</h3>
          <p className="text-xs text-slate-500">Forward or paste the client email below.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-500 hover:text-white"
        >
          Cancel
        </button>
      </div>

      <Select
        label="Client"
        name="clientId"
        required
        options={[
          { value: "", label: "Select client…" },
          ...clients.map((c) => ({ value: c.id, label: c.company })),
        ]}
      />
      <Input label="From" name="from" required placeholder="client@company.com" />
      <Input label="Subject" name="subject" required placeholder="Email subject line" />
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-400">Email body</span>
        <textarea
          name="body"
          required
          rows={6}
          placeholder="Paste the email content here…"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
        />
      </label>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create deliverable + task"}
      </Button>
    </form>
  );
}
