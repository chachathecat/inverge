"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { ADMIN_SET_SUBJECTS, type AdminSetListItem, type AdminSetListResponse, type AdminSetSubjectId } from "@/lib/inverge/admin-set-metadata";
import { cn } from "@/lib/utils";

type SaveResponse = {
  ok: boolean;
  error?: string;
  set?: AdminSetListItem;
  list?: AdminSetListResponse;
};

type SetFormState = {
  id: string;
  setId: string;
  setTitle: string;
  examId: string;
  subjectId: AdminSetSubjectId;
  sourceLabel: string;
  sourceYear: string;
  timeLimitMinutes: number;
  active: boolean;
  operatorNote: string;
};

function inputClass() {
  return "h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 text-sm text-[color:var(--foreground-strong)] outline-none focus:border-[color:var(--primary)]";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-caption font-medium text-[color:var(--muted)]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function toFormState(set: AdminSetListItem): SetFormState {
  return {
    id: set.id,
    setId: set.setId,
    setTitle: set.setTitle,
    examId: set.examId,
    subjectId: set.subjectId,
    sourceLabel: set.sourceLabel,
    sourceYear: set.sourceYear ? String(set.sourceYear) : "",
    timeLimitMinutes: set.timeLimitMinutes,
    active: set.active,
    operatorNote: set.operatorNote ?? "",
  };
}

function emptySet(subjectId: AdminSetSubjectId): SetFormState {
  return {
    id: "",
    setId: "",
    setTitle: "",
    examId: "appraisal_first",
    subjectId,
    sourceLabel: "기출 변형 세트",
    sourceYear: "",
    timeLimitMinutes: 12,
    active: true,
    operatorNote: "",
  };
}

export function SetMetadataAdmin() {
  const [subjectId, setSubjectId] = useState<AdminSetSubjectId | "all">("all");
  const [data, setData] = useState<AdminSetListResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<SetFormState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSets() {
      setStatus("loading");
      setMessage("");

      try {
        const response = await fetch(`/api/admin/sets?subjectId=${subjectId}`);
        if (!response.ok) throw new Error("load-failed");
        const nextData = (await response.json()) as AdminSetListResponse;
        if (cancelled) return;

        const first = nextData.sets[0];
        setData(nextData);
        setSelectedId(first?.setId ?? "");
        setForm(first ? toFormState(first) : emptySet(subjectId === "all" ? "civil_law" : subjectId));
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not load sets.");
        }
      }
    }

    void loadSets();

    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const selectedSet = useMemo(() => data?.sets.find((item) => item.setId === selectedId) ?? null, [data?.sets, selectedId]);

  function updateForm(next: Partial<SetFormState>) {
    setForm((current) => (current ? { ...current, ...next } : current));
  }

  function startNewSet() {
    setSelectedId("");
    setForm(emptySet(subjectId === "all" ? "civil_law" : subjectId));
    setMessage("Draft a new set.");
  }

  function selectSet(set: AdminSetListItem) {
    setSelectedId(set.setId);
    setForm(toFormState(set));
    setMessage("");
  }

  async function saveSet() {
    if (!form) return;
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/admin/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id || undefined,
          setId: form.setId,
          setTitle: form.setTitle,
          examId: form.examId,
          subjectId: form.subjectId,
          sourceLabel: form.sourceLabel,
          sourceYear: form.sourceYear ? Number(form.sourceYear) : undefined,
          timeLimitMinutes: form.timeLimitMinutes,
          active: form.active,
          operatorNote: form.operatorNote,
        }),
      });
      const result = (await response.json()) as SaveResponse;
      if (!response.ok || !result.ok || !result.list) {
        throw new Error(result.error ?? "save-failed");
      }

      setData(result.list);
      setSelectedId(form.setId);
      setStatus("ready");
      setMessage("Saved.");
    } catch {
      setStatus("error");
      setMessage("Could not save set.");
    }
  }

  async function setActive(active: boolean) {
    if (!form?.setId) return;
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/admin/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-active", setId: form.setId, active }),
      });
      const result = (await response.json()) as SaveResponse;
      if (!response.ok || !result.ok || !result.list) {
        throw new Error(result.error ?? "active-update-failed");
      }

      setData(result.list);
      setForm((current) => (current ? { ...current, active } : current));
      setStatus("ready");
      setMessage(active ? "Activated." : "Deactivated.");
    } catch {
      setStatus("error");
      setMessage("Could not update active state.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
      <header className="border-b border-[var(--border)] pb-6">
        <p className="text-caption font-medium text-[color:var(--muted)]">Admin / Sets</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-h1 font-medium text-[color:var(--foreground-strong)]">Set metadata</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
              Keep set-level metadata aligned for diagnosis, review queue generation, and coaching context.
            </p>
          </div>
          <select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value as AdminSetSubjectId | "all")}
            className="h-11 rounded-full border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
          >
            <option value="all">전체 과목</option>
            {ADMIN_SET_SUBJECTS.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section className="grid gap-6 py-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Set list</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">Open the detail page to edit question metadata inside a set.</p>
            </div>
            <Button type="button" variant="outline" onClick={startNewSet}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {status === "loading" ? <p className="p-5 text-sm text-[color:var(--muted)]">Loading sets.</p> : null}
            {data?.sets.map((set) => (
              <button
                key={set.setId}
                type="button"
                onClick={() => selectSet(set)}
                className={cn(
                  "grid w-full gap-3 px-5 py-4 text-left transition sm:grid-cols-[1fr_auto]",
                  selectedId === set.setId ? "bg-[color:var(--primary-soft)]" : "hover:bg-[color:var(--surface-soft)]",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[color:var(--foreground-strong)]">{set.setTitle}</p>
                  <p className="mt-1 text-caption text-[color:var(--muted)]">
                    {set.subjectId} · {set.sourceLabel} · {set.timeLimitMinutes}분
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-[color:var(--muted)]">
                    questions {set.questionCount} / connected {set.connectedCurriculumCount}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px]",
                      set.active
                        ? "border-[color:rgba(60,128,89,0.26)] bg-[color:var(--status-green-soft)] text-[color:var(--foreground-strong)]"
                        : "border-[var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted)]",
                    )}
                  >
                    {set.active ? "active" : "inactive"}
                  </span>
                  <Link href={`/admin/sets/${set.setId}`} className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-3 text-[12px]")}>
                    Detail
                  </Link>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Set detail</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">{selectedSet ? selectedSet.setId : "New set"}</p>
            </div>
            {form?.setId ? (
              <button
                type="button"
                onClick={() => setActive(!form.active)}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-caption text-[color:var(--muted-strong)]"
              >
                {form.active ? "Deactivate" : "Activate"}
              </button>
            ) : null}
          </div>

          {form ? (
            <form className="mt-5 space-y-4" onSubmit={(event) => event.preventDefault()}>
              <Field label="setId">
                <input className={inputClass()} value={form.setId} onChange={(event) => updateForm({ setId: event.target.value })} />
              </Field>
              <Field label="setTitle">
                <input className={inputClass()} value={form.setTitle} onChange={(event) => updateForm({ setTitle: event.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="examId">
                  <input className={inputClass()} value={form.examId} onChange={(event) => updateForm({ examId: event.target.value })} />
                </Field>
                <Field label="subjectId">
                  <select className={inputClass()} value={form.subjectId} onChange={(event) => updateForm({ subjectId: event.target.value as AdminSetSubjectId })}>
                    {ADMIN_SET_SUBJECTS.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="sourceLabel">
                  <input className={inputClass()} value={form.sourceLabel} onChange={(event) => updateForm({ sourceLabel: event.target.value })} />
                </Field>
                <Field label="sourceYear">
                  <input className={inputClass()} value={form.sourceYear} onChange={(event) => updateForm({ sourceYear: event.target.value })} />
                </Field>
                <Field label="timeLimitMinutes">
                  <input
                    type="number"
                    className={inputClass()}
                    value={form.timeLimitMinutes}
                    onChange={(event) => updateForm({ timeLimitMinutes: Number(event.target.value) })}
                  />
                </Field>
              </div>
              <Field label="operatorNote">
                <textarea
                  value={form.operatorNote}
                  onChange={(event) => updateForm({ operatorNote: event.target.value })}
                  className="min-h-24 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm outline-none focus:border-[color:var(--primary)]"
                />
              </Field>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <p className={cn("text-caption", status === "error" ? "text-[color:var(--status-red)]" : "text-[color:var(--muted)]")}>
                  {message || "Saving updates the admin set repository."}
                </p>
                <Button type="button" onClick={saveSet} disabled={status === "saving" || !form.setId || !form.setTitle}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </form>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
