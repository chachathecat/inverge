"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SECOND_EXAM_ADMIN_SUBJECTS,
  SECOND_EXAM_GAP_TYPES,
  type AdminRewriteSeedTemplate,
  type AdminRewriteSeedTemplateListResponse,
} from "@/lib/inverge/admin-rewrite-seed-templates";
import type { GapType, SecondExamSubjectId } from "@/lib/inverge/second-exam-diagnosis";
import { cn } from "@/lib/utils";

type SaveResponse = {
  ok: boolean;
  error?: string;
  template?: AdminRewriteSeedTemplate;
  list?: AdminRewriteSeedTemplateListResponse;
};

type TemplateFormState = Omit<AdminRewriteSeedTemplate, "guidance"> & {
  guidanceText: string;
};

function inputClass() {
  return "h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 text-sm text-[color:var(--foreground-strong)] outline-none focus:border-[color:var(--primary)]";
}

function textareaClass(minHeight = "min-h-24") {
  return `${minHeight} w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm leading-6 text-[color:var(--foreground-strong)] outline-none focus:border-[color:var(--primary)]`;
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-caption font-medium text-[color:var(--muted)]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function toFormState(template: AdminRewriteSeedTemplate): TemplateFormState {
  return {
    ...template,
    guidanceText: template.guidance.join("\n"),
  };
}

function emptyTemplate(subjectId: SecondExamSubjectId, gapType: GapType): TemplateFormState {
  const now = new Date().toISOString();

  return {
    id: "",
    subjectId,
    gapType,
    focusLabel: "",
    gapTitle: "",
    gapSummary: "",
    rewriteInstruction: "",
    guidanceTitle: "Correction guide",
    guidanceText: "",
    placeholder: "",
    starter: "",
    minimumLength: 80,
    active: true,
    operatorNote: "",
    createdAt: now,
    updatedAt: now,
  };
}

function subjectLabel(subjectId: SecondExamSubjectId) {
  return SECOND_EXAM_ADMIN_SUBJECTS.find((subject) => subject.id === subjectId)?.label ?? subjectId;
}

export function RewriteSeedTemplateAdmin() {
  const [subjectId, setSubjectId] = useState<SecondExamSubjectId>("practice");
  const [gapType, setGapType] = useState<GapType | "all">("all");
  const [data, setData] = useState<AdminRewriteSeedTemplateListResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<TemplateFormState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      setStatus("loading");
      setMessage("");

      try {
        const params = new URLSearchParams({ subjectId });
        if (gapType !== "all") params.set("gapType", gapType);

        const response = await fetch(`/api/admin/rewrite-seed-templates?${params.toString()}`);
        if (!response.ok) throw new Error("load-failed");

        const nextData = (await response.json()) as AdminRewriteSeedTemplateListResponse;
        if (cancelled) return;

        const first = nextData.templates[0];
        setData(nextData);
        setSelectedId(first?.id ?? "");
        setForm(first ? toFormState(first) : emptyTemplate(subjectId, gapType === "all" ? "weak-conclusion" : gapType));
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not load rewrite seed templates.");
        }
      }
    }

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [gapType, subjectId]);

  const selectedTemplate = useMemo(
    () => data?.templates.find((template) => template.id === selectedId) ?? null,
    [data?.templates, selectedId],
  );

  function selectTemplate(template: AdminRewriteSeedTemplate) {
    setSelectedId(template.id);
    setForm(toFormState(template));
    setMessage("");
  }

  function startNewTemplate() {
    setSelectedId("");
    setForm(emptyTemplate(subjectId, gapType === "all" ? "weak-conclusion" : gapType));
    setMessage("Draft a new template.");
  }

  function updateForm(next: Partial<TemplateFormState>) {
    setForm((current) => (current ? { ...current, ...next } : current));
  }

  async function saveTemplate() {
    if (!form) return;

    setStatus("saving");
    setMessage("");

    try {
      const payload = {
        id: form.id || undefined,
        subjectId: form.subjectId,
        gapType: form.gapType,
        focusLabel: form.focusLabel,
        gapTitle: form.gapTitle,
        gapSummary: form.gapSummary,
        rewriteInstruction: form.rewriteInstruction,
        guidanceTitle: form.guidanceTitle,
        guidance: form.guidanceText.split("\n"),
        placeholder: form.placeholder,
        starter: form.starter,
        minimumLength: form.minimumLength,
        active: form.active,
        operatorNote: form.operatorNote,
      };
      const response = await fetch("/api/admin/rewrite-seed-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as SaveResponse;

      if (!response.ok || !result.ok || !result.template || !result.list) {
        throw new Error(result.error ?? "save-failed");
      }

      setData(result.list);
      setSelectedId(result.template.id);
      setForm(toFormState(result.template));
      setStatus("ready");
      setMessage("Saved.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save template.");
    }
  }

  async function setActive(active: boolean) {
    if (!form?.id) return;

    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/admin/rewrite-seed-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-active", id: form.id, subjectId, gapType: gapType === "all" ? undefined : gapType, active }),
      });
      const result = (await response.json()) as SaveResponse;

      if (!response.ok || !result.ok || !result.template || !result.list) {
        throw new Error(result.error ?? "active-update-failed");
      }

      setData(result.list);
      setSelectedId(result.template.id);
      setForm(toFormState(result.template));
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
        <p className="text-caption font-medium text-[color:var(--muted)]">Admin / Rewrite seed templates</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-h1 font-medium text-[color:var(--foreground-strong)]">Rewrite seed templates</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
              Tune the compare focus copy and the rewrite seed used by the second-exam compare/rewrite loop.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value as SecondExamSubjectId)}
              className="h-11 rounded-full border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
            >
              {SECOND_EXAM_ADMIN_SUBJECTS.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.label}
                </option>
              ))}
            </select>
            <select
              value={gapType}
              onChange={(event) => setGapType(event.target.value as GapType | "all")}
              className="h-11 rounded-full border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
            >
              <option value="all">All gap types</option>
              {SECOND_EXAM_GAP_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <section className="grid gap-6 py-6 lg:grid-cols-[260px_1fr_430px]">
        <aside className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Scope</p>
            <div className="mt-4 space-y-3 text-sm text-[color:var(--muted-strong)]">
              <div className="rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3">
                <p className="text-caption text-[color:var(--muted)]">Subject</p>
                <p className="mt-1 font-medium text-[color:var(--foreground-strong)]">{subjectLabel(subjectId)}</p>
              </div>
              <div className="rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3">
                <p className="text-caption text-[color:var(--muted)]">Templates</p>
                <p className="mt-1 font-medium text-[color:var(--foreground-strong)]">
                  {data?.summary.activeCount ?? 0} active / {data?.summary.totalCount ?? 0} total
                </p>
              </div>
              <p className="text-caption leading-5 text-[color:var(--muted)]">
                Active templates are shaped to override rule-based rewrite seed copy without changing gap selection logic.
              </p>
            </div>
          </div>
        </aside>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Template list</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">Subject and gap type are the lookup keys.</p>
            </div>
            <Button type="button" variant="outline" onClick={startNewTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {status === "loading" ? <p className="p-5 text-sm text-[color:var(--muted)]">Loading templates.</p> : null}
            {data?.templates.length === 0 && status !== "loading" ? (
              <p className="p-5 text-sm text-[color:var(--muted)]">No template in this scope.</p>
            ) : null}
            {data?.templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template)}
                className={cn(
                  "grid w-full gap-3 px-5 py-4 text-left transition sm:grid-cols-[1fr_110px_auto]",
                  selectedId === template.id ? "bg-[color:var(--primary-soft)]" : "hover:bg-[color:var(--surface-soft)]",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[color:var(--foreground-strong)]">{template.focusLabel}</p>
                  <p className="mt-1 truncate text-caption text-[color:var(--muted)]">{template.gapTitle}</p>
                  <p className="mt-1 break-all text-[11px] leading-4 text-[color:var(--muted)]">{template.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{template.gapType}</p>
                  <p className="text-caption text-[color:var(--muted)]">{template.minimumLength} chars</p>
                </div>
                <span
                  className={cn(
                    "h-fit rounded-full border px-2.5 py-1 text-[11px]",
                    template.active
                      ? "border-[color:rgba(60,128,89,0.26)] bg-[color:var(--status-green-soft)] text-[color:var(--foreground-strong)]"
                      : "border-[var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted)]",
                  )}
                >
                  {template.active ? "active" : "inactive"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Template detail</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">
                {selectedTemplate ? selectedTemplate.id : "New template"}
              </p>
            </div>
            {form?.id ? (
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
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="subject">
                  <select className={inputClass()} value={form.subjectId} onChange={(event) => updateForm({ subjectId: event.target.value as SecondExamSubjectId })}>
                    {SECOND_EXAM_ADMIN_SUBJECTS.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="gapType">
                  <select className={inputClass()} value={form.gapType} onChange={(event) => updateForm({ gapType: event.target.value as GapType })}>
                    {SECOND_EXAM_GAP_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="focusLabel">
                <input className={inputClass()} value={form.focusLabel} onChange={(event) => updateForm({ focusLabel: event.target.value })} />
              </Field>

              <Field label="gapTitle">
                <input className={inputClass()} value={form.gapTitle} onChange={(event) => updateForm({ gapTitle: event.target.value })} />
              </Field>

              <Field label="gapSummary">
                <textarea
                  value={form.gapSummary}
                  onChange={(event) => updateForm({ gapSummary: event.target.value })}
                  className={textareaClass("min-h-20")}
                />
              </Field>

              <Field label="rewriteInstruction">
                <textarea
                  value={form.rewriteInstruction}
                  onChange={(event) => updateForm({ rewriteInstruction: event.target.value })}
                  className={textareaClass("min-h-20")}
                />
              </Field>

              <Field label="guidanceTitle">
                <input className={inputClass()} value={form.guidanceTitle} onChange={(event) => updateForm({ guidanceTitle: event.target.value })} />
              </Field>

              <Field label="guidance">
                <textarea
                  value={form.guidanceText}
                  onChange={(event) => updateForm({ guidanceText: event.target.value })}
                  className={textareaClass("min-h-28")}
                  placeholder={"One guidance item per line"}
                />
              </Field>

              <Field label="placeholder">
                <textarea
                  value={form.placeholder}
                  onChange={(event) => updateForm({ placeholder: event.target.value })}
                  className={textareaClass("min-h-24")}
                />
              </Field>

              <Field label="starter">
                <input className={inputClass()} value={form.starter} onChange={(event) => updateForm({ starter: event.target.value })} />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="minimumLength">
                  <input
                    type="number"
                    min={40}
                    max={400}
                    className={inputClass()}
                    value={form.minimumLength}
                    onChange={(event) => updateForm({ minimumLength: Number(event.target.value) })}
                  />
                </Field>
                <Field label="active">
                  <select className={inputClass()} value={form.active ? "active" : "inactive"} onChange={(event) => updateForm({ active: event.target.value === "active" })}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </Field>
              </div>

              <Field label="operatorNote">
                <textarea
                  value={form.operatorNote ?? ""}
                  onChange={(event) => updateForm({ operatorNote: event.target.value })}
                  className={textareaClass("min-h-16")}
                />
              </Field>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <p className={cn("text-caption", status === "error" ? "text-[color:var(--status-red)]" : "text-[color:var(--muted)]")}>
                  {message || "Saving updates the persisted seed template store."}
                </p>
                <Button
                  type="button"
                  onClick={saveTemplate}
                  disabled={
                    status === "saving" ||
                    !form.focusLabel ||
                    !form.gapTitle ||
                    !form.gapSummary ||
                    !form.rewriteInstruction ||
                    !form.guidanceText.trim() ||
                    !form.placeholder ||
                    !form.starter
                  }
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-5 text-sm text-[color:var(--muted)]">Select a template.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
