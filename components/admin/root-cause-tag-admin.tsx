"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ADMIN_ROOT_CAUSE_SUBJECTS,
  ROOT_CAUSE_GROUPS,
  type AdminRootCauseSubjectId,
  type AdminRootCauseTag,
  type AdminRootCauseTagListResponse,
} from "@/lib/inverge/admin-root-cause-tags";
import { cn } from "@/lib/utils";

type SaveResponse = {
  ok: boolean;
  error?: string;
  tag?: AdminRootCauseTag;
  list?: AdminRootCauseTagListResponse;
};

type RootCauseTagFormState = Omit<AdminRootCauseTag, "tagId"> & {
  tagId: string;
};

function toFormState(tag: AdminRootCauseTag): RootCauseTagFormState {
  return tag;
}

function emptyTag(subjectId: AdminRootCauseSubjectId): RootCauseTagFormState {
  const now = new Date().toISOString();

  return {
    id: "",
    subjectId,
    tagId: "",
    group: "concept_gap",
    category: "concept_gap",
    internalName: "",
    userLabel: "",
    summaryLabel: "",
    reviewPriorityWeight: 50,
    reviewAction: "",
    coachingTemplate: "{topic}",
    isUserVisible: true,
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

export function RootCauseTagAdmin() {
  const [subjectId, setSubjectId] = useState<AdminRootCauseSubjectId>("civil_law");
  const [data, setData] = useState<AdminRootCauseTagListResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<RootCauseTagFormState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTags() {
      setStatus("loading");
      setMessage("");

      try {
        const response = await fetch(`/api/admin/root-cause-tags?subjectId=${subjectId}`);
        if (!response.ok) throw new Error("load-failed");

        const nextData = (await response.json()) as AdminRootCauseTagListResponse;
        if (cancelled) return;

        setData(nextData);
        const first = nextData.tags[0];
        setSelectedId(first?.id ?? "");
        setForm(first ? toFormState(first) : emptyTag(subjectId));
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("tag를 불러오지 못했습니다.");
        }
      }
    }

    void loadTags();

    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const selectedTag = useMemo(() => data?.tags.find((tag) => tag.id === selectedId) ?? null, [data?.tags, selectedId]);

  function selectTag(tag: AdminRootCauseTag) {
    setSelectedId(tag.id);
    setForm(toFormState(tag));
    setMessage("");
  }

  function startNewTag() {
    setSelectedId("");
    setForm(emptyTag(subjectId));
    setMessage("새 tag를 작성합니다.");
  }

  function updateForm(next: Partial<RootCauseTagFormState>) {
    setForm((current) => (current ? { ...current, ...next } : current));
  }

  async function saveTag() {
    if (!form) return;

    setStatus("saving");
    setMessage("");

    try {
      const payload = {
        ...form,
        id: form.id || `${subjectId}:${form.tagId}`,
        subjectId,
        category: form.group,
      };
      const response = await fetch("/api/admin/root-cause-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as SaveResponse;

      if (!response.ok || !result.ok || !result.list || !result.tag) {
        throw new Error(result.error ?? "save-failed");
      }

      setData(result.list);
      setSelectedId(result.tag.id);
      setForm(toFormState(result.tag));
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
      const response = await fetch("/api/admin/root-cause-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-active", subjectId, id: form.id, active }),
      });
      const result = (await response.json()) as SaveResponse;

      if (!response.ok || !result.ok || !result.list || !result.tag) {
        throw new Error(result.error ?? "active-update-failed");
      }

      setData(result.list);
      setSelectedId(result.tag.id);
      setForm(toFormState(result.tag));
      setStatus("ready");
      setMessage(active ? "활성화했습니다." : "비활성화했습니다.");
    } catch {
      setStatus("error");
      setMessage("상태를 바꾸지 못했습니다.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
      <header className="border-b border-[var(--border)] pb-6">
        <p className="text-caption font-medium text-[color:var(--muted)]">Admin / Root-cause tags</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-h1 font-medium text-[color:var(--foreground-strong)]">Root-cause tag 보정</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
              진단 엔진과 review/coaching 문장이 참조하는 태그 문구, 우선순위, 노출 여부를 수정합니다.
            </p>
          </div>
          <select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value as AdminRootCauseSubjectId)}
            className="h-11 rounded-full border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
          >
            {ADMIN_ROOT_CAUSE_SUBJECTS.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section className="grid gap-6 py-6 lg:grid-cols-[260px_1fr_430px]">
        <aside className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Groups</p>
            <div className="mt-4 space-y-2">
              {data?.groups.map((group) => (
                <div key={group.group} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
                  <p className="break-all text-sm font-medium text-[color:var(--foreground-strong)]">{group.group}</p>
                  <p className="mt-1 text-caption text-[color:var(--muted)]">
                    active {group.activeCount} / total {group.totalCount}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Tag list</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">내부명, 사용자 노출명, 우선순위를 확인합니다.</p>
            </div>
            <Button type="button" variant="outline" onClick={startNewTag}>
              <Plus className="mr-2 h-4 w-4" />
              추가
            </Button>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {status === "loading" ? <p className="p-5 text-sm text-[color:var(--muted)]">불러오는 중입니다.</p> : null}
            {data?.tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => selectTag(tag)}
                className={cn(
                  "grid w-full gap-3 px-5 py-4 text-left transition sm:grid-cols-[1fr_92px_auto]",
                  selectedId === tag.id ? "bg-[color:var(--primary-soft)]" : "hover:bg-[color:var(--surface-soft)]",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[color:var(--foreground-strong)]">{tag.internalName}</p>
                  <p className="mt-1 truncate text-caption text-[color:var(--muted)]">{tag.userLabel}</p>
                  <p className="mt-1 break-all text-[11px] leading-4 text-[color:var(--muted)]">{tag.tagId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{tag.reviewPriorityWeight}</p>
                  <p className="text-caption text-[color:var(--muted)]">priority</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[color:var(--muted-strong)]">
                    {tag.isUserVisible ? "public" : "internal"}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px]",
                      tag.active
                        ? "border-[color:rgba(60,128,89,0.26)] bg-[color:var(--status-green-soft)] text-[color:var(--foreground-strong)]"
                        : "border-[var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted)]",
                    )}
                  >
                    {tag.active ? "active" : "inactive"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Tag detail</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">
                {selectedTag ? `${selectedTag.tagId} 수정` : "새 tag"}
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
              <Field label="tagId">
                <input className={inputClass()} value={form.tagId} onChange={(event) => updateForm({ tagId: event.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="group">
                  <select className={inputClass()} value={form.group} onChange={(event) => updateForm({ group: event.target.value as AdminRootCauseTag["group"], category: event.target.value as AdminRootCauseTag["group"] })}>
                    {ROOT_CAUSE_GROUPS.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </Field>
                <Field label="subject">
                  <input className={inputClass()} value={subjectId} disabled />
                </Field>
              </div>
              <Field label="internalName">
                <input className={inputClass()} value={form.internalName} onChange={(event) => updateForm({ internalName: event.target.value })} />
              </Field>
              <Field label="userLabel">
                <input className={inputClass()} value={form.userLabel} onChange={(event) => updateForm({ userLabel: event.target.value })} />
              </Field>
              <Field label="summaryLabel">
                <input className={inputClass()} value={form.summaryLabel} onChange={(event) => updateForm({ summaryLabel: event.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="reviewPriorityWeight">
                  <input type="number" min={0} max={100} className={inputClass()} value={form.reviewPriorityWeight} onChange={(event) => updateForm({ reviewPriorityWeight: Number(event.target.value) })} />
                </Field>
                <Field label="user visible">
                  <select className={inputClass()} value={form.isUserVisible ? "public" : "internal"} onChange={(event) => updateForm({ isUserVisible: event.target.value === "public" })}>
                    <option value="public">public</option>
                    <option value="internal">internal only</option>
                  </select>
                </Field>
              </div>
              <Field label="reviewAction">
                <textarea
                  value={form.reviewAction}
                  onChange={(event) => updateForm({ reviewAction: event.target.value })}
                  className="min-h-20 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm outline-none focus:border-[color:var(--primary)]"
                />
              </Field>
              <Field label="coachingTemplate">
                <textarea
                  value={form.coachingTemplate}
                  onChange={(event) => updateForm({ coachingTemplate: event.target.value })}
                  className="min-h-24 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm outline-none focus:border-[color:var(--primary)]"
                />
              </Field>
              <Field label="operatorNote">
                <textarea
                  value={form.operatorNote ?? ""}
                  onChange={(event) => updateForm({ operatorNote: event.target.value })}
                  className="min-h-16 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm outline-none focus:border-[color:var(--primary)]"
                />
              </Field>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <p className={cn("text-caption", status === "error" ? "text-[color:var(--status-red)]" : "text-[color:var(--muted)]")}>
                  {message || "저장 후 목록과 group count에 바로 반영됩니다."}
                </p>
                <Button type="button" onClick={saveTag} disabled={status === "saving" || !form.tagId || !form.internalName || !form.userLabel}>
                  <Save className="mr-2 h-4 w-4" />
                  저장
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-5 text-sm text-[color:var(--muted)]">선택된 tag가 없습니다.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
