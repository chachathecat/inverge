export type PrContractRisk = "low" | "medium" | "high";

export type MergeRecommendationLabel =
  | "Auto-merge candidate"
  | "Human approval required"
  | "Blocked";

export interface PrContractDoctorOptions {
  issueNumber?: number | string;
  defaultRisk?: PrContractRisk;
  sourceLevelOnly?: boolean;
  changedFiles?: readonly string[];
}

export interface IssueReferenceStatus {
  status:
    | "valid"
    | "missing"
    | "inserted"
    | "normalized"
    | "duplicates_repaired";
  countBefore: number;
  issueNumber: string | null;
  verb: "Closes" | "Fixes" | null;
  detail: string;
}

export interface RiskLineStatus {
  status:
    | "valid"
    | "missing_defaulted"
    | "inferred_source_level"
    | "repaired"
    | "duplicates_repaired";
  countBefore: number;
  risk: PrContractRisk;
  explicit: boolean;
  detail: string;
}

export interface HeadingFinding {
  heading: string;
  status:
    | "present"
    | "missing_inserted"
    | "duplicate_merged"
    | "misnamed_migrated"
    | "unknown_migrated";
  targetHeading?: string;
  countBefore: number;
  detail: string;
}

export interface MergeRecommendationFinding {
  label: MergeRecommendationLabel;
  status:
    | "present"
    | "missing_inserted"
    | "duplicate_repaired"
    | "plain_text_repaired"
    | "forced_human_review";
  checked: boolean;
  countBefore: number;
  detail: string;
}

export interface PrContractDoctorReport {
  validBefore: boolean;
  validAfter: boolean;
  issueReferenceStatus: IssueReferenceStatus;
  riskLineStatus: RiskLineStatus;
  headingFindings: HeadingFinding[];
  mergeRecommendationFindings: MergeRecommendationFinding[];
  repairActions: string[];
  remainingWarnings: string[];
  repairedBody: string;
  markdownSummary: string;
}

type RequiredHeading = (typeof REQUIRED_PR_CONTRACT_HEADINGS)[number];

interface ParsedSection {
  sourceHeading: string | null;
  targetHeading: RequiredHeading | null;
  contentLines: string[];
  exact: boolean;
}

interface IssueReference {
  verb: "Closes" | "Fixes";
  issueNumber: string;
  hadTrailingPeriod: boolean;
}

interface RiskCandidate {
  risk: PrContractRisk;
  exact: boolean;
}

interface MergeChoice {
  checkedLabel: MergeRecommendationLabel;
  sensitive: boolean;
  findings: MergeRecommendationFinding[];
}

interface ContractEvaluation {
  valid: boolean;
  issueCount: number;
  riskCount: number;
  headingCounts: Map<RequiredHeading, number>;
  mergeLabelCounts: Map<MergeRecommendationLabel, number>;
  checkedMergeCount: number;
}

