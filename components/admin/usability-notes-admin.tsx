"use client";

import { useEffect, useState } from "react";

type Severity = "low" | "medium" | "high";

type Note = {
  id: string;
  createdAt: string;
  route: string;
  task: string;
  frictionPoint: string;
  severity: Severity;
  quote: string;
  suggestedFix: string;
};

export function UsabilityNotesAdmin() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ route: "", task: "", frictionPoint: "", severity: "medium" as Severity, quote: "", suggestedFix: "" });

  async function loadNotes() {
    const res = await fetch("/api/admin/usability-notes", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setNotes(data.notes);
    setLoading(false);
  }

  useEffect(() => {
    void loadNotes();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/usability-notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setForm({ route: "", task: "", frictionPoint: "", severity: "medium", quote: "", suggestedFix: "" });
        await loadNotes();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="mx-auto w-full max-w-5xl space-y-6 px-5 py-10">
    <section className="rounded-xl border p-5">
      <h1 className="text-2xl font-medium">Usability Notes (Admin)</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">Route/task friction logging only. raw OCR/problem/answer text is not collected.</p>
    </section>
    <section className="rounded-xl border p-5">
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        {(["route", "task", "frictionPoint", "quote", "suggestedFix"] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1 text-sm">
            {key}
            <input required value={form[key]} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} className="rounded-md border px-3 py-2" />
          </label>
        ))}
        <label className="flex flex-col gap-1 text-sm">
          severity
          <select value={form.severity} onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value as Severity }))} className="rounded-md border px-3 py-2">
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
          </select>
        </label>
        <div className="md:col-span-2"><button disabled={submitting} className="rounded-md bg-black px-4 py-2 text-white">{submitting ? "Saving..." : "Save note"}</button></div>
      </form>
    </section>
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-medium">Recent notes</h2>
      {loading ? <p className="mt-3 text-sm">Loading...</p> : <div className="mt-3 space-y-2">{notes.map((note) => <div key={note.id} className="rounded-lg border p-3 text-sm"><p>{note.route} · {note.task} · {note.severity}</p><p className="text-[color:var(--muted)]">{note.frictionPoint} / “{note.quote}” / {note.suggestedFix}</p></div>)}</div>}
    </section>
  </main>;
}
