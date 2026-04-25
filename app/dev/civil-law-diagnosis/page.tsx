import {
  CIVIL_LAW_DIAGNOSIS_SCENARIO_IDS,
  CIVIL_LAW_SAMPLE_QUESTION_SET,
} from "@/lib/appraisal-first/civil-law/test-fixtures";
import { runAllCivilLawDiagnosisScenarios } from "@/lib/appraisal-first/civil-law/debug-diagnosis";

export default function CivilLawDiagnosisDebugPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto w-full max-w-[860px] px-5 py-10">
        <h1 className="text-h2 font-medium text-[color:var(--foreground-strong)]">Debug disabled</h1>
      </main>
    );
  }

  const snapshots = runAllCivilLawDiagnosisScenarios();

  return (
    <main className="mx-auto w-full max-w-[980px] px-5 py-8 text-[color:var(--foreground)] sm:px-8">
      <header className="mb-8">
        <p className="text-caption text-[color:var(--muted)]">Developer verification</p>
        <h1 className="mt-2 text-h1 font-medium text-[color:var(--foreground-strong)]">
          Civil law diagnosis scenarios
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
          Hidden MVP QA view for rule-engine regression checks. Not linked from production navigation.
        </p>
      </header>

      <section className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5">
        <h2 className="text-base font-medium text-[color:var(--foreground-strong)]">Fixture question set</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {CIVIL_LAW_SAMPLE_QUESTION_SET.map((question) => (
            <div key={question.id} className="rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] px-3 py-2">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">
                {question.number}. {question.id}
              </p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">
                {question.curriculumNodeId} · answer {question.correctChoiceId}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        {snapshots.map((snapshot) => {
          const passed = snapshot.checks.every((check) => check.passed);

          return (
            <section
              key={snapshot.scenarioId}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-caption text-[color:var(--muted)]">{snapshot.scenarioId}</p>
                  <h2 className="mt-1 text-base font-medium text-[color:var(--foreground-strong)]">
                    {snapshot.description}
                  </h2>
                </div>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-caption text-[color:var(--muted-strong)]">
                  {passed ? "pass" : "review"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Metric label="events" value={snapshot.actual.eventCount.toString()} />
                <Metric label="review queue" value={snapshot.actual.reviewQueueCount.toString()} />
                <Metric label="weekly seed" value={snapshot.actual.weeklySeedPresent ? "present" : "absent"} />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <pre className="max-h-72 overflow-auto rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3 text-xs leading-5 text-[color:var(--muted-strong)]">
                  {JSON.stringify(snapshot.actual.events, null, 2)}
                </pre>
                <pre className="max-h-72 overflow-auto rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3 text-xs leading-5 text-[color:var(--muted-strong)]">
                  {JSON.stringify(snapshot.checks, null, 2)}
                </pre>
              </div>
            </section>
          );
        })}
      </div>

      <footer className="mt-6 text-caption text-[color:var(--muted)]">
        Scenarios: {CIVIL_LAW_DIAGNOSIS_SCENARIO_IDS.join(", ")}
      </footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] px-3 py-2">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}