export const REQUIRED_PR_CONTRACT_HEADINGS = [
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

export const MERGE_RECOMMENDATION_LABELS = [
  "Auto-merge candidate",
  "Human approval required",
  "Blocked",
] as const satisfies readonly MergeRecommendationLabel[];

const RISK_VALUES = new Set<PrContractRisk>(["low", "medium", "high"]);
const RISK_RANK: Record<PrContractRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const ISSUE_REFERENCE_PATTERN = /\b(Closes|Fixes)\s+#(\d+)\b(\.)?/gi;
const VALID_ISSUE_REFERENCE_PATTERN = /\b(?:Closes|Fixes)\s+#(\d+)\b/gi;
const EXACT_RISK_LINE_PATTERN = /^\s*-\s*Risk:\s*\[(low|medium|high)\]\s*$/gim;
const REPAIRABLE_RISK_LINE_PATTERN =
  /^\s*(?:-\s*)?(?:Risk\s*:\s*)?\[(low|medium|high)\]\s*\.?\s*$/i;
const PLAIN_RISK_LINE_PATTERN = /^\s*(?:-\s*)?Risk\s*:\s*(low|medium|high)\s*\.?\s*$/i;
const MERGE_RECOMMENDATION_PATTERN =
  /^\s*-\s*\[([ xX])\]\s*(Auto-merge candidate|Human approval required|Blocked)\s*$/gim;

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

const SECRET_VALUE_PATTERNS = [
  /\bghp_[A-Za-z0-9_]{8,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{8,}\b/,
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
] as const;

const SENSITIVE_LINE_PATTERNS = [
  /\b(secret|token|password|api[_-]?key|private[_-]?key|service[_-]?role|cookie|session)\b\s*[:=]/i,
  /\b(raw[_-]?answer|ocr[_-]?text|problem[_-]?text|question[_-]?body|answer[_-]?body)\b\s*[:=]/i,
  /\b(source[_-]?excerpt|provider[_-]?payload|billing[_-]?data|private[_-]?user[_-]?content)\b\s*[:=]/i,
  ...SECRET_VALUE_PATTERNS,
] as const;

const SENSITIVE_HINT_PATTERNS = [
  /\blive[-_ ]?runtime\b/i,
  /\bruntime[-_ ]?(?:change|changes|required|scope|state|route|api|behavior)\b/i,
  /\bauth(?:entication|orization)?\b/i,
  /\bpayment\b/i,
  /\bbilling\b/i,
  /\brefund\b/i,
  /\bentitlement\b/i,
  /\bdatabase\b/i,
  /\bdb\b/i,
  /\bmigration\b/i,
  /\brls\b/i,
  /\btenant\b/i,
  /\bsecurity\b/i,
  /\bprovider\b/i,
  /\buser[-_ ]?data\b/i,
  /\blearner[-_ ]?data\b/i,
  /\bocr\b/i,
] as const;

const HEADING_ALIASES = new Map<string, RequiredHeading>([
  ["goal", "## Goal"],
  ["goals", "## Goal"],
  ["summary", "## Goal"],
  ["overview", "## Goal"],
  ["linked_issue", "## Goal"],
  ["issue", "## Goal"],
  ["non_goals", "## Non-goals"],
  ["nongoals", "## Non-goals"],
  ["non_goal", "## Non-goals"],
  ["out_of_scope", "## Non-goals"],
  ["risk", "## Risk classification"],
  ["risk_classification", "## Risk classification"],
  ["risk_level", "## Risk classification"],
  ["data_boundary", "## Data boundary"],
  ["data_boundaries", "## Data boundary"],
  ["data_and_privacy", "## Data boundary"],
  ["schema_api_environment_changes", "## Schema / API / environment changes"],
  ["schema_api_env_changes", "## Schema / API / environment changes"],
  ["schema_api_environment", "## Schema / API / environment changes"],
  ["api_schema_environment_changes", "## Schema / API / environment changes"],
  ["schema", "## Schema / API / environment changes"],
  ["environment_changes", "## Schema / API / environment changes"],
  ["validation", "## Tests and evidence"],
  ["tests", "## Tests and evidence"],
  ["tests_and_evidence", "## Tests and evidence"],
  ["evidence", "## Tests and evidence"],
  ["runtime", "## Runtime evidence"],
  ["runtime_evidence", "## Runtime evidence"],
  ["runtime_validation", "## Runtime evidence"],
  ["rollout", "## Rollout and rollback"],
  ["rollback", "## Rollout and rollback"],
  ["rollout_rollback", "## Rollout and rollback"],
  ["rollout_and_rollback", "## Rollout and rollback"],
  ["remaining_risks", "## Remaining risks"],
  ["remaining_risk", "## Remaining risks"],
  ["risks", "## Remaining risks"],
  ["notes", "## Remaining risks"],
  ["open_questions", "## Remaining risks"],
  ["merge", "## Merge recommendation"],
  ["merge_recommendation", "## Merge recommendation"],
  ["recommendation", "## Merge recommendation"],
  ["merge_plan", "## Merge recommendation"],
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeHeadingKey(value: string): string {
  return value
    .replace(/^##\s*/, "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\//g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeIssueVerb(value: string): "Closes" | "Fixes" {
  return value.toLowerCase() === "fixes" ? "Fixes" : "Closes";
}

function normalizeIssueNumber(value: unknown): string | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return String(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return value.trim();
  }

  return null;
}

function normalizeRisk(value: unknown): PrContractRisk | null {
  const risk = String(value ?? "").trim().toLowerCase();
  return RISK_VALUES.has(risk as PrContractRisk) ? (risk as PrContractRisk) : null;
}

function highestRisk(risks: readonly PrContractRisk[]): PrContractRisk {
  return risks.reduce<PrContractRisk>(
    (selected, risk) => (RISK_RANK[risk] > RISK_RANK[selected] ? risk : selected),
    "low",
  );
}

function cleanContentLines(lines: readonly string[]): string[] {
  const cleaned: string[] = [];
  let previousBlank = false;

  for (const line of lines.map((entry) => entry.replace(/\s+$/g, ""))) {
    const blank = line.trim() === "";
    if (blank && previousBlank) continue;
    cleaned.push(line);
    previousBlank = blank;
  }

  while (cleaned.length > 0 && cleaned[0].trim() === "") cleaned.shift();
  while (cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === "") cleaned.pop();
  return cleaned;
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function sanitizeInputBody(
  body: string,
  repairActions: string[],
  remainingWarnings: string[],
): string {
  const normalized = normalizeNewlines(body);
  const lines = normalized.split("\n");
  let redactedCount = 0;
  let removedControlCharacters = false;

  const sanitized = lines.map((line) => {
    const withoutControls = line.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
    if (withoutControls !== line) removedControlCharacters = true;

    if (SENSITIVE_LINE_PATTERNS.some((pattern) => pattern.test(withoutControls))) {
      redactedCount += 1;
      return "[redacted sensitive line]";
    }

    return withoutControls;
  });

  if (removedControlCharacters) {
    remainingWarnings.push("Removed unsupported control characters before parsing the PR body.");
  }

  if (redactedCount > 0) {
    repairActions.push(`Redacted ${redactedCount} secret-looking or raw-content-looking line(s).`);
    remainingWarnings.push("Review redacted lines manually before pasting the repaired PR body.");
  }

  return sanitized.join("\n");
}

function parseSections(body: string): ParsedSection[] {
  const lines = body.split("\n");
  const sections: ParsedSection[] = [];
  let current: ParsedSection = {
    sourceHeading: null,
    targetHeading: "## Goal",
    contentLines: [],
    exact: false,
  };

  function pushCurrent(): void {
    if (
      current.sourceHeading !== null ||
      current.contentLines.some((line) => line.trim() !== "")
    ) {
      sections.push(current);
    }
  }

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+?)\s*$/);
    if (headingMatch) {
      pushCurrent();
      const sourceHeading = `## ${headingMatch[1].trim()}`;
      const exact = REQUIRED_PR_CONTRACT_HEADINGS.includes(sourceHeading as RequiredHeading);
      current = {
        sourceHeading,
        targetHeading: exact
          ? (sourceHeading as RequiredHeading)
          : HEADING_ALIASES.get(normalizeHeadingKey(sourceHeading)) ?? null,
        contentLines: [],
        exact,
      };
      continue;
    }

    current.contentLines.push(line);
  }

  pushCurrent();
  return sections;
}

function collectSectionContent(
  sections: readonly ParsedSection[],
  headingFindings: HeadingFinding[],
  repairActions: string[],
): Map<RequiredHeading, string[]> {
  const content = new Map<RequiredHeading, string[]>(
    REQUIRED_PR_CONTRACT_HEADINGS.map((heading) => [heading, []]),
  );
  const exactCounts = new Map<RequiredHeading, number>(
    REQUIRED_PR_CONTRACT_HEADINGS.map((heading) => [heading, 0]),
  );

  for (const section of sections) {
    if (section.exact && section.targetHeading) {
      exactCounts.set(section.targetHeading, (exactCounts.get(section.targetHeading) ?? 0) + 1);
    }
  }

  for (const heading of REQUIRED_PR_CONTRACT_HEADINGS) {
    const count = exactCounts.get(heading) ?? 0;
    if (count === 0) {
      headingFindings.push({
        heading,
        status: "missing_inserted",
        countBefore: 0,
        detail: `${heading} was missing and was inserted in the required order.`,
      });
    } else if (count > 1) {
      headingFindings.push({
        heading,
        status: "duplicate_merged",
        countBefore: count,
        detail: `${heading} appeared ${count} times and was merged into one section.`,
      });
      repairActions.push(`Merged duplicate ${heading} sections.`);
    } else {
      headingFindings.push({
        heading,
        status: "present",
        countBefore: 1,
        detail: `${heading} was present.`,
      });
    }
  }

  for (const section of sections) {
    const targetHeading = section.targetHeading ?? "## Remaining risks";
    const targetContent = content.get(targetHeading);
    if (!targetContent) continue;

    const cleaned = cleanContentLines(section.contentLines);
    if (cleaned.length === 0) continue;

    if (section.exact) {
      targetContent.push(...cleaned, "");
      continue;
    }

    if (section.targetHeading) {
      headingFindings.push({
        heading: section.sourceHeading ?? "body preamble",
        status: "misnamed_migrated",
        targetHeading,
        countBefore: 1,
        detail: `${section.sourceHeading ?? "body preamble"} was migrated into ${targetHeading}.`,
      });
      repairActions.push(`Migrated ${section.sourceHeading ?? "body preamble"} into ${targetHeading}.`);
      targetContent.push(...cleaned, "");
      continue;
    }

    headingFindings.push({
      heading: section.sourceHeading ?? "body preamble",
      status: "unknown_migrated",
      targetHeading,
      countBefore: 1,
      detail: `${section.sourceHeading ?? "body preamble"} was preserved under ${targetHeading}.`,
    });
    repairActions.push(`Moved unknown section ${section.sourceHeading ?? "body preamble"} into ${targetHeading}.`);
    targetContent.push(`Original ${section.sourceHeading ?? "body preamble"}:`, ...cleaned, "");
  }

  for (const [heading, lines] of content) {
    content.set(heading, cleanContentLines(lines));
  }

  return content;
}

function headingBlankLineActions(body: string, repairActions: string[]): void {
  const lines = body.split("\n");

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (/^##\s+.+?\s*$/.test(lines[index]) && lines[index + 1].trim() !== "") {
      repairActions.push(`Inserted a blank line after ${lines[index].trim()}.`);
    }
  }
}

function issueReferences(body: string): IssueReference[] {
  return [...body.matchAll(ISSUE_REFERENCE_PATTERN)].map((match) => ({
    verb: normalizeIssueVerb(match[1]),
    issueNumber: match[2],
    hadTrailingPeriod: match[3] === ".",
  }));
}

function chooseIssueReference(
  body: string,
  options: PrContractDoctorOptions,
  repairActions: string[],
  remainingWarnings: string[],
): IssueReferenceStatus {
  const references = issueReferences(body);
  const suppliedIssue = normalizeIssueNumber(options.issueNumber);

  if (references.length === 0 && suppliedIssue) {
    repairActions.push(`Inserted missing issue-closing reference Closes #${suppliedIssue}.`);
    return {
      status: "inserted",
      countBefore: 0,
      issueNumber: suppliedIssue,
      verb: "Closes",
      detail: `No issue-closing reference was present; Closes #${suppliedIssue} came from CLI/options.`,
    };
  }

  if (references.length === 0) {
    remainingWarnings.push("Add exactly one issue-closing reference using the required closing keyword and issue number.");
    return {
      status: "missing",
      countBefore: 0,
      issueNumber: null,
      verb: null,
      detail: "No issue-closing reference was found and no issue number was supplied.",
    };
  }

  const first = references[0];
  if (references.length > 1) {
    repairActions.push(`Kept ${first.verb} #${first.issueNumber} and demoted duplicate issue-closing references.`);
    remainingWarnings.push("Review duplicate issue references; the doctor kept the first closing reference.");
    return {
      status: "duplicates_repaired",
      countBefore: references.length,
      issueNumber: first.issueNumber,
      verb: first.verb,
      detail: `Found ${references.length} issue-closing references; kept ${first.verb} #${first.issueNumber}.`,
    };
  }

  if (first.hadTrailingPeriod) {
    repairActions.push(`Normalized ${first.verb} #${first.issueNumber}. to ${first.verb} #${first.issueNumber}.`);
    return {
      status: "normalized",
      countBefore: 1,
      issueNumber: first.issueNumber,
      verb: first.verb,
      detail: "Removed trailing punctuation from the issue-closing reference.",
    };
  }

  return {
    status: "valid",
    countBefore: 1,
    issueNumber: first.issueNumber,
    verb: first.verb,
    detail: `${first.verb} #${first.issueNumber} is valid.`,
  };
}

function riskCandidates(body: string): RiskCandidate[] {
  return body
    .split("\n")
    .map((line) => {
      const exactMatch = line.match(/^\s*-\s*Risk:\s*\[(low|medium|high)\]\s*$/i);
      if (exactMatch) {
        return {
          risk: exactMatch[1].toLowerCase() as PrContractRisk,
          exact: true,
        };
      }

      const repairableMatch = line.match(REPAIRABLE_RISK_LINE_PATTERN);
      if (repairableMatch) {
        return {
          risk: repairableMatch[1].toLowerCase() as PrContractRisk,
          exact: false,
        };
      }

      const plainMatch = line.match(PLAIN_RISK_LINE_PATTERN);
      if (plainMatch) {
        return {
          risk: plainMatch[1].toLowerCase() as PrContractRisk,
          exact: false,
        };
      }

      return null;
    })
    .filter((entry): entry is RiskCandidate => entry !== null);
}

function chooseRiskLine(
  body: string,
  options: PrContractDoctorOptions,
  sensitive: boolean,
  repairActions: string[],
  remainingWarnings: string[],
): RiskLineStatus {
  const candidates = riskCandidates(body);
  const exactCandidates = candidates.filter((candidate) => candidate.exact);
  const risks = candidates.map((candidate) => candidate.risk);

  if (exactCandidates.length === 1 && candidates.length === 1) {
    const risk = exactCandidates[0].risk;
    if (sensitive && risk === "low") {
      remainingWarnings.push("Low risk is explicitly declared while sensitive runtime/auth/data hints are present.");
    }

    return {
      status: "valid",
      countBefore: 1,
      risk,
      explicit: true,
      detail: `- Risk: [${risk}] is valid.`,
    };
  }

  if (candidates.length > 0) {
    const risk = highestRisk(risks);
    const status = candidates.length > 1 ? "duplicates_repaired" : "repaired";
    repairActions.push(`Repaired risk declaration to - Risk: [${risk}].`);
    if (sensitive && risk === "low") {
      remainingWarnings.push("Review risk classification because sensitive hints are present.");
    }

    return {
      status,
      countBefore: exactCandidates.length,
      risk,
      explicit: true,
      detail:
        status === "duplicates_repaired"
          ? `Found ${candidates.length} risk declarations; kept the highest risk value ${risk}.`
          : `Converted a repairable risk declaration to - Risk: [${risk}].`,
    };
  }

  const optionRisk = normalizeRisk(options.defaultRisk);
  if (optionRisk) {
    repairActions.push(`Inserted missing risk line from explicit option: - Risk: [${optionRisk}].`);
    return {
      status: "missing_defaulted",
      countBefore: 0,
      risk: optionRisk,
      explicit: false,
      detail: `Risk was missing; explicit option supplied ${optionRisk}.`,
    };
  }

  if (options.sourceLevelOnly === true && !sensitive) {
    repairActions.push("Inserted missing low risk line because source-level-only scope was supplied.");
    return {
      status: "inferred_source_level",
      countBefore: 0,
      risk: "low",
      explicit: false,
      detail: "Risk was missing; source-level-only scope supplied a low-risk default.",
    };
  }

  const defaultRisk: PrContractRisk = sensitive ? "high" : "medium";
  repairActions.push(`Inserted missing risk line with default risk ${defaultRisk}.`);
  if (!sensitive) {
    remainingWarnings.push("Review default medium risk if the PR has runtime, auth, payment, provider, or user-data scope.");
  }

  return {
    status: "missing_defaulted",
    countBefore: 0,
    risk: defaultRisk,
    explicit: false,
    detail: `Risk was missing; defaulted to ${defaultRisk}.`,
  };
}

function checkboxMatches(body: string): Array<{
  label: MergeRecommendationLabel;
  checked: boolean;
}> {
  return [...body.matchAll(MERGE_RECOMMENDATION_PATTERN)].map((match) => ({
    label: match[2] as MergeRecommendationLabel,
    checked: match[1].toLowerCase() === "x",
  }));
}

function plainMergeRecommendationLabels(body: string): Set<MergeRecommendationLabel> {
  const labels = new Set<MergeRecommendationLabel>();

  for (const line of body.split("\n")) {
    const normalized = line
      .replace(/^\s*(?:-\s*)?(?:Merge recommendation\s*:\s*)?/i, "")
      .trim()
      .toLowerCase();

    for (const label of MERGE_RECOMMENDATION_LABELS) {
      if (normalized === label.toLowerCase()) labels.add(label);
    }
  }

  return labels;
}

function chooseMergeRecommendation(
  body: string,
  sensitive: boolean,
  repairActions: string[],
  remainingWarnings: string[],
): MergeChoice {
  const matches = checkboxMatches(body);
  const plainLabels = plainMergeRecommendationLabels(body);
  const labelCounts = new Map<MergeRecommendationLabel, number>(
    MERGE_RECOMMENDATION_LABELS.map((label) => [label, 0]),
  );
  const checkedByLabel = new Map<MergeRecommendationLabel, boolean>();

  for (const match of matches) {
    labelCounts.set(match.label, (labelCounts.get(match.label) ?? 0) + 1);
    if (!checkedByLabel.has(match.label)) checkedByLabel.set(match.label, match.checked);
    else checkedByLabel.set(match.label, Boolean(checkedByLabel.get(match.label)) || match.checked);
  }

  const allPresent = MERGE_RECOMMENDATION_LABELS.every((label) => (labelCounts.get(label) ?? 0) === 1);
  const checkedLabels = MERGE_RECOMMENDATION_LABELS.filter((label) => checkedByLabel.get(label) === true);
  let checkedLabel: MergeRecommendationLabel = "Human approval required";

  if (allPresent && checkedLabels.length === 1) {
    checkedLabel = checkedLabels[0];
  } else if (plainLabels.has("Blocked") && plainLabels.size === 1) {
    checkedLabel = "Blocked";
  }

  if (sensitive && checkedLabel === "Auto-merge candidate") {
    checkedLabel = "Human approval required";
    repairActions.push("Forced merge recommendation to Human approval required because sensitive hints are present.");
    remainingWarnings.push("Sensitive runtime/auth/payment/db/security/provider/user-data hints require human review.");
  }

  if (!allPresent || checkedLabels.length !== 1 || plainLabels.size > 0) {
    repairActions.push(`Rebuilt merge recommendation checkboxes with ${checkedLabel} checked.`);
  }

  const findings = MERGE_RECOMMENDATION_LABELS.map<MergeRecommendationFinding>((label) => {
    const count = labelCounts.get(label) ?? 0;
    let status: MergeRecommendationFinding["status"] = "present";

    if (count === 0) status = "missing_inserted";
    else if (count > 1) status = "duplicate_repaired";
    else if (plainLabels.has(label)) status = "plain_text_repaired";
    else if (sensitive && label === "Auto-merge candidate" && checkedByLabel.get(label) === true) {
      status = "forced_human_review";
    }

    return {
      label,
      status,
      checked: label === checkedLabel,
      countBefore: count,
      detail:
        label === checkedLabel
          ? `${label} is the single checked merge recommendation.`
          : `${label} is present and unchecked in the repaired body.`,
    };
  });

  return {
    checkedLabel,
    sensitive,
    findings,
  };
}

function bodyHasSensitiveHints(body: string, options: PrContractDoctorOptions): boolean {
  const haystack = [
    body,
    ...(options.changedFiles ?? []),
  ].join("\n");

  return SENSITIVE_HINT_PATTERNS.some((pattern) => pattern.test(haystack));
}

function evaluateContract(body: string): ContractEvaluation {
  const headingCounts = new Map<RequiredHeading, number>(
    REQUIRED_PR_CONTRACT_HEADINGS.map((heading) => [heading, 0]),
  );

  for (const heading of REQUIRED_PR_CONTRACT_HEADINGS) {
    const pattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "gim");
    headingCounts.set(heading, [...body.matchAll(pattern)].length);
  }

  const mergeLabelCounts = new Map<MergeRecommendationLabel, number>(
    MERGE_RECOMMENDATION_LABELS.map((label) => [label, 0]),
  );
  let checkedMergeCount = 0;

  for (const match of body.matchAll(MERGE_RECOMMENDATION_PATTERN)) {
    const label = match[2] as MergeRecommendationLabel;
    mergeLabelCounts.set(label, (mergeLabelCounts.get(label) ?? 0) + 1);
    if (match[1].toLowerCase() === "x") checkedMergeCount += 1;
  }

  const issueCount = [...body.matchAll(VALID_ISSUE_REFERENCE_PATTERN)].length;
  const riskCount = [...body.matchAll(EXACT_RISK_LINE_PATTERN)].length;
  const allHeadingsPresentOnce = REQUIRED_PR_CONTRACT_HEADINGS.every(
    (heading) => headingCounts.get(heading) === 1,
  );
  const allMergeLabelsPresentOnce = MERGE_RECOMMENDATION_LABELS.every(
    (label) => mergeLabelCounts.get(label) === 1,
  );

  return {
    valid:
      issueCount === 1 &&
      riskCount === 1 &&
      allHeadingsPresentOnce &&
      allMergeLabelsPresentOnce &&
      checkedMergeCount === 1,
    issueCount,
    riskCount,
    headingCounts,
    mergeLabelCounts,
    checkedMergeCount,
  };
}

