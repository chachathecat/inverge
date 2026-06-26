import type {
  BlockedReason,
  RoadmapRunnerPlan,
  RoadmapSelectedItem,
} from "./roadmap-runner";

export interface CodexTaskPackage {
  itemId: string;
  itemTitle: string;
  readinessStatus: "ready";
  blockedReasons: BlockedReason[];
  dependencies: string[];
  branchName: string;
  worktreePathSuggestion: string;
  powershellCommands: string[];
  codexPrompt: string;
  prBodyTemplate: string;
  validationCommands: string[];
  mergeOrderNotes: string[];
  dataBoundaryNotes: string[];
  riskNotes: string[];
}

export interface CodexTaskFactoryOutput {
  version: 1;
  source: {
    roadmapPath: string;
    programId: string | null;
    completionItem: string | null;
    wipLimit: number;
    wipOccupiedCount: number;
    availableSlots: number;
    selectionSlots: number;
  };
  selectedTaskCount: number;
  selectedItemIds: string[];
  readyItemIds: string[];
  blockedItemIds: string[];
  packages: CodexTaskPackage[];
  safety: {
    metadataOnly: true;
    mutatesRuntimeState: false;
    mutatesGitHub: false;
    nonGoals: string[];
    dataBoundaryNotes: string[];
  };
}

export interface CodexTaskFactoryOptions {
  roadmapPath?: string;
  repository?: string;
}

const REQUIRED_PR_HEADINGS = [
  "## Goal",
  "## Non-goals",
  "## Risk classification",
  "## Data boundary",
  "## Schema / API / environment changes",
  "## Tests and evidence",
  "## Runtime evidence",
  "## Rollout and rollback",
  "## Remaining risks",
  "## Merge recommendation",
] as const;

const VALIDATION_COMMANDS = [
  "npm.cmd run typecheck",
  "npm.cmd run lint",
  "npm.cmd run test -- --workers=1",
  "npm.cmd run verify:learner-loop:ci",
  "npm.cmd run check:closed-beta-readiness",
  "npm.cmd run build",
  "git diff --check",
  "git diff --cached --check",
] as const;

const DEFAULT_DATA_BOUNDARY_NOTES = [
  "Keep this package metadata-only until the linked issue explicitly approves runtime behavior.",
  "Do not place learner answers, OCR output, official question or answer bodies, source excerpts, provider payloads, billing records, credentials, or private user content in generated artifacts.",
  "Preserve separate states for official source rights, problem-text verification, and reference-answer verification.",
  "Do not weaken auth, entitlement, privacy, retention, or tenant-boundary controls.",
] as const;

const DEFAULT_NON_GOALS = [
  "Do not broaden learner-facing scope beyond 감정평가사 2차 실무, 이론, 법규.",
  "Do not surface first-round, other-exam, pass-probability, official-grading, official-model-answer, or pass-guarantee claims.",
  "Do not call payment, provider, OCR, learner runtime, instructor runtime, production API, or GitHub mutation APIs unless the linked issue explicitly requires that surface.",
  "Do not change unrelated roadmap items, billing policy, auth policy, privacy policy, or production secrets.",
] as const;

const FORBIDDEN_OUTPUT_KEY_PATTERNS = [
  /secret/i,
  /token/i,
  /password/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /service[_-]?role/i,
  /cookie/i,
  /session/i,
  /raw.*answer/i,
  /ocr.*text/i,
  /problem.*text/i,
  /question.*body/i,
  /answer.*body/i,
  /source.*excerpt/i,
  /provider.*payload/i,
  /billing.*data/i,
  /private.*user.*content/i,
] as const;

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function branchSlug(item: RoadmapSelectedItem): string {
  const titleSlug = slugify(item.itemTitle);
  return slugify(`${item.itemId}-${titleSlug}`);
}

function mergeRecommendationCheckboxes(): string {
  return [
    "- [ ] Auto-merge candidate",
    "- [x] Human approval required",
    "- [ ] Blocked",
  ].join("\n");
}

function riskNotesFor(item: RoadmapSelectedItem): string[] {
  const notes = [`Roadmap risk: ${item.risk}.`];

  if (item.risk === "high") {
    notes.push("Human approval is required before merge; high-risk roadmap work is never an auto-merge candidate.");
  }

  if (item.lockGroup) {
    notes.push(`Lock group: ${item.lockGroup}. Do not run concurrent work in the same lock group.`);
  }

  return notes;
}

