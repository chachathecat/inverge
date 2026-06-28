import { loadAgentFactoryDashboardReport } from "@/lib/agent-factory/dashboard-report";
import type { ReactNode } from "react";

import { AdminAccessDeniedPanel, hasAdminPageAccess } from "../admin-access";

export const dynamic = "force-dynamic";

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-medium text-[color:var(--muted)]">
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2">
      <dt className="text-[11px] font-medium uppercase text-[color:var(--muted)]">{label}</dt>
      <dd className="mt-1 text-sm text-[color:var(--foreground-strong)]">{value}</dd>
    </div>
  );
}

function ListBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase text-[color:var(--muted)]">{label}</p>
      {values.length === 0 ? (
        <p className="mt-2 rounded-md border border-dashed border-[color:var(--border)] px-3 py-2 text-sm text-[color:var(--muted)]">
          None reported.
        </p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm text-[color:var(--foreground)]">
          {values.map((value) => (
            <li key={value} className="rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2">
              {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-sm text-[color:var(--muted)]">
      {children}
    </p>
  );
}

export default async function AdminFactoryPage() {
  if (!(await hasAdminPageAccess())) return <AdminAccessDeniedPanel />;

  const report = loadAgentFactoryDashboardReport();

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <section className="border-b border-[color:var(--border)] pb-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[color:var(--muted)]">Internal development operations</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-[color:var(--foreground-strong)]">
              Agent Factory
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
              Read-only/report-only dashboard for AF001-AF007 generated artifacts. It reads local metadata reports and
              does not fetch live data or execute work.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill>read-only/report-only</StatusPill>
            <StatusPill>{report.safetyStatus}</StatusPill>
            <StatusPill>last updated: {report.lastUpdatedAt ?? "unavailable"}</StatusPill>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase text-[color:var(--muted)]">AF001</p>
              <h2 className="mt-1 text-xl font-semibold text-[color:var(--foreground-strong)]">Next work package</h2>
            </div>
            <StatusPill>{report.nextWorkPackage.status}</StatusPill>
          </div>
          <div className="mt-5 space-y-4">
            {report.nextWorkPackage.items.length === 0 ? (
              <EmptyState>{report.nextWorkPackage.emptyState}</EmptyState>
            ) : (
              report.nextWorkPackage.items.map((item) => (
                <div key={item.itemId} className="rounded-md border border-[color:var(--border)] bg-[color:var(--background)] p-4">
                  <p className="text-sm font-semibold text-[color:var(--foreground-strong)]">
                    {item.itemId} - {item.itemTitle}
                  </p>
                  <dl className="mt-4 grid gap-3 md:grid-cols-2">
                    <Field label="Branch suggestion" value={item.branchSuggestion} />
                    <Field label="Codex prompt" value={item.codexPromptAvailable ? "available" : "missing"} />
                  </dl>
                  <p className="mt-4 text-[11px] font-medium uppercase text-[color:var(--muted)]">
                    Worktree command
                  </p>
                  <pre className="mt-2 overflow-x-auto rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-xs text-[color:var(--foreground)]">
                    {item.worktreeCommand}
                  </pre>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase text-[color:var(--muted)]">AF006</p>
              <h2 className="mt-1 text-xl font-semibold text-[color:var(--foreground-strong)]">Actions button instructions</h2>
            </div>
            <StatusPill>operator guide</StatusPill>
          </div>
          <p className="mt-5 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 font-mono text-sm text-[color:var(--foreground)]">
            {report.actionsButton.operatorPath}
          </p>
          <div className="mt-5 grid gap-2">
            {report.actionsButton.recommendedModes.map((mode) => (
              <div key={mode.mode} className="flex items-center justify-between rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm">
                <code>{mode.mode}</code>
                <span className="text-[color:var(--muted)]">
                  {mode.requiresPrNumber ? "requires pr_number" : "pr_number may be empty"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
            Live modes require <code>pr_number</code>. Non-live <code>plan_only</code> may leave <code>pr_number</code>{" "}
            empty.
          </p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase text-[color:var(--muted)]">AF002</p>
              <h2 className="mt-1 text-xl font-semibold text-[color:var(--foreground-strong)]">PR/CI watcher</h2>
            </div>
            <StatusPill>{report.prCiWatcher.status}</StatusPill>
          </div>
          {report.prCiWatcher.status !== "available" ? (
            <div className="mt-5">
              <EmptyState>{report.prCiWatcher.emptyState}</EmptyState>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <dl className="grid gap-3 md:grid-cols-2">
                <Field label="PR" value={report.prCiWatcher.prNumber} />
                <Field label="PR state" value={report.prCiWatcher.prState} />
                <Field label="Workflow state" value={report.prCiWatcher.workflowState} />
                <Field label="Check summary" value={report.prCiWatcher.workflowSummary} />
              </dl>
              <ListBlock label="Failed domains" values={report.prCiWatcher.failedDomains} />
              <ListBlock label="Pending domains" values={report.prCiWatcher.pendingDomains} />
              <ListBlock label="Skipped domains" values={report.prCiWatcher.skippedDomains} />
              <ListBlock label="Recommended next actions" values={report.prCiWatcher.recommendedNextActions} />
            </div>
          )}
        </section>

        <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase text-[color:var(--muted)]">AF003</p>
              <h2 className="mt-1 text-xl font-semibold text-[color:var(--foreground-strong)]">PR body contract</h2>
            </div>
            <StatusPill>{report.prBodyDoctor.status}</StatusPill>
          </div>
          {report.prBodyDoctor.status !== "available" ? (
            <div className="mt-5">
              <EmptyState>{report.prBodyDoctor.emptyState}</EmptyState>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <dl className="grid gap-3 md:grid-cols-2">
                <Field label="Valid after repair" value={report.prBodyDoctor.validAfter} />
                <Field label="Issue reference" value={report.prBodyDoctor.issueReference} />
                <Field
                  label="Sanitized repaired artifact"
                  value={report.prBodyDoctor.repairedBodyArtifactAvailable ? "available" : "missing"}
                />
              </dl>
              <ListBlock label="Remaining warnings" values={report.prBodyDoctor.remainingWarnings} />
            </div>
          )}
        </section>

        <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase text-[color:var(--muted)]">AF004</p>
              <h2 className="mt-1 text-xl font-semibold text-[color:var(--foreground-strong)]">Repair plan</h2>
            </div>
            <StatusPill>{report.repairPlan.status}</StatusPill>
          </div>
          {report.repairPlan.status !== "available" ? (
            <div className="mt-5">
              <EmptyState>{report.repairPlan.emptyState}</EmptyState>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <dl className="grid gap-3 md:grid-cols-2">
                <Field label="Repair domain" value={report.repairPlan.repairDomain} />
                <Field label="Repair allowed" value={report.repairPlan.repairAllowed} />
                <Field label="Human approval required" value={report.repairPlan.humanApprovalRequired} />
              </dl>
              <ListBlock label="Validation commands" values={report.repairPlan.validationCommands} />
              <ListBlock label="Blocked reasons" values={report.repairPlan.blockedReasons} />
            </div>
          )}
        </section>

        <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase text-[color:var(--muted)]">AF005</p>
              <h2 className="mt-1 text-xl font-semibold text-[color:var(--foreground-strong)]">Merge plan</h2>
            </div>
            <StatusPill>{report.mergePlan.status}</StatusPill>
          </div>
          {report.mergePlan.status !== "available" ? (
            <div className="mt-5">
              <EmptyState>{report.mergePlan.emptyState}</EmptyState>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <dl className="grid gap-3 md:grid-cols-2">
                <Field label="Merge readiness" value={report.mergePlan.mergeReadiness} />
                <Field label="Approval gate" value={report.mergePlan.approvalGate} />
                <Field label="Rebase required" value={report.mergePlan.rebaseRequired} />
                <Field label="Merge candidate" value={report.mergePlan.mergeCandidate} />
              </dl>
              <ListBlock label="Blocked reasons" values={report.mergePlan.blockedReasons} />
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase text-[color:var(--muted)]">Safety</p>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--foreground-strong)]">Dashboard v1 boundary</h2>
          </div>
          <StatusPill>no mutation</StatusPill>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <ListBlock label="Safety panel" values={report.safetyPanel} />
          <ListBlock label="Data boundary" values={report.dataBoundary} />
        </div>
      </section>
    </main>
  );
}
