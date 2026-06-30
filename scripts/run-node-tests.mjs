import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const defaultTestFiles = [
  "tests/closed-beta-golden-flow-routes.test.mjs",
  "tests/learner-loop-production-gap-audit.test.mjs",
  "tests/closed-beta-production-readiness-scorecard.test.mjs",
  "tests/closed-beta-manual-qa-runbook.test.mjs",
  "tests/closed-beta-manual-qa-evidence-run.test.mjs",
  "tests/closed-beta-invite-gate.test.mjs",
  "tests/closed-beta-metrics-monitoring-contract.test.mjs",
  "tests/closed-beta-first-cohort-day-0-readiness.test.mjs",
  "tests/closed-beta-first-cohort-day-0-readiness-evidence.test.mjs",
  "tests/closed-beta-first-cohort-operating-report-template.test.mjs",
  "tests/beta-account-durable-target-setup-runbook.test.mjs",
  "tests/provider-disabled-synthetic-image-ocr-smoke-runbook.test.mjs",
  "tests/account-backed-review-completion-setup-runbook.test.mjs",
  "tests/review-completion-runtime-proof.test.mjs",
  "tests/ocr-pdf-capture-maturity-hardening.test.mjs",
  "tests/ocr-pdf-upload-runtime-smoke-proof.test.mjs",
  "tests/answer-submission-ocr-save-contract.test.mjs",
  "tests/durable-persistence-evidence.test.mjs",
  "tests/durable-invited-account-persistence-runtime-proof.test.mjs",
  "tests/learner-loop-runtime-telemetry-wiring.test.mjs",
  "tests/capture-to-note-quality-hardening.test.mjs",
  "tests/capture-to-note-v1.test.mjs",
  "tests/learning-agenda-v0.test.mjs",
  "tests/learner-ui-grammar-consolidation.test.mjs",
  "tests/today-plan-hardening.test.mjs",
  "tests/review-notes-loop-polish.test.mjs",
  "tests/closed-beta-final-pass.test.mjs",
  "tests/closed-beta-dogfood-ux-repair-pass-1.test.mjs",
  "tests/retrieval-review-v1.test.mjs",
  "tests/capture-concept-node-mapping-v1.test.mjs",
  "tests/calculator-routine-trainer-v1.test.mjs",
  "tests/today-plan-source-reasoning.test.mjs",
  "tests/review-queue-reflection-hardening.test.mjs",
  "tests/learner-loop-telemetry.test.mjs",
  "tests/legal-source-ingest.test.mjs",
  "tests/legal-retrieval.test.mjs",
  "tests/legal-concept-anchor-seed.test.mjs",
  "tests/legal-grounding-guard.test.mjs",
  "tests/legal-anchor-verification-report.test.mjs",
  "tests/legal-anchor-verification-apply.test.mjs",
  "tests/capture-legal-grounding-hook.test.mjs",
  "tests/official-syllabus-registry.test.mjs",
  "tests/dabangil-premium-alignment.test.mjs",
  "tests/qnet-historical-materials-batch-plan.test.mjs",
  "tests/qnet-official-materials-reference.test.mjs",
  "tests/qnet-reference-intelligence-report.test.mjs",
  "tests/second-round-source-rights-registry.test.mjs",
  "tests/second-round-question-registry.test.mjs",
  "tests/second-round-reference-answer-package-registry.test.mjs",
  "tests/rewrite-regrade-history-contract.test.mjs",
  "tests/agent-factory-contract-validation.test.mjs",
  "tests/agent-factory-risk-classification.test.mjs",
  "tests/agent-factory-glob-match.test.mjs",
  "tests/agent-factory-runtime-gate.test.mjs",
  "tests/agent-factory-roadmap-runner.test.mjs",
  "tests/agent-factory-ci-watcher.test.mjs",
  "tests/agent-factory-pr-contract-doctor.test.mjs",
  "tests/agent-factory-safe-repair-loop.test.mjs",
  "tests/agent-factory-rebase-merge-orchestrator.test.mjs",
  "tests/agent-factory-github-actions-button.test.mjs",
  "tests/agent-factory-live-github-readonly.test.mjs",
  "tests/agent-factory-admin-dashboard.test.mjs",
  "tests/agent-factory-safe-mutation-gate.test.mjs",
  "tests/agent-factory-codex-invocation-adapter.test.mjs",
  "tests/agent-factory-run-history.test.mjs",
  "tests/agent-factory-orchestrator.test.mjs",
];
const rawArgs = process.argv.slice(2);
const nodeTestArgs = [];
const requestedFiles = [];

for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];
  if (arg === "--workers") {
    const value = rawArgs[index + 1] ?? "1";
    nodeTestArgs.push(`--test-concurrency=${value}`);
    index += 1;
  } else if (arg.startsWith("--workers=")) {
    nodeTestArgs.push(`--test-concurrency=${arg.slice("--workers=".length)}`);
  } else if (arg.startsWith("tests/") || arg.endsWith(".test.mjs")) {
    requestedFiles.push(arg);
  } else {
    nodeTestArgs.push(arg);
  }
}

const testFiles = requestedFiles.length > 0 ? requestedFiles : defaultTestFiles;
const missingFiles = testFiles.filter((file) => !existsSync(file));

if (missingFiles.length > 0) {
  console.error(`[run-node-tests] Missing test file(s): ${missingFiles.join(", ")}`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-extension-loader.mjs",
    "--test",
    ...nodeTestArgs,
    ...testFiles,
  ],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