function buildPowerShellCommands(branchName: string, worktreePathSuggestion: string): string[] {
  return [
    "git fetch origin main",
    `git worktree add "${worktreePathSuggestion}" -b "${branchName}" origin/main`,
    `Set-Location "${worktreePathSuggestion}"`,
    "npm.cmd install",
  ];
}

function formatList(values: readonly string[]): string {
  if (values.length === 0) return "- None.";
  return values.map((value) => `- ${value}`).join("\n");
}

function buildCodexPrompt(
  item: RoadmapSelectedItem,
  branchName: string,
  repository: string,
): string {
  return [
    `Work on roadmap item ${item.itemId}: ${item.itemTitle}`,
    "",
    `Repository: ${repository}`,
    `Recommended branch: ${branchName}`,
    "Start from latest origin/main in a clean worktree.",
    "",
    "Read first:",
    "- AGENTS.md",
    "- roadmap/active-program.yml",
    "- docs/inverge-second-round-final-product-spec.md",
    "- docs/dabangil-second-exam-premium-os.md",
    "",
    "Goal:",
    `Implement the focused work package for ${item.itemId} only. Keep the PR reviewable and link exactly one GitHub issue with Closes #<issue-number> or Fixes #<issue-number>.`,
    "",
    "Dependencies:",
    formatList(item.dependencies),
    "",
    "Non-goals:",
    formatList(DEFAULT_NON_GOALS),
    "",
    "Data boundary reminders:",
    formatList(DEFAULT_DATA_BOUNDARY_NOTES),
    "",
    "Required validation checklist:",
    formatList(VALIDATION_COMMANDS),
    "",
    "PR body:",
    "Use the repository PR Contract headings exactly and keep Human approval required unless a human explicitly changes the merge recommendation.",
  ].join("\n");
}

function buildPrBodyTemplate(item: RoadmapSelectedItem): string {
  return [
    "## Goal",
    "",
    "Closes #<issue-number>",
    "",
    `Implement ${item.itemId}: ${item.itemTitle}.`,
    "",
    "## Non-goals",
    "",
    formatList(DEFAULT_NON_GOALS),
    "",
    "## Risk classification",
    "",
    `- Risk: [${item.risk}]`,
    `- Roadmap item: ${item.itemId}`,
    "",
    "## Data boundary",
    "",
    formatList(DEFAULT_DATA_BOUNDARY_NOTES),
    "",
    "## Schema / API / environment changes",
    "",
    "- Record intended schema, API, route, environment, or persistence changes here.",
    "- Use `None.` when the package stays source-level only.",
    "",
    "## Tests and evidence",
    "",
    formatList(VALIDATION_COMMANDS),
    "",
    "## Runtime evidence",
    "",
    "- Required: state whether runtime evidence is required by risk classification.",
    "- Result: document runtime validation or explain why source-level evidence is sufficient.",
    "- Artifact: link or describe the validation artifact.",
    "",
    "## Rollout and rollback",
    "",
    "- Rollout: merge the focused PR after required checks pass.",
    "- Rollback: focused revert of this PR unless the implementation adds an approved migration or runtime gate.",
    "",
    "## Remaining risks",
    "",
    "- Update with unresolved source, runtime, quality, cost, or data-boundary risks before review.",
    "",
    "## Merge recommendation",
    "",
    mergeRecommendationCheckboxes(),
  ].join("\n");
}

function buildMergeOrderNotes(item: RoadmapSelectedItem, orderedItems: RoadmapSelectedItem[]): string[] {
  if (orderedItems.length < 2) {
    return ["No concurrent selected roadmap status conflict detected."];
  }

  const order = orderedItems.map((selectedItem) => selectedItem.itemId).join(" -> ");
  const index = orderedItems.findIndex((selectedItem) => selectedItem.itemId === item.itemId);
  const prior = orderedItems.slice(0, index).map((selectedItem) => selectedItem.itemId);

  const notes = [
    `Selected packages all touch roadmap/active-program.yml for status tracking; merge and rebase in priority order: ${order}.`,
  ];

  if (prior.length > 0) {
    notes.push(
      `Before final review, rebase this branch after ${prior.join(", ")} merges and resolve roadmap/active-program.yml status conflicts.`,
    );
  } else {
    notes.push("Merge this package first, then rebase later selected packages before their roadmap status edits land.");
  }

  return notes;
}

