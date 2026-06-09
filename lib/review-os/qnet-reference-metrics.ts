export type QnetReferenceMetricsAction = Record<string, unknown> & {
  id?: string;
  prioritySignals?: string[];
  qnetReference?: QnetReferenceMetricsPayload;
};

export type QnetReferenceMetricsPayload = {
  matchedSourceIds?: string[];
  matchedTopics?: string[];
  matchedCurriculumNodeCandidates?: string[];
  trapPatternCandidates?: string[];
  answerSkeletonTags?: string[];
  calculationTemplateCandidates?: string[];
  casioRelevant?: boolean;
  metadataOnly?: true;
  safeUse?: "metadata_reference_only";
};

export type QnetReferenceCoverageInput =
  | readonly QnetReferenceMetricsAction[]
  | { actions?: readonly QnetReferenceMetricsAction[] };

export type QnetReferenceCoverageSummary = {
  totalActions: number;
  actionsWithQnetReference: number;
  qnetReferenceCoverageRate: number;
  matchedSourceIdCount: number;
  matchedTopicCount: number;
  matchedTrapPatternCount: number;
  matchedAnswerSkeletonCount: number;
  matchedCalculationTemplateCount: number;
  casioRelevantActionCount: number;
};

export type QnetReferenceDominanceSummary = {
  officialReferenceSignalCount: number;
  learnerDerivedSignalCount: number;
  qnetBoostedButNotDominatingCount: number;
  potentialDominanceWarnings: string[];
};

export type QnetReferenceSafetySummary = {
  rawLeakCount: number;
  officialClaimLeakCount: number;
};

export type QnetReferenceCoverageReport = QnetReferenceCoverageSummary & QnetReferenceDominanceSummary & QnetReferenceSafetySummary & {
  metadataOnly: true;
  safeUse: "closed_beta_reference_metrics_only";
};

const LEARNER_DERIVED_SIGNALS = new Set([
  "due_review",
  "ocr_confirmation_pending",
  "confident_wrong_concept",
  "learning_state:confident_wrong",
  "wrong_concept",
  "learning_state:wrong",
  "confused_concept",
  "learning_state:confused",
  "recovery_needed",
  "recovery_candidate",
  "recent_missed_tasks",
]);

const STRONG_LEARNER_SIGNAL_PREFIXES = ["review_queue_due_bucket:"];

const DUE_BUCKET_RANK: Record<string, number> = {
  soon: 90,
  tomorrow: 68,
  three_days: 38,
  one_week: 18,
};

const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "rawText",
  "rawOcrText",
  "ocrText",
  "rawAnswerText",
  "answerText",
  "rawProblemText",
  "problemText",
  "questionText",
  "officialAnswerBody",
  "modelAnswer",
  "explanationBody",
  "fullText",
  "sourceText",
  "sourceExcerpt",
  "copyrightedText",
  "originalText",
  "localFileName",
  "localRawFileName",
  "score",
  "officialScore",
  "predictedScore",
  "passFail",
  "passGuarantee",
]);

const FORBIDDEN_RAW_STRING_PATTERNS = [
  new RegExp(["local", "official", "materials"].join("_"), "i"),
  new RegExp(`${["qnet", "manifest"].join("_")}\\.json`, "i"),
  /\braw\s+(?:question|problem|answer|ocr|source)\s+text\b/i,
  /\b(?:question|problem|answer|source|ocr)\s+text\b/i,
  /\bofficial\s+answer\s+body\b/i,
  /\bsource\s+excerpt\b/i,
  /\bocr\s+full\s+text\b/i,
  /\.(?:pdf|hwp|hwpx|doc|docx|zip|png|jpe?g|webp|gif|tiff?)\b/i,
];

const OFFICIAL_CLAIM_PATTERNS = [
  /official\s+grading/i,
  /official\s+score/i,
  /score\s*prediction/i,
  /pass\s*\/\s*fail/i,
  /pass[-\s]*fail/i,
  /model\s+answer/i,
  /pass\s*guarantee/i,
  /\uacf5\uc2dd\s*\ucc44\uc810/,
  /\uacf5\uc2dd\s*\uc810\uc218/,
  /\uc810\uc218\s*\uc608\uce21/,
  /\ud569\ubd88/,
  /\uacf5\uc2dd\s*\ubaa8\ubc94\ub2f5\uc548/,
  /\ubaa8\ubc94\ub2f5\uc548/,
  /\ud569\uaca9\s*\ubcf4\uc7a5/,
  /怨듭떇\s*梨꾩젏/,
  /怨듭떇\s*\?먯닔/,
  /\?먯닔\s*\?덉륫/,
  /\?⑸텋/,
  /怨듭떇\s*紐⑤쾾\?듭븞/,
  /紐⑤쾾\?듭븞/,
  /\?⑷꺽\s*蹂댁옣/,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function actionsFromInput(input: QnetReferenceCoverageInput): QnetReferenceMetricsAction[] {
  if (Array.isArray(input)) return [...input];
  if (isRecord(input) && Array.isArray(input.actions)) return [...input.actions];
  return [];
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeText).filter(Boolean);
}

