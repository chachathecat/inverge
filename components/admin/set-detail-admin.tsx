"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AdminQuestionMetadata, AdminSetDetailResponse, AdminSetSubjectId } from "@/lib/inverge/admin-set-metadata";
import { ADMIN_SET_SUBJECTS } from "@/lib/inverge/admin-set-metadata";
import { cn } from "@/lib/utils";

type QuestionFormState = Omit<AdminQuestionMetadata, "curriculumNodeIds"> & {
  curriculumNodeIdsText: string;
};

type SaveResponse = {
  ok: boolean;
  error?: string;
  question?: AdminQuestionMetadata;
  detail?: AdminSetDetailResponse | null;
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

function toFormState(question: AdminQuestionMetadata): QuestionFormState {
  return {
    ...question,
    curriculumNodeIdsText: question.curriculumNodeIds.join(", "),
  };
}

export function SetDetailAdmin({ setId }: { setId: string }) {
  const [detail, setDetail] = useState<AdminSetDetailResponse | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [form, setForm] = useState<QuestionFormState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      setStatus("loading");
      setMessage("");

      try {
        const response = await fetch(`/api/admin/sets/${setId}`);
        if (!response.ok) throw new Error("load-failed");
        const nextDetail = (await response.json()) as AdminSetDetailResponse;
        if (cancelled) return;

        const first = nextDetail.questions[0];
        setDetail(nextDetail);
        setSelectedQuestionId(first?.questionId ?? "");
        setForm(first ? toFormState(first) : null);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not load set detail.");
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [setId]);

  const selectedQuestion = useMemo(
    () => detail?.questions.find((question) => question.questionId === selectedQuestionId) ?? null,
    [detail?.questions, selectedQuestionId],
  );

  function selectQuestion(question: AdminQuestionMetadata) {
    setSelectedQuestionId(question.questionId);
    setForm(toFormState(question));
    setMessage("");
  }

  function updateForm(next: Partial<QuestionFormState>) {
    setForm((current) => (current ? { ...current, ...next } : current));
  }

  async function saveQuestion() {
    if (!form) return;
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/sets/${setId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          questionId: form.questionId,
          number: form.number,
          subjectId: form.subjectId,
          unit: form.unit,
          difficulty: form.difficulty,
          curriculumNodeIds: form.curriculumNodeIdsText.split(",").map((item) => item.trim()).filter(Boolean),
          expectedTimeSeconds: form.expectedTimeSeconds,
          timeOveruseThresholdSeconds: form.timeOveruseThresholdSeconds,
          reviewCandidateFlags: form.reviewCandidateFlags,
          active: form.active,
          operatorNote: form.operatorNote,
        }),
      });
      const result = (await response.json()) as SaveResponse;
      if (!response.ok || !result.ok || !result.detail || !result.question) {
        throw new Error(result.error ?? "save-failed");
      }

      setDetail(result.detail);
      setSelectedQuestionId(result.question.questionId);
      setForm(toFormState(result.question));
      setStatus("ready");
      setMessage("Saved.");
    } catch {
      setStatus("error");
      setMessage("Could not save question.");
    }
  }

  async function setActive(active: boolean) {
    if (!form?.questionId) return;
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/sets/${setId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-question-active", questionId: form.questionId, active }),
      });
      const result = (await response.json()) as SaveResponse;
      if (!response.ok || !result.ok || !result.detail || !result.question) {
        throw new Error(result.error ?? "active-update-failed");
      }

      setDetail(result.detail);
      setSelectedQuestionId(result.question.questionId);
      setForm(toFormState(result.question));
      setStatus("ready");
      setMessage(active ? "Activated." : "Deactivated.");
    } catch {
      setStatus("error");
      setMessage("Could not update question state.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <header className="border-b border-[var(--border)] pb-6">
        <p className="text-caption font-medium text-[color:var(--muted)]">Admin / Sets / {setId}</p>
        <h1 className="mt-3 text-h1 font-medium text-[color:var(--foreground-strong)]">{detail?.set.setTitle ?? "Set detail"}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
          Adjust question-level metadata that affects curriculum linkage, review candidate generation, and timing heuristics.
        </p>
      </header>

      <section className="grid gap-6 py-6 lg:grid-cols-[320px_1fr_380px]">
        <aside className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Set summary</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3">
                <p className="text-caption text-[color:var(--muted)]">Subject</p>
                <p className="mt-1 font-medium text-[color:var(--foreground-strong)]">
                  {ADMIN_SET_SUBJECTS.find((subject) => subject.id === detail?.set.subjectId)?.label ?? detail?.set.subjectId}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3">
                  <p className="text-caption text-[color:var(--muted)]">Questions</p>
                  <p className="mt-1 font-medium text-[color:var(--foreground-strong)]">{detail?.summary.totalQuestions ?? 0}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3">
                  <p className="text-caption text-[color:var(--muted)]">Connected</p>
                  <p className="mt-1 font-medium text-[color:var(--foreground-strong)]">{detail?.summary.connectedQuestions ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Questions in set</p>
            <p className="mt-1 text-caption text-[color:var(--muted)]">Open one question and edit its metadata on the right.</p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {status === "loading" ? <p className="p-5 text-sm text-[color:var(--muted)]">Loading questions.</p> : null}
            {detail?.questions.map((question) => (
              <button
                key={question.questionId}
                type="button"
                onClick={() => selectQuestion(question)}
                className={cn(
                  "grid w-full gap-3 px-5 py-4 text-left transition sm:grid-cols-[1fr_auto]",
                  selectedQuestionId === question.questionId ? "bg-[color:var(--primary-soft)]" : "hover:bg-[color:var(--surface-soft)]",
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">
                    {question.number}번 · {question.unit}
                  </p>
                  <p className="mt-1 text-caption text-[color:var(--muted)]">
                    {question.questionId} · {question.difficulty} · expected {question.expectedTimeSeconds}s
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-[color:var(--muted)]">
                    curriculum {question.curriculumNodeIds.length > 0 ? `${question.curriculumNodeIds.length} linked` : "not linked"}
                  </p>
                </div>
                <span
                  className={cn(
                    "h-fit rounded-full border px-2.5 py-1 text-[11px]",
                    question.active
                      ? "border-[color:rgba(60,128,89,0.26)] bg-[color:var(--status-green-soft)] text-[color:var(--foreground-strong)]"
                      : "border-[var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted)]",
                  )}
                >
                  {question.active ? "active" : "inactive"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Question detail</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">{selectedQuestion ? selectedQuestion.questionId : "Select a question"}</p>
            </div>
            {form?.questionId ? (
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
                <Field label="questionId">
                  <input className={inputClass()} value={form.questionId} onChange={(event) => updateForm({ questionId: event.target.value })} />
                </Field>
                <Field label="number">
                  <input type="number" className={inputClass()} value={form.number} onChange={(event) => updateForm({ number: Number(event.target.value) })} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="subjectId">
                  <select className={inputClass()} value={form.subjectId} onChange={(event) => updateForm({ subjectId: event.target.value as AdminSetSubjectId })}>
                    {ADMIN_SET_SUBJECTS.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="difficulty">
                  <select className={inputClass()} value={form.difficulty} onChange={(event) => updateForm({ difficulty: event.target.value as QuestionFormState["difficulty"] })}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </Field>
              </div>
              <Field label="unit">
                <input className={inputClass()} value={form.unit} onChange={(event) => updateForm({ unit: event.target.value })} />
              </Field>
              <Field label="curriculumNodeIds">
                <input
                  className={inputClass()}
                  value={form.curriculumNodeIdsText}
                  onChange={(event) => updateForm({ curriculumNodeIdsText: event.target.value })}
                  placeholder="comma separated"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="expectedTimeSeconds">
                  <input
                    type="number"
                    className={inputClass()}
                    value={form.expectedTimeSeconds}
                    onChange={(event) => updateForm({ expectedTimeSeconds: Number(event.target.value) })}
                  />
                </Field>
                <Field label="timeOveruseThresholdSeconds">
                  <input
                    type="number"
                    className={inputClass()}
                    value={form.timeOveruseThresholdSeconds}
                    onChange={(event) => updateForm({ timeOveruseThresholdSeconds: Number(event.target.value) })}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="lowConfidence">
                  <select
                    className={inputClass()}
                    value={form.reviewCandidateFlags.lowConfidence ? "yes" : "no"}
                    onChange={(event) =>
                      updateForm({
                        reviewCandidateFlags: { ...form.reviewCandidateFlags, lowConfidence: event.target.value === "yes" },
                      })
                    }
                  >
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </Field>
                <Field label="flagged">
                  <select
                    className={inputClass()}
                    value={form.reviewCandidateFlags.flagged ? "yes" : "no"}
                    onChange={(event) =>
                      updateForm({
                        reviewCandidateFlags: { ...form.reviewCandidateFlags, flagged: event.target.value === "yes" },
                      })
                    }
                  >
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </Field>
                <Field label="timeOveruse">
                  <select
                    className={inputClass()}
                    value={form.reviewCandidateFlags.timeOveruse ? "yes" : "no"}
                    onChange={(event) =>
                      updateForm({
                        reviewCandidateFlags: { ...form.reviewCandidateFlags, timeOveruse: event.target.value === "yes" },
                      })
                    }
                  >
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </Field>
              </div>
              <Field label="operatorNote">
                <textarea
                  value={form.operatorNote ?? ""}
                  onChange={(event) => updateForm({ operatorNote: event.target.value })}
                  className="min-h-24 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm outline-none focus:border-[color:var(--primary)]"
                />
              </Field>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <p className={cn("text-caption", status === "error" ? "text-[color:var(--status-red)]" : "text-[color:var(--muted)]")}>
                  {message || "Changes update the in-memory set metadata repository."}
                </p>
                <Button type="button" onClick={saveQuestion} disabled={status === "saving" || !form.questionId || !form.unit}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-5 text-sm text-[color:var(--muted)]">Select a question.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