function removeManagedContractLines(lines: readonly string[]): string[] {
  const cleaned: string[] = [];

  for (const line of lines) {
    const withoutIssueClosers = line
      .replace(ISSUE_REFERENCE_PATTERN, "References #$2")
      .replace(/\s+$/g, "");

    if (/^\s*References\s+#\d+\s*\.?\s*$/i.test(withoutIssueClosers)) continue;
    if (REPAIRABLE_RISK_LINE_PATTERN.test(withoutIssueClosers)) continue;
    if (PLAIN_RISK_LINE_PATTERN.test(withoutIssueClosers)) continue;
    if (/^\s*-\s*\[[ xX]\]\s*(Auto-merge candidate|Human approval required|Blocked)\s*$/i.test(withoutIssueClosers)) continue;
    if (/^\s*(?:-\s*)?(?:Merge recommendation\s*:\s*)?(Auto-merge candidate|Human approval required|Blocked)\s*$/i.test(withoutIssueClosers)) continue;

    cleaned.push(withoutIssueClosers);
  }

  return cleanContentLines(cleaned);
}

function defaultSectionLines(heading: RequiredHeading): string[] {
  if (heading === "## Non-goals") {
    return ["- Do not expand scope beyond this PR."];
  }

  if (heading === "## Data boundary") {
    return ["- Boundary review required before merge."];
  }

  if (heading === "## Schema / API / environment changes") {
    return ["None recorded."];
  }

  if (heading === "## Tests and evidence") {
    return ["Not recorded."];
  }

  if (heading === "## Runtime evidence") {
    return [
      "- Required: Not recorded.",
      "- Result: Not recorded.",
      "- Artifact: Not recorded.",
    ];
  }

  if (heading === "## Rollout and rollback") {
    return [
      "- Rollout: Merge after required checks pass.",
      "- Rollback: Revert this PR.",
    ];
  }

  if (heading === "## Remaining risks") {
    return ["- Human review must confirm issue linkage, risk classification, and evidence before merge."];
  }

  if (heading === "## Goal") {
    return ["Repair this PR body to the repository PR Contract format."];
  }

  return [];
}

function mergeRecommendationLines(choice: MergeChoice): string[] {
  return MERGE_RECOMMENDATION_LABELS.map((label) =>
    `- [${label === choice.checkedLabel ? "x" : " "}] ${label}`,
  );
}

function buildRepairedBody(input: {
  sections: Map<RequiredHeading, string[]>;
  issue: IssueReferenceStatus;
  risk: RiskLineStatus;
  mergeChoice: MergeChoice;
  remainingWarnings: readonly string[];
}): string {
  const chunks: string[] = [];

  for (const heading of REQUIRED_PR_CONTRACT_HEADINGS) {
    chunks.push(heading, "");

    if (heading === "## Goal") {
      if (input.issue.issueNumber && input.issue.verb) {
        chunks.push(`${input.issue.verb} #${input.issue.issueNumber}`, "");
      }
    }

    if (heading === "## Risk classification") {
      chunks.push(`- Risk: [${input.risk.risk}]`);
      const extra = removeManagedContractLines(input.sections.get(heading) ?? []);
      if (extra.length > 0) chunks.push(...extra);
      chunks.push("");
      continue;
    }

    if (heading === "## Merge recommendation") {
      chunks.push(...mergeRecommendationLines(input.mergeChoice), "");
      continue;
    }

    const cleaned = removeManagedContractLines(input.sections.get(heading) ?? []);
    const sectionLines = cleaned.length > 0 ? cleaned : defaultSectionLines(heading);
    chunks.push(...sectionLines);

    if (heading === "## Remaining risks" && input.remainingWarnings.length > 0) {
      chunks.push("", ...input.remainingWarnings.map((warning) => `- ${warning}`));
    }

    chunks.push("");
  }

  return `${chunks.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function markdownBoolean(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}

function listOrNone(values: readonly string[]): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : "- None.";
}

function buildMarkdownSummary(report: Omit<PrContractDoctorReport, "markdownSummary">): string {
  return [
    "# AF003 PR Contract Doctor Report",
    "",
    `Valid before: ${markdownBoolean(report.validBefore)}`,
    `Valid after: ${markdownBoolean(report.validAfter)}`,
    `Issue reference: ${report.issueReferenceStatus.status} (${report.issueReferenceStatus.detail})`,
    `Risk line: ${report.riskLineStatus.status} (- Risk: [${report.riskLineStatus.risk}])`,
    "",
    "## Heading Findings",
    "",
    ...report.headingFindings.map((finding) => `- ${finding.status}: ${finding.heading}${finding.targetHeading ? ` -> ${finding.targetHeading}` : ""}`),
    "",
    "## Merge Recommendation",
    "",
    ...report.mergeRecommendationFindings.map((finding) => `- ${finding.checked ? "[x]" : "[ ]"} ${finding.label}: ${finding.status}`),
    "",
    "## Repair Actions",
    "",
    listOrNone(report.repairActions),
    "",
    "## Remaining Warnings",
    "",
    listOrNone(report.remainingWarnings),
    "",
    "## Repaired Body",
    "",
    "```markdown",
    report.repairedBody.trimEnd(),
    "```",
  ].join("\n");
}