function uniqueCount(values: Iterable<string>) {
  return new Set([...values].map(normalizeText).filter(Boolean)).size;
}

function prioritySignals(action: QnetReferenceMetricsAction) {
  return stringArray(action.prioritySignals);
}

function isOfficialReferenceSignal(signal: string) {
  return signal.startsWith("official_reference_");
}

function isLearnerDerivedSignal(signal: string) {
  return LEARNER_DERIVED_SIGNALS.has(signal);
}

function isStrongLearnerSignal(signal: string) {
  return isLearnerDerivedSignal(signal) || STRONG_LEARNER_SIGNAL_PREFIXES.some((prefix) => signal.startsWith(prefix));
}

function qnetReference(action: QnetReferenceMetricsAction) {
  return isRecord(action.qnetReference) ? action.qnetReference : null;
}

function hasQnetReference(action: QnetReferenceMetricsAction) {
  const reference = qnetReference(action);
  if (!reference) return false;
  return Boolean(
    reference.safeUse === "metadata_reference_only"
    || stringArray(reference.matchedSourceIds).length
    || stringArray(reference.matchedTopics).length
    || stringArray(reference.trapPatternCandidates).length
    || stringArray(reference.answerSkeletonTags).length
    || stringArray(reference.calculationTemplateCandidates).length
    || reference.casioRelevant === true
  );
}

function hasOfficialReferenceBoost(action: QnetReferenceMetricsAction) {
  return prioritySignals(action).some(isOfficialReferenceSignal);
}

function hasStrongLearnerSignal(action: QnetReferenceMetricsAction) {
  return prioritySignals(action).some(isStrongLearnerSignal);
}

function signalRankValue(signals: string[], options: { includeOfficialReference: boolean }) {
  const signalSet = new Set(signals);
  let value = 0;

  if (signalSet.has("due_review")) value += 120;
  const dueBucketSignal = signals.find((signal) => signal.startsWith("review_queue_due_bucket:"));
  if (dueBucketSignal) value += DUE_BUCKET_RANK[dueBucketSignal.split(":")[1] ?? ""] ?? 0;
  if (signalSet.has("ocr_confirmation_pending")) value += 150;
  if (signalSet.has("confident_wrong_concept") || signalSet.has("learning_state:confident_wrong")) value += 130;
  if (signalSet.has("wrong_concept") || signalSet.has("learning_state:wrong")) value += 95;
  if (signalSet.has("confused_concept") || signalSet.has("learning_state:confused")) value += 82;
  if (signalSet.has("recovering_due_review") || signalSet.has("learning_state:recovering")) value += 72;
  if (signalSet.has("recovery_needed") || signalSet.has("recovery_candidate")) value += 62;
  if (signalSet.has("high_risk_unit") || signalSet.has("fail_risk_subject")) value += 54;
  if (signalSet.has("high_importance_unit")) value += 40;
  if (signalSet.has("exam_proximity")) value += 30;
  if (signalSet.has("recent_missed_tasks") || signalSet.has("confidence:needs_check")) value += 24;
  if (signalSet.has("adaptive_study_plan")) value += 28;
  if (signalSet.has("schedule_track_focus")) value += 10;
  if (signalSet.has("schedule_primary_block")) value += 8;

  if (options.includeOfficialReference) {
    if (signalSet.has("official_reference_topic_match")) value += 9;
    if (signalSet.has("official_reference_trap_pattern_candidate")) value += 4;
    if (signalSet.has("official_reference_answer_skeleton_candidate")) value += 4;
    if (signalSet.has("official_reference_calculation_template_candidate")) value += 3;
    if (signalSet.has("official_reference_casio_relevant")) value += 2;
    if (signalSet.has("official_reference_source_verified")) value += 2;
  }

  return value;
}

function safeDiagnosticId(action: QnetReferenceMetricsAction, index: number) {
  const id = normalizeText(action.id);
  return /^[a-z0-9:_-]{1,80}$/i.test(id) ? id : `action_${index}`;
}

function countForbiddenRawStringPatterns(value: string) {
  return FORBIDDEN_RAW_STRING_PATTERNS.filter((pattern) => pattern.test(value)).length;
}

function countOfficialClaimPatterns(value: string) {
  return OFFICIAL_CLAIM_PATTERNS.filter((pattern) => pattern.test(value)).length;
}

