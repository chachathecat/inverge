import type { RepairDomain } from "./safe-repair-loop";

export interface RepairPromptInput {
  repo: string;
  prNumber: number | null;
  repairDomain: RepairDomain;
  repairAllowed: boolean;
  blockedReasons: readonly string[];
  humanApprovalRequired: boolean;
  scopeLimits: readonly string[];
  filesLikelyRelevant: readonly string[];
  filesForbidden: readonly string[];
  domainInstructions: readonly string[];
  validationCommands: readonly string[];
  rollbackSteps: readonly string[];
}

const REPAIR_NON_GOALS = [
  "Do not modify GitHub state, rerun workflows, push commits, open PRs, merge PRs, mark PRs ready, or invoke Codex automatically from AF004.",
  "Do not call learner runtime, OCR, payment, provider, production API, instructor runtime, auth, billing, or GitHub mutation APIs.",
  "Do not implement unrelated learner-facing product work, S209/S210 scope, first-round features, or unsupported exam tracks.",
  "Do not weaken, delete, skip, or lower any existing validation gate or test to make CI green.",
  "Do not broaden the repair beyond the failed domains and files identified by the plan.",
] as const;

const DATA_BOUNDARY_CONSTRAINTS = [
  "Keep all AF004 inputs and outputs metadata-only.",
  "Do not include learner answers, OCR output, official question or answer bodies, source excerpts, provider payloads, billing records, credentials, or private user content.",
  "Do not merge user artifacts into historical-question, reference-answer, source-rights, or evaluation records.",
  "Do not change auth, entitlement, billing, privacy, retention, tenant, or production-secret policy from a repair prompt.",
] as const;

function formatList(values: readonly string[]): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : "- None.";
}

function prLabel(prNumber: number | null): string {
  return prNumber === null ? "unknown PR" : `PR #${prNumber}`;
}

export function repairNonGoals(): readonly string[] {
  return REPAIR_NON_GOALS;
}

export function repairDataBoundaryConstraints(): readonly string[] {
  return DATA_BOUNDARY_CONSTRAINTS;
}

export function buildRepairPrompt(input: RepairPromptInput): string {
  const blockedSection =
    input.blockedReasons.length > 0
      ? ["", "Blocked or human-review reasons:", formatList(input.blockedReasons)]
      : [];

  return [
    `Work on a bounded repair plan for ${input.repo} ${prLabel(input.prNumber)}.`,
    "",
    "Read first:",
    "- AGENTS.md",
    "- docs/agent-factory-ci-watcher.md",
    "- docs/agent-factory-pr-contract-doctor.md",
    "- docs/agent-factory-safe-repair-loop.md",
    "",
    `Repair domain: ${input.repairDomain}`,
    `Repair allowed: ${input.repairAllowed ? "yes" : "no"}`,
    `Human approval required: ${input.humanApprovalRequired ? "yes" : "no"}`,
    ...blockedSection,
    "",
    "Non-goals:",
    formatList(REPAIR_NON_GOALS),
    "",
    "Data-boundary constraints:",
    formatList(DATA_BOUNDARY_CONSTRAINTS),
    "",
    "Scope limits:",
    formatList(input.scopeLimits),
    "",
    "Likely relevant files:",
    formatList(input.filesLikelyRelevant),
    "",
    "Forbidden files and surfaces:",
    formatList(input.filesForbidden),
    "",
    "Repair instructions:",
    formatList(input.domainInstructions),
    "",
    "Validation commands:",
    "Run the focused command first, then the broader validation commands in order.",
    formatList(input.validationCommands),
    "",
    "Rollback steps:",
    formatList(input.rollbackSteps),
    "",
    "Stop condition:",
    input.repairAllowed
      ? "Stop and request human review if the repair requires a forbidden file, runtime policy decision, product-scope change, new dependency, secret, learner data, provider call, migration, or weakened gate."
      : "Do not perform source repair from this prompt. Resolve the blocked or human-review reason first.",
  ].join("\n");
}
