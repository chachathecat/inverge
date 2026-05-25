export const LEARNING_DATA_RULES = Object.freeze({
  rawAnswerPrivacy: "raw_user_answer_private",
  derivedSignalReuse: "derived_tags_for_product_learning_only",
  rawCopyrightGlobalCorpus: "forbidden",
  noteDeletionCascade: "delete_dependent_raw_refs",
  explainableRecommendation: "recommendations_must_trace_signals",
});

export const PRIVACY_DATA_CLASSES = Object.freeze({
  rawUserAnswer: "raw_user_answer",
  uploadedImagePdf: "uploaded_image_pdf",
  ocrText: "ocr_text",
  userEditedText: "user_edited_text",
  derivedLearningSignal: "derived_learning_signal",
  anonymizedAggregateInsight: "anonymized_aggregate_insight",
  productQualityMetric: "product_quality_metric",
});

function normalizeExamMode(examMode) {
  return examMode === "second" ? "second" : "first";
}

export function createCaptureSession(input) {
  return {
    id: input.id,
    userId: input.userId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    examMode: normalizeExamMode(input.examMode),
    subject: input.subject,
    sourceType: input.sourceType,
    evidenceRef: input.evidenceRef ?? null,
  };
}

export function createLearningNote(input) {
  return {
    id: input.id,
    captureSessionId: input.captureSessionId ?? null,
    examMode: normalizeExamMode(input.examMode),
    subject: input.subject,
    sourceType: input.sourceType,
    topicCandidate: input.topicCandidate ?? null,
    mistakeType: input.mistakeType ?? null,
    weakStructurePoint: input.weakStructurePoint ?? null,
    trapType: input.trapType ?? null,
    confidence: input.confidence ?? "중간",
    nextAction: input.nextAction ?? "retry",
    dueAt: input.dueAt ?? null,
    completedAt: input.completedAt ?? null,
    evidenceRef: input.evidenceRef ?? null,
    rawRefIds: [...(input.rawRefIds ?? [])],
  };
}

export function createLearningSignal(input) {
  const sanitizedExplainableBy = (input.explainableBy ?? []).filter((entry) => !looksLikeRawAnswer(entry));
  return {
    id: input.id,
    source: input.source,
    examMode: normalizeExamMode(input.examMode),
    subject: input.subject,
    sourceType: input.sourceType,
    topicCandidate: input.topicCandidate ?? null,
    mistakeType: input.mistakeType ?? null,
    weakStructurePoint: input.weakStructurePoint ?? null,
    trapType: input.trapType ?? null,
    confidence: input.confidence ?? "중간",
    nextAction: input.nextAction ?? "review",
    dueAt: input.dueAt ?? null,
    completedAt: input.completedAt ?? null,
    evidenceRef: input.evidenceRef ?? null,
    explainableBy: [...sanitizedExplainableBy],
  };
}

function looksLikeRawAnswer(value) {
  if (typeof value !== "string") return false;
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length >= 240) return true;
  return /[.?!]\s+/.test(compact) && compact.length >= 160;
}

export function createSecondAnswerWorkspaceSignal(input) {
  return createLearningSignal({ ...input, source: "SecondAnswerWorkspace", nextAction: input.nextAction ?? "rewrite" });
}

export function createFirstRoundFastDrillSignal(input) {
  return createLearningSignal({ ...input, source: "FirstRoundFastDrill", nextAction: input.nextAction ?? "review" });
}

export function createReviewTaskFromSignal(signal) {
  return {
    id: `review-${signal.id}`,
    signalId: signal.id,
    examMode: signal.examMode,
    subject: signal.subject,
    sourceType: signal.sourceType,
    topicCandidate: signal.topicCandidate,
    mistakeType: signal.mistakeType,
    weakStructurePoint: signal.weakStructurePoint,
    trapType: signal.trapType,
    confidence: signal.confidence,
    nextAction: signal.nextAction,
    dueAt: signal.dueAt,
    completedAt: signal.completedAt,
    evidenceRef: signal.evidenceRef,
  };
}

export function createRewriteTaskFromSecondAnswer(signal) {
  if (signal.examMode !== "second") return null;
  return { ...createReviewTaskFromSignal(signal), id: `rewrite-${signal.id}`, taskType: "rewrite" };
}