export function summarizeQnetReferenceCoverage(
  actions: readonly QnetReferenceMetricsAction[],
): QnetReferenceCoverageSummary {
  const matchedSourceIds: string[] = [];
  const matchedTopics: string[] = [];
  const trapPatterns: string[] = [];
  const answerSkeletons: string[] = [];
  const calculationTemplates: string[] = [];
  let actionsWithQnetReference = 0;
  let casioRelevantActionCount = 0;

  for (const action of actions) {
    const reference = qnetReference(action);
    if (!reference) continue;
    if (hasQnetReference(action)) actionsWithQnetReference += 1;
    matchedSourceIds.push(...stringArray(reference.matchedSourceIds));
    matchedTopics.push(...stringArray(reference.matchedTopics));
    trapPatterns.push(...stringArray(reference.trapPatternCandidates));
    answerSkeletons.push(...stringArray(reference.answerSkeletonTags));
    calculationTemplates.push(...stringArray(reference.calculationTemplateCandidates));
    if (reference.casioRelevant === true) casioRelevantActionCount += 1;
  }

  return {
    totalActions: actions.length,
    actionsWithQnetReference,
    qnetReferenceCoverageRate: actions.length === 0 ? 0 : actionsWithQnetReference / actions.length,
    matchedSourceIdCount: uniqueCount(matchedSourceIds),
    matchedTopicCount: uniqueCount(matchedTopics),
    matchedTrapPatternCount: uniqueCount(trapPatterns),
    matchedAnswerSkeletonCount: uniqueCount(answerSkeletons),
    matchedCalculationTemplateCount: uniqueCount(calculationTemplates),
    casioRelevantActionCount,
  };
}

export function summarizeQnetReferenceDominance(
  actions: readonly QnetReferenceMetricsAction[],
): QnetReferenceDominanceSummary {
  const officialReferenceSignalCount = actions
    .flatMap((action) => prioritySignals(action))
    .filter(isOfficialReferenceSignal)
    .length;
  const learnerDerivedSignalCount = actions
    .flatMap((action) => prioritySignals(action))
    .filter(isLearnerDerivedSignal)
    .length;
  const learnerActions = actions
    .map((action, index) => ({ action, index, signals: prioritySignals(action) }))
    .filter(({ action }) => hasStrongLearnerSignal(action));
  const warnings: string[] = [];
  const warningActionIndexes = new Set<number>();

  actions.forEach((action, index) => {
    const signals = prioritySignals(action);
    if (!signals.some(isOfficialReferenceSignal)) return;

    const fullRankValue = signalRankValue(signals, { includeOfficialReference: true });
    const rankValueWithoutOfficialReference = signalRankValue(signals, { includeOfficialReference: false });

    for (const learner of learnerActions) {
      if (learner.index === index) continue;
      const learnerRankValue = signalRankValue(learner.signals, { includeOfficialReference: false });
      const appearsAhead = fullRankValue > learnerRankValue || (fullRankValue === learnerRankValue && index < learner.index);
      const trailsWithoutOfficialReference = rankValueWithoutOfficialReference < learnerRankValue;
      if (!appearsAhead || !trailsWithoutOfficialReference) continue;

      warningActionIndexes.add(index);
      warnings.push(
        `official-reference-signal-may-dominate-learner-signal:${safeDiagnosticId(action, index)}:${safeDiagnosticId(learner.action, learner.index)}`,
      );
      break;
    }
  });

  const qnetBoostedButNotDominatingCount = actions.filter((action, index) =>
    hasOfficialReferenceBoost(action) && !warningActionIndexes.has(index)
  ).length;

  return {
    officialReferenceSignalCount,
    learnerDerivedSignalCount,
    qnetBoostedButNotDominatingCount,
    potentialDominanceWarnings: warnings,
  };
}

export function summarizeQnetReferenceSafety(
  actions: readonly QnetReferenceMetricsAction[],
): QnetReferenceSafetySummary {
  let rawLeakCount = 0;
  let officialClaimLeakCount = 0;
  const visited = new WeakSet<object>();

  function visit(value: unknown) {
    if (typeof value === "string") {
      rawLeakCount += countForbiddenRawStringPatterns(value);
      officialClaimLeakCount += countOfficialClaimPatterns(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isRecord(value) || visited.has(value)) return;
    visited.add(value);

    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_RAW_FIELD_NAMES.has(key)) rawLeakCount += 1;
      visit(nested);
    }
  }

  visit(actions);
  return { rawLeakCount, officialClaimLeakCount };
}

export function buildQnetReferenceCoverageReport(
  input: QnetReferenceCoverageInput = [],
): QnetReferenceCoverageReport {
  const actions = actionsFromInput(input);
  return {
    ...summarizeQnetReferenceCoverage(actions),
    ...summarizeQnetReferenceDominance(actions),
    ...summarizeQnetReferenceSafety(actions),
    metadataOnly: true,
    safeUse: "closed_beta_reference_metrics_only",
  };
}