function markdownWarnings(body: string, remainingWarnings: string[]): void {
  if (!body.trim()) {
    remainingWarnings.push("PR body is empty; inserted the required section scaffold.");
  }

  if (!/^##\s+.+$/m.test(body)) {
    remainingWarnings.push("No level-two Markdown headings were found; migrated body text into Goal.");
  }

  const fenceCount = (body.match(/```/g) ?? []).length;
  if (fenceCount % 2 === 1) {
    remainingWarnings.push("Unclosed fenced code block detected; repaired output treats the text as ordinary section content.");
  }
}

export function createPrContractDoctorReport(
  body: string,
  options: PrContractDoctorOptions = {},
): PrContractDoctorReport {
  const repairActions: string[] = [];
  const remainingWarnings: string[] = [];
  const sanitizedBody = sanitizeInputBody(body, repairActions, remainingWarnings);
  markdownWarnings(sanitizedBody, remainingWarnings);
  headingBlankLineActions(sanitizedBody, repairActions);

  const validBefore = evaluateContract(sanitizedBody).valid;
  const sensitive = bodyHasSensitiveHints(sanitizedBody, options);
  const issueReferenceStatus = chooseIssueReference(
    sanitizedBody,
    options,
    repairActions,
    remainingWarnings,
  );
  const riskLineStatus = chooseRiskLine(
    sanitizedBody,
    options,
    sensitive,
    repairActions,
    remainingWarnings,
  );
  const mergeChoice = chooseMergeRecommendation(
    sanitizedBody,
    sensitive,
    repairActions,
    remainingWarnings,
  );
  const headingFindings: HeadingFinding[] = [];
  const sections = collectSectionContent(
    parseSections(sanitizedBody),
    headingFindings,
    repairActions,
  );
  const uniqueRepairActions = [...new Set(repairActions)];
  const uniqueWarnings = [...new Set(remainingWarnings)];
  const repairedBody = buildRepairedBody({
    sections,
    issue: issueReferenceStatus,
    risk: riskLineStatus,
    mergeChoice,
    remainingWarnings: uniqueWarnings,
  });
  const validAfter = evaluateContract(repairedBody).valid;

  if (!validAfter && issueReferenceStatus.status === "missing") {
    uniqueWarnings.push("Repaired body remains invalid until exactly one issue number is supplied.");
  }

  const reportWithoutMarkdown: Omit<PrContractDoctorReport, "markdownSummary"> = {
    validBefore,
    validAfter,
    issueReferenceStatus,
    riskLineStatus,
    headingFindings,
    mergeRecommendationFindings: mergeChoice.findings,
    repairActions: uniqueRepairActions,
    remainingWarnings: [...new Set(uniqueWarnings)],
    repairedBody,
  };
  const report = {
    ...reportWithoutMarkdown,
    markdownSummary: buildMarkdownSummary(reportWithoutMarkdown),
  };

  assertPrContractDoctorReportSafe(report);
  return report;
}

export function prContractHeadings(): readonly string[] {
  return REQUIRED_PR_CONTRACT_HEADINGS;
}

export function prContractMergeRecommendationLabels(): readonly string[] {
  return MERGE_RECOMMENDATION_LABELS;
}

export function assertPrContractDoctorReportSafe(value: unknown): void {
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
        throw new Error(`PR contract doctor output contains forbidden key at ${path}.${key}.`);
      }
      visit(entry, `${path}.${key}`);
    }
  }

  visit(value, "$");

  const serialized = JSON.stringify(value);
  const leakedSecret = SECRET_VALUE_PATTERNS.find((pattern) => pattern.test(serialized));
  if (leakedSecret) {
    throw new Error(`PR contract doctor output contains a secret-looking value matching ${leakedSecret}.`);
  }
}