function packageForItem(
  item: RoadmapSelectedItem,
  orderedItems: RoadmapSelectedItem[],
  repository: string,
): CodexTaskPackage {
  const slug = branchSlug(item);
  const branchName = `feat/${slug}`;
  const worktreePathSuggestion = `..\\worktrees\\${slug}`;

  return {
    itemId: item.itemId,
    itemTitle: item.itemTitle,
    readinessStatus: item.readinessStatus,
    blockedReasons: item.blockedReasons,
    dependencies: item.dependencies,
    branchName,
    worktreePathSuggestion,
    powershellCommands: buildPowerShellCommands(branchName, worktreePathSuggestion),
    codexPrompt: buildCodexPrompt(item, branchName, repository),
    prBodyTemplate: buildPrBodyTemplate(item),
    validationCommands: [...VALIDATION_COMMANDS],
    mergeOrderNotes: buildMergeOrderNotes(item, orderedItems),
    dataBoundaryNotes: [...DEFAULT_DATA_BOUNDARY_NOTES],
    riskNotes: riskNotesFor(item),
  };
}

export function createCodexTaskFactoryOutput(
  roadmapPlan: RoadmapRunnerPlan,
  options: CodexTaskFactoryOptions = {},
): CodexTaskFactoryOutput {
  const repository = options.repository ?? "chachathecat/inverge";

  const output: CodexTaskFactoryOutput = {
    version: 1,
    source: {
      roadmapPath: options.roadmapPath ?? "roadmap/active-program.yml",
      programId: roadmapPlan.programId,
      completionItem: roadmapPlan.completionItem,
      wipLimit: roadmapPlan.wipLimit,
      wipOccupiedCount: roadmapPlan.wipOccupiedCount,
      availableSlots: roadmapPlan.availableSlots,
      selectionSlots: roadmapPlan.selectionSlots,
    },
    selectedTaskCount: roadmapPlan.selectedItems.length,
    selectedItemIds: roadmapPlan.selectedItemIds,
    readyItemIds: roadmapPlan.readyItemIds,
    blockedItemIds: roadmapPlan.blockedItemIds,
    packages: roadmapPlan.selectedItems.map((item) =>
      packageForItem(item, roadmapPlan.selectedItems, repository),
    ),
    safety: {
      metadataOnly: true,
      mutatesRuntimeState: false,
      mutatesGitHub: false,
      nonGoals: [...DEFAULT_NON_GOALS],
      dataBoundaryNotes: [...DEFAULT_DATA_BOUNDARY_NOTES],
    },
  };

  assertPlannerOutputSafe(output);
  return output;
}

export function buildTaskFactoryMarkdown(output: CodexTaskFactoryOutput): string {
  const lines = [
    "# Codex Task Factory Plan",
    "",
    `Roadmap: ${output.source.roadmapPath}`,
    `Program: ${output.source.programId ?? "unknown"}`,
    `WIP: ${output.source.wipOccupiedCount}/${output.source.wipLimit}`,
    `Selected packages: ${output.selectedTaskCount}`,
    "",
    "## Safety",
    "",
    "- Metadata-only planner output.",
    "- No runtime, GitHub, provider, payment, auth, or learner data mutation.",
    "- Generated branch and worktree commands are suggestions only.",
    "",
  ];

  if (output.packages.length === 0) {
    lines.push("## Selected Work", "", "No ready roadmap item is currently selectable.", "");
    return lines.join("\n");
  }

  for (const taskPackage of output.packages) {
    lines.push(
      `## ${taskPackage.itemId} ${taskPackage.itemTitle}`,
      "",
      `Readiness: ${taskPackage.readinessStatus}`,
      `Branch: ${taskPackage.branchName}`,
      `Worktree: ${taskPackage.worktreePathSuggestion}`,
      "",
      "### PowerShell Commands",
      "",
      "```powershell",
      ...taskPackage.powershellCommands,
      "```",
      "",
      "### Merge Notes",
      "",
      ...taskPackage.mergeOrderNotes.map((note) => `- ${note}`),
      "",
      "### Codex Prompt",
      "",
      "```text",
      taskPackage.codexPrompt,
      "```",
      "",
      "### PR Body Template",
      "",
      "```markdown",
      taskPackage.prBodyTemplate,
      "```",
      "",
    );
  }

  return lines.join("\n");
}

export function prBodyHeadings(): readonly string[] {
  return REQUIRED_PR_HEADINGS;
}

export function assertPlannerOutputSafe(value: unknown): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, path: string): void {
    if (current === null || typeof current !== "object") return;
    if (seen.has(current)) return;
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }

    for (const [key, entry] of Object.entries(current)) {
      const forbiddenPattern = FORBIDDEN_OUTPUT_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbiddenPattern) {
        throw new Error(`Planner output contains forbidden key at ${path}.${key}.`);
      }
      visit(entry, `${path}.${key}`);
    }
  }

  visit(value, "$");
}
