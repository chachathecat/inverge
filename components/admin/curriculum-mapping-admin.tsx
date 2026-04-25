"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ADMIN_CURRICULUM_SUBJECTS,
  type AdminCurriculumMapping,
  type AdminCurriculumSubjectId,
  type CurriculumMappingListResponse,
} from "@/lib/inverge/admin-curriculum";
import { cn } from "@/lib/utils";

type FormState = Omit<AdminCurriculumMapping, "linkedNodeIds" | "defaultRootCauseTags"> & {
  linkedNodeIdsText: string;
  defaultRootCauseTagsText: string;
};

type SaveResponse = {
  ok: boolean;
  error?: string;
  mapping?: AdminCurriculumMapping;
  list?: CurriculumMappingListResponse;
};

function toFormState(mapping: AdminCurriculumMapping): FormState {
  return {
    ...mapping,
    linkedNodeIdsText: mapping.linkedNodeIds.join(", "),
    defaultRootCauseTagsText: mapping.defaultRootCauseTags.join(", "),
  };
}

function toMappingInput(form: FormState): AdminCurriculumMapping {
  const { linkedNodeIdsText, defaultRootCauseTagsText, ...rest } = form;

  return {
    ...rest,
    linkedNodeIds: linkedNodeIdsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    defaultRootCauseTags: defaultRootCauseTagsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean) as AdminCurriculumMapping["defaultRootCauseTags"],
  };
}

