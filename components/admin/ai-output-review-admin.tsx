"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AdminAiReviewItem, AdminAiReviewListResponse, AdminAiReviewStatus } from "@/lib/inverge/admin-ai-review";
import { cn } from "@/lib/utils";

type SaveResponse = {
  ok: boolean;
  error?: string;
  item?: AdminAiReviewItem;
  list?: AdminAiReviewListResponse;
};

function badgeClass(status: AdminAiReviewStatus) {
  if (status === "ok") return "border-[color:rgba(60,128,89,0.26)] bg-[color:var(--status-green-soft)] text-[color:var(--foreground-strong)]";
  if (status === "flagged") return "border-[color:rgba(168,94,60,0.24)] bg-[color:rgba(168,94,60,0.12)] text-[color:var(--foreground-strong)]";
  if (status === "failed") return "border-[color:rgba(156,71,71,0.2)] bg-[color:rgba(156,71,71,0.12)] text-[color:var(--foreground-strong)]";
  return "border-[var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted-strong)]";
}

function inputClass() {
  return "h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 text-sm text-[color:var(--foreground-strong)] outline-none focus:border-[color:var(--primary)]";
}

function textareaClass(minHeight = "min-h-24") {
  return `${minHeight} w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm leading-6 text-[color:var(--foreground-strong)] outline-none focus:border-[color:var(--primary)]`;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-caption font-medium text-[color:var(--muted)]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function readPublicText(item: AdminAiReviewItem) {
  const publicText = item.aiOutput.publicText;

  if (item.screen === "compare") {
    return [
      ["gapTitle", publicText.gapTitle ?? "Fallback used"],
      ["gapSummary", publicText.gapSummary ?? "Fallback used"],
      ["rewriteInstruction", publicText.rewriteInstruction ?? "Fallback used"],
    ] as const;
  }

  return [
    ["guidance", (publicText.guidance ?? []).join("\n") || "Fallback used"],
    ["placeholder", publicText.placeholder ?? "Fallback used"],
    ["starter", publicText.starter ?? "Fallback used"],
  ] as const;
}

export function AiOutputReviewAdmin() {
  const [screen, setScreen] = useState<"all" | "compare" | "rewrite">("all");
  const [data, setData] = useState<AdminAiReviewListResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [needsReview, setNeedsReview] = useState(true);
  const [flagged, setFlagged] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      setStatus("loading");
      setMessage("");

      try {
        const params = new URLSearchParams();
        if (screen !== "all") params.set("screen", screen);
        const response = await fetch(`/api/admin/ai-outputs${params.toString() ? `?${params.toString()}` : ""}`);
        if (!response.ok) throw new Error("load-failed");

        const nextData = (await response.json()) as AdminAiReviewListResponse;
        if (cancelled) return;

        const first = nextData.items[0];
        setData(nextData);
        setSelectedId(first?.id ?? "");
        setReviewerNote(first?.reviewerNote ?? "");
        setNeedsReview(first?.needsReview ?? true);
        setFlagged(first?.flagged ?? false);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not load AI output logs.");
        }
      }
    }

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [screen]);

  const selectedItem = useMemo(() => data?.items.find((item) => item.id === selectedId) ?? null, [data?.items, selectedId]);

  function selectItem(item: AdminAiReviewItem) {
    setSelectedId(item.id);
    setReviewerNote(item.reviewerNote ?? "");
    setNeedsReview(item.needsReview);
    setFlagged(item.flagged);
    setMessage("");
  }

  async function saveNote() {
    if (!selectedItem) return;

    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/admin/ai-outputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedItem.id,
          reviewerNote,
          needsReview,
          flagged,
        }),
      });
      const result = (await response.json()) as SaveResponse;

      if (!response.ok || !result.ok || !result.list || !result.item) {
        throw new Error(result.error ?? "save-failed");
      }

      setData(result.list);
      setSelectedId(result.item.id);
      setReviewerNote(result.item.reviewerNote ?? "");
      setNeedsReview(result.item.needsReview);
      setFlagged(result.item.flagged);
      setStatus("ready");
      setMessage("Saved.");
    } catch {
      setStatus("error");
      setMessage("Could not save review note.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <header className="border-b border-[var(--border)] pb-6">
        <p className="text-caption font-medium text-[color:var(--muted)]">Admin / AI outputs</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-h1 font-medium text-[color:var(--foreground-strong)]">AI output review</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
              Review recent compare/rewrite enhancement outputs against the rule result. Notes stay internal to admin.
            </p>
          </div>
          <select
            value={screen}
            onChange={(event) => setScreen(event.target.value as typeof screen)}
            className="h-11 rounded-full border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
          >
            <option value="all">All screens</option>
            <option value="compare">Compare</option>
            <option value="rewrite">Rewrite</option>
          </select>
        </div>
      </header>

      <section className="grid gap-6 py-6 lg:grid-cols-[280px_1fr_360px]">
        <aside className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Recent status</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3">
                <p className="text-caption text-[color:var(--muted)]">Total</p>
                <p className="mt-1 font-medium text-[color:var(--foreground-strong)]">{data?.summary.totalCount ?? 0}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3">
                  <p className="text-caption text-[color:var(--muted)]">Fallback</p>
                  <p className="mt-1 font-medium text-[color:var(--foreground-strong)]">{data?.summary.fallbackCount ?? 0}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3">
                  <p className="text-caption text-[color:var(--muted)]">Flagged</p>
                  <p className="mt-1 font-medium text-[color:var(--foreground-strong)]">{data?.summary.flaggedCount ?? 0}</p>
                </div>
              </div>
              <p className="text-caption leading-5 text-[color:var(--muted)]">
                Focus on fallback and flagged items first. The comparison view shows rule text beside AI text.
              </p>
            </div>
          </div>
        </aside>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Recent outputs</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">Rule result and AI enhancement are shown side by side.</p>
            </div>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {status === "loading" ? <p className="p-5 text-sm text-[color:var(--muted)]">Loading outputs.</p> : null}
            {data?.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(item)}
                className={cn(
                  "grid w-full gap-3 px-5 py-4 text-left transition sm:grid-cols-[1fr_auto]",
                  selectedId === item.id ? "bg-[color:var(--primary-soft)]" : "hover:bg-[color:var(--surface-soft)]",
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[color:var(--foreground-strong)]">
                      {item.screen} / {item.subjectId}
                    </p>
                    <span className={cn("rounded-full border px-2.5 py-1 text-[11px]", badgeClass(item.status))}>{item.status}</span>
                    {item.fallbackUsed ? (
                      <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[color:var(--muted-strong)]">
                        fallback
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-sm text-[color:var(--muted-strong)]">{item.ruleResult.focusLabel}</p>
                  <p className="mt-1 truncate text-caption text-[color:var(--muted)]">
                    {item.errorReason || item.validationFailureCodes.join(", ") || item.provider}
                  </p>
                </div>
                <div className="text-right text-caption text-[color:var(--muted)]">{new Date(item.createdAt).toLocaleString("ko-KR")}</div>
              </button>
            ))}
          </div>

          {selectedItem ? (
            <div className="grid gap-0 border-t border-[var(--border)] lg:grid-cols-2">
              <section className="border-b border-[var(--border)] px-5 py-5 lg:border-b-0 lg:border-r">
                <p className="text-caption font-medium text-[color:var(--muted)]">Rule result</p>
                <div className="mt-4 space-y-4 text-sm">
                  <div>
                    <p className="text-caption text-[color:var(--muted)]">gapTitle</p>
                    <p className="mt-1 leading-6 text-[color:var(--foreground-strong)]">{selectedItem.ruleResult.gapTitle || "None"}</p>
                  </div>
                  <div>
                    <p className="text-caption text-[color:var(--muted)]">gapSummary</p>
                    <p className="mt-1 leading-6 text-[color:var(--foreground-strong)]">{selectedItem.ruleResult.gapSummary || "None"}</p>
                  </div>
                  {selectedItem.screen === "compare" ? (
                    <div>
                      <p className="text-caption text-[color:var(--muted)]">rewriteInstruction</p>
                      <p className="mt-1 leading-6 text-[color:var(--foreground-strong)]">{selectedItem.ruleResult.rewriteInstruction || "None"}</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-caption text-[color:var(--muted)]">guidance</p>
                        <ul className="mt-2 space-y-2">
                          {(selectedItem.ruleResult.guidance ?? []).map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="mt-[10px] h-1 w-1 rounded-full bg-[color:var(--muted)]" />
                              <span className="leading-6 text-[color:var(--foreground-strong)]">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-caption text-[color:var(--muted)]">placeholder</p>
                        <p className="mt-1 leading-6 text-[color:var(--foreground-strong)]">{selectedItem.ruleResult.placeholder || "None"}</p>
                      </div>
                      <div>
                        <p className="text-caption text-[color:var(--muted)]">starter</p>
                        <p className="mt-1 leading-6 text-[color:var(--foreground-strong)]">{selectedItem.ruleResult.starter || "None"}</p>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="px-5 py-5">
                <p className="text-caption font-medium text-[color:var(--muted)]">AI output</p>
                <div className="mt-4 space-y-4 text-sm">
                  {readPublicText(selectedItem).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-caption text-[color:var(--muted)]">{label}</p>
                      <p className="mt-1 whitespace-pre-wrap leading-6 text-[color:var(--foreground-strong)]">{value}</p>
                    </div>
                  ))}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-caption text-[color:var(--muted)]">validation</p>
                      <p className="mt-1 leading-6 text-[color:var(--foreground-strong)]">
                        {selectedItem.validationFailureCodes.join(", ") || "None"}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-[color:var(--muted)]">safety flags</p>
                      <p className="mt-1 leading-6 text-[color:var(--foreground-strong)]">
                        {selectedItem.aiOutput.safetyFlags.join(", ") || "None"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </section>

        <aside className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5">
          <div>
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Review note</p>
            <p className="mt-1 text-caption text-[color:var(--muted)]">
              Mark whether this output still needs attention and keep a short internal note.
            </p>
          </div>

          {selectedItem ? (
            <form className="mt-5 space-y-4" onSubmit={(event) => event.preventDefault()}>
              <Field label="status">
                <input className={inputClass()} value={`${selectedItem.status} / ${selectedItem.provider}`} disabled />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="needs review">
                  <select className={inputClass()} value={needsReview ? "yes" : "no"} onChange={(event) => setNeedsReview(event.target.value === "yes")}>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </Field>
                <Field label="flagged">
                  <select className={inputClass()} value={flagged ? "yes" : "no"} onChange={(event) => setFlagged(event.target.value === "yes")}>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </Field>
              </div>
              <Field label="reviewer note">
                <textarea value={reviewerNote} onChange={(event) => setReviewerNote(event.target.value)} className={textareaClass("min-h-32")} />
              </Field>
              <div className="border-t border-[var(--border)] pt-4">
                <p className={cn("mb-3 text-caption", status === "error" ? "text-[color:var(--status-red)]" : "text-[color:var(--muted)]")}>
                  {message || "Notes are stored in the in-memory admin review repository."}
                </p>
                <Button type="button" onClick={saveNote} disabled={status === "saving"}>
                  <Save className="mr-2 h-4 w-4" />
                  Save note
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-5 text-sm text-[color:var(--muted)]">Select an output.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