export function buildTodayPlanItemsFromReviewTasks(tasks, now = new Date(), limit = 3) {
  const nowTs = now.getTime();
  return tasks
    .filter((task) => task.dueAt && Date.parse(task.dueAt) <= nowTs && !task.completedAt)
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .slice(0, limit)
    .map((task) => ({
      id: `today-${task.id}`,
      reviewTaskId: task.id,
      examMode: task.examMode,
      subject: task.subject,
      sourceType: task.sourceType,
      topicCandidate: task.topicCandidate,
      mistakeType: task.mistakeType,
      weakStructurePoint: task.weakStructurePoint,
      trapType: task.trapType,
      confidence: task.confidence,
      nextAction: task.nextAction,
      dueAt: task.dueAt,
      completedAt: task.completedAt ?? null,
      evidenceRef: task.evidenceRef,
    }));
}

export function buildReviewQueueSections(tasks, now = new Date()) {
  const nowTs = now.getTime();
  const dueTasks = [];
  const upcomingTasks = [];
  const completedTasks = [];
  for (const task of tasks) {
    if (task.completedAt) {
      completedTasks.push(task);
      continue;
    }
    if (task.dueAt && Date.parse(task.dueAt) <= nowTs) dueTasks.push(task);
    else upcomingTasks.push(task);
  }
  const byDueAtAsc = (a, b) => Date.parse(a.dueAt ?? "9999-12-31T00:00:00.000Z") - Date.parse(b.dueAt ?? "9999-12-31T00:00:00.000Z");
  return {
    dueTasks: dueTasks.sort(byDueAtAsc),
    upcomingTasks: upcomingTasks.sort(byDueAtAsc),
    completedTasks: completedTasks.sort((a, b) => Date.parse(b.completedAt ?? "1970-01-01T00:00:00.000Z") - Date.parse(a.completedAt ?? "1970-01-01T00:00:00.000Z")),
  };
}

export function computeReadinessRiskFromSignals(signals) {
  const bySubject = new Map();
  for (const s of signals) {
    const key = `${s.examMode}:${s.subject}`;
    const bucket = bySubject.get(key) ?? { examMode: s.examMode, subject: s.subject, riskPoints: 0, evidence: [] };
    if (s.confidence === "낮음") bucket.riskPoints += 2;
    if (s.mistakeType) bucket.riskPoints += 1;
    if (s.weakStructurePoint) bucket.riskPoints += 1;
    bucket.evidence.push({ signalId: s.id, reason: s.explainableBy?.[0] ?? "stored_signal" });
    bySubject.set(key, bucket);
  }
  return [...bySubject.values()].map((x) => ({
    id: `risk-${x.examMode}-${x.subject}`,
    examMode: x.examMode,
    subject: x.subject,
    level: x.riskPoints >= 4 ? "high" : x.riskPoints >= 2 ? "watch" : "stable",
    explainableSignals: x.evidence,
  }));
}

export function buildWeeklyRetrospective(signals, weekKey) {
  return {
    id: `weekly-${weekKey}`,
    weekKey,
    totalSignals: signals.length,
    topMistakes: signals.map((s) => s.mistakeType).filter(Boolean).slice(0, 3),
    nextActions: signals.map((s) => s.nextAction).filter(Boolean).slice(0, 3),
  };
}

export function deleteLearningNoteAndDependents(note, rawRefStore) {
  const removed = [];
  for (const rawId of note.rawRefIds ?? []) {
    if (rawRefStore.has(rawId)) {
      rawRefStore.delete(rawId);
      removed.push(rawId);
    }
  }
  return { deletedNoteId: note.id, deletedRawRefs: removed };
}

export function exportUserOwnedLearningNotes(notes) {
  return notes.map((note) => ({
    id: note.id,
    examMode: note.examMode,
    subject: note.subject,
    sourceType: note.sourceType,
    topicCandidate: note.topicCandidate ?? null,
    mistakeType: note.mistakeType ?? null,
    weakStructurePoint: note.weakStructurePoint ?? null,
    nextAction: note.nextAction ?? null,
    dueAt: note.dueAt ?? null,
  }));
}