function emptyMapping(subjectId: AdminCurriculumSubjectId): FormState {
  const now = new Date().toISOString();

  return {
    id: "",
    subjectId,
    questionId: "",
    primaryNodeId: "",
    linkedNodeIdsText: "",
    chapterId: "",
    chapterName: "",
    topicId: "",
    topicName: "",
    subtopicId: "",
    subtopicName: "",
    correctChoiceId: "1",
    expectedSeconds: 90,
    difficulty: "medium",
    examWeight: 3,
    reviewWeight: 3,
    coachingWeight: 3,
    testedConceptType: "rule",
    requiresArticleMemory: false,
    requiresCaseLogic: false,
    requiresComparison: false,
    mappingConfidence: "medium",
    defaultRootCauseTagsText: "",
    active: true,
    operatorNote: "",
    createdAt: now,
    updatedAt: now,
  };
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

function inputClass() {
  return "h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 text-sm text-[color:var(--foreground-strong)] outline-none focus:border-[color:var(--primary)]";
}

export function CurriculumMappingAdmin() {
  const [subjectId, setSubjectId] = useState<AdminCurriculumSubjectId>("civil_law");
  const [data, setData] = useState<CurriculumMappingListResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<FormState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMappings() {
      setStatus("loading");
      setMessage("");

      try {
        const response = await fetch(`/api/admin/curriculum-mappings?subjectId=${subjectId}`);
        if (!response.ok) throw new Error("load-failed");

        const nextData = (await response.json()) as CurriculumMappingListResponse;
        if (cancelled) return;

        setData(nextData);
        const first = nextData.mappings[0];
        setSelectedId(first?.id ?? "");
        setForm(first ? toFormState(first) : emptyMapping(subjectId));
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("mapping을 불러오지 못했습니다.");
        }
      }
    }

    void loadMappings();

    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const selectedMapping = useMemo(
    () => data?.mappings.find((mapping) => mapping.id === selectedId) ?? null,
    [data?.mappings, selectedId],
  );

  function selectMapping(mapping: AdminCurriculumMapping) {
    setSelectedId(mapping.id);
    setForm(toFormState(mapping));
    setMessage("");
  }

  function startNewMapping() {
    setSelectedId("");
    setForm(emptyMapping(subjectId));
    setMessage("새 mapping을 작성합니다.");
  }

  async function saveMapping() {
    if (!form) return;

    setStatus("saving");
    setMessage("");

    try {
      const payload = toMappingInput({
        ...form,
        subjectId,
        id: form.id || `${subjectId}:${form.questionId}`,
      });
      const response = await fetch("/api/admin/curriculum-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as SaveResponse;

      if (!response.ok || !result.ok || !result.list || !result.mapping) {
        throw new Error(result.error ?? "save-failed");
      }

      setData(result.list);
      setSelectedId(result.mapping.id);
      setForm(toFormState(result.mapping));
      setStatus("ready");
      setMessage("저장했습니다.");
    } catch {
      setStatus("error");
      setMessage("저장하지 못했습니다.");
    }
  }

  async function setActive(active: boolean) {
    if (!form?.id) return;

    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/admin/curriculum-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-active", subjectId, id: form.id, active }),
      });
      const result = (await response.json()) as SaveResponse;

      if (!response.ok || !result.ok || !result.list || !result.mapping) {
        throw new Error(result.error ?? "active-update-failed");
      }

      setData(result.list);
      setSelectedId(result.mapping.id);
      setForm(toFormState(result.mapping));
      setStatus("ready");
      setMessage(active ? "활성화했습니다." : "비활성화했습니다.");
    } catch {
      setStatus("error");
      setMessage("상태를 바꾸지 못했습니다.");
    }
  }

  function updateForm(next: Partial<FormState>) {
    setForm((current) => (current ? { ...current, ...next } : current));
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
      <header className="border-b border-[var(--border)] pb-6">
        <p className="text-caption font-medium text-[color:var(--muted)]">Admin / Curriculum Mapping</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-h1 font-medium text-[color:var(--foreground-strong)]">Curriculum mapping 보정</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
              문항과 curriculum node 연결을 확인하고, 진단 엔진이 참조할 mapping을 최소 단위로 수정합니다.
            </p>
          </div>
          <select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value as AdminCurriculumSubjectId)}
            className="h-11 rounded-full border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
          >
            {ADMIN_CURRICULUM_SUBJECTS.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section className="grid gap-6 py-6 lg:grid-cols-[280px_1fr_420px]">
        <aside className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Nodes</p>
              <span className="text-caption text-[color:var(--muted)]">{data?.nodes.length ?? 0}</span>
            </div>
            <div className="mt-4 space-y-3">
              {data?.nodes.map((node) => (
                <div key={node.nodeId} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
                  <p className="text-caption text-[color:var(--muted)]">{node.chapterName}</p>
                  <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{node.topicName}</p>
                  <p className="mt-1 text-caption text-[color:var(--muted)]">{node.subtopicName}</p>
                  <p className="mt-2 break-all text-[11px] leading-4 text-[color:var(--muted)]">{node.nodeId}</p>
                  <p className="mt-2 text-caption text-[color:var(--muted)]">
                    active {node.activeQuestionCount} / total {node.totalQuestionCount}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Question connections</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">문항 ID와 primary node 연결을 확인합니다.</p>
            </div>
            <Button type="button" variant="outline" onClick={startNewMapping}>
              <Plus className="mr-2 h-4 w-4" />
              추가
            </Button>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {status === "loading" ? (
              <p className="p-5 text-sm text-[color:var(--muted)]">불러오는 중입니다.</p>
            ) : null}
            {data?.mappings.map((mapping) => (
              <button
                key={mapping.id}
                type="button"
                onClick={() => selectMapping(mapping)}
                className={cn(
                  "grid w-full gap-3 px-5 py-4 text-left transition sm:grid-cols-[150px_1fr_auto]",
                  selectedId === mapping.id ? "bg-[color:var(--primary-soft)]" : "hover:bg-[color:var(--surface-soft)]",
                )}
              >
                <div>
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{mapping.questionId}</p>
                  <p className="mt-1 text-caption text-[color:var(--muted)]">answer {mapping.correctChoiceId}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-[color:var(--foreground-strong)]">{mapping.topicName} / {mapping.subtopicName}</p>
                  <p className="mt-1 break-all text-caption text-[color:var(--muted)]">{mapping.primaryNodeId}</p>
                </div>
                <span
                  className={cn(
                    "self-start rounded-full border px-3 py-1 text-caption",
                    mapping.active
                      ? "border-[color:rgba(60,128,89,0.26)] bg-[color:var(--status-green-soft)] text-[color:var(--foreground-strong)]"
                      : "border-[var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted)]",
                  )}
                >
                  {mapping.active ? "active" : "inactive"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Mapping detail</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">
                {selectedMapping ? `${selectedMapping.questionId} 연결 수정` : "새 mapping"}
              </p>
            </div>
            {form?.id ? (
              <button
                type="button"
                onClick={() => setActive(!form.active)}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-caption text-[color:var(--muted-strong)]"
              >
                {form.active ? "비활성화" : "활성화"}
              </button>
            ) : null}
          </div>

          {form ? (
            <form className="mt-5 space-y-4" onSubmit={(event) => event.preventDefault()}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="questionId">
                  <input className={inputClass()} value={form.questionId} onChange={(event) => updateForm({ questionId: event.target.value })} />
                </Field>
                <Field label="correctChoiceId">
                  <select className={inputClass()} value={form.correctChoiceId} onChange={(event) => updateForm({ correctChoiceId: event.target.value as FormState["correctChoiceId"] })}>
                    {["1", "2", "3", "4", "5"].map((choice) => (
                      <option key={choice} value={choice}>{choice}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="primaryNodeId">
                <input className={inputClass()} value={form.primaryNodeId} onChange={(event) => updateForm({ primaryNodeId: event.target.value })} />
              </Field>
              <Field label="linkedNodeIds">
                <input className={inputClass()} value={form.linkedNodeIdsText} onChange={(event) => updateForm({ linkedNodeIdsText: event.target.value })} placeholder="comma separated" />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="chapterId">
                  <input className={inputClass()} value={form.chapterId} onChange={(event) => updateForm({ chapterId: event.target.value })} />
                </Field>
                <Field label="chapterName">
                  <input className={inputClass()} value={form.chapterName} onChange={(event) => updateForm({ chapterName: event.target.value })} />
                </Field>
                <Field label="topicId">
                  <input className={inputClass()} value={form.topicId} onChange={(event) => updateForm({ topicId: event.target.value })} />
                </Field>
                <Field label="topicName">
                  <input className={inputClass()} value={form.topicName} onChange={(event) => updateForm({ topicName: event.target.value })} />
                </Field>
                <Field label="subtopicId">
                  <input className={inputClass()} value={form.subtopicId} onChange={(event) => updateForm({ subtopicId: event.target.value })} />
                </Field>
                <Field label="subtopicName">
                  <input className={inputClass()} value={form.subtopicName} onChange={(event) => updateForm({ subtopicName: event.target.value })} />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="expectedSeconds">
                  <input type="number" className={inputClass()} value={form.expectedSeconds} onChange={(event) => updateForm({ expectedSeconds: Number(event.target.value) })} />
                </Field>
                <Field label="examWeight">
                  <input type="number" className={inputClass()} value={form.examWeight} onChange={(event) => updateForm({ examWeight: Number(event.target.value) })} />
                </Field>
                <Field label="reviewWeight">
                  <input type="number" className={inputClass()} value={form.reviewWeight} onChange={(event) => updateForm({ reviewWeight: Number(event.target.value) })} />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="difficulty">
                  <select className={inputClass()} value={form.difficulty} onChange={(event) => updateForm({ difficulty: event.target.value as FormState["difficulty"] })}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </Field>
                <Field label="mappingConfidence">
                  <select className={inputClass()} value={form.mappingConfidence} onChange={(event) => updateForm({ mappingConfidence: event.target.value as FormState["mappingConfidence"] })}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </Field>
              </div>

              <Field label="defaultRootCauseTags">
                <input className={inputClass()} value={form.defaultRootCauseTagsText} onChange={(event) => updateForm({ defaultRootCauseTagsText: event.target.value })} placeholder="condition_missing, article_requirement_gap" />
              </Field>
              <Field label="operatorNote">
                <textarea
                  value={form.operatorNote ?? ""}
                  onChange={(event) => updateForm({ operatorNote: event.target.value })}
                  className="min-h-20 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm outline-none focus:border-[color:var(--primary)]"
                />
              </Field>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <p className={cn("text-caption", status === "error" ? "text-[color:var(--status-red)]" : "text-[color:var(--muted)]")}>
                  {message || "저장 후 목록과 node count에 바로 반영됩니다."}
                </p>
                <Button type="button" onClick={saveMapping} disabled={status === "saving" || !form.questionId || !form.primaryNodeId}>
                  <Save className="mr-2 h-4 w-4" />
                  저장
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-5 text-sm text-[color:var(--muted)]">선택된 mapping이 없습니다.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
