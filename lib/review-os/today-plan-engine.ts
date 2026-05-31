import type { ConfidenceLevel, LearningSignalEventRecord, ReviewQueueCard, WrongAnswerItemRecord } from "@/lib/review-os/types";

export type TodayPlanTaskType =
  | "first_ox_retry"
  | "concept_review"
  | "cloze_review"
  | "accounting_template_retry"
  | "second_answer_rewrite"
  | "ocr_confirmation"
  | "note_cleanup";
export type TodayPlanDueBucket = "overdue" | "today" | "upcoming";
export type TodayPlanPrimaryCta = { label: string; hrefKind: "session" | "review" | "capture" | "write" | "items" | "first_ox" | "calculator_template" };

export type TodayPlanTask = {
  itemId: string;
  queueId?: string;
  title: string;
  subject: string;
  exam_mode: "first" | "second";
  due_bucket: TodayPlanDueBucket;
  status: "pending" | "due" | "completed";
  reason: string;
  one_biggest_gap: string;
  one_next_action: string;
  task_type: TodayPlanTaskType;
  estimated_minutes: number;
  priority_reason: string;
  primary_cta: TodayPlanPrimaryCta;
  created_from_capture: boolean;
  source_label?: string;
};

type BuildInput = {
  mode: "first" | "second";
  queue: ReviewQueueCard[];
  items?: WrongAnswerItemRecord[];
  learningSignals?: LearningSignalEventRecord[];
  now?: Date;
};
type RepeatedGapSignal = { label: string; count: number };
type BuildWeaknessInput = BuildInput & { repeatedGaps?: RepeatedGapSignal[]; riskLevel?: "stable" | "watch" | "high" };

const DAY_MS = 86_400_000;

function parseTime(value: string | null | undefined) {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

function resolveDueBucket(dueAt: string | null | undefined, now: Date): TodayPlanDueBucket {
  const dueTs = parseTime(dueAt);
  if (dueTs === null) return "upcoming";
  if (dueTs <= now.getTime()) return "overdue";
  if (dueTs <= now.getTime() + DAY_MS) return "today";
  return "upcoming";
}

function confidenceBoost(confidence: ConfidenceLevel) {
  if (confidence === "낮음") return 18;
  if (confidence === "중간") return 8;
  return 0;
}

function getRecordPayloadValue(item: WrongAnswerItemRecord, key: string) {
  const fromRaw = item.rawPayload?.[key];
  if (fromRaw !== undefined) return fromRaw;
  const confirmed = item.rawPayload?.user_confirmed_fields;
  if (typeof confirmed === "object" && confirmed && key in confirmed) {
    return (confirmed as Record<string, unknown>)[key];
  }
  return item.derivedPayload?.[key];
}

function isLowConfidenceOcrItem(item: WrongAnswerItemRecord) {
  return getRecordPayloadValue(item, "lowConfidenceFlag") === true || /low_confidence|ocr_failed|manual_fallback/.test(String(getRecordPayloadValue(item, "captureQualityIssue") ?? ""));
}

function getPageCount(item: WrongAnswerItemRecord) {
  const value = getRecordPayloadValue(item, "pageCount");
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function resolveQueueTaskType(mode: "first" | "second", item: ReviewQueueCard): TodayPlanTaskType {
  const text = `${item.subjectLabel} ${item.reviewReason} ${item.mistakeType} ${item.topicTag}`;
  if (/OCR|ocr|확인 필요|인식/.test(text)) return "ocr_confirmation";
  if (mode === "second" && /rewrite|재작성|다시쓰기|문단|논점 누락|누락/.test(text)) return "second_answer_rewrite";
  if (mode === "first" && /회계|계산|산식|단위|공식|template|템플릿/.test(text)) return "accounting_template_retry";
  if (/빈칸|cloze|암기/.test(text)) return "cloze_review";
  if (/개념|정의|요건|조문/.test(text)) return "concept_review";
  return mode === "first" ? "first_ox_retry" : "second_answer_rewrite";
}

function primaryCtaFor(taskType: TodayPlanTaskType, mode: "first" | "second"): TodayPlanPrimaryCta {
  if (taskType === "ocr_confirmation" || taskType === "note_cleanup") return { label: "확인하고 정리", hrefKind: "capture" };
  if (taskType === "second_answer_rewrite") return { label: "10분 다시 쓰기", hrefKind: "review" };
  if (taskType === "accounting_template_retry") return { label: "계산 틀 재확인", hrefKind: "calculator_template" };
  if (taskType === "cloze_review") return { label: "빈칸 회상", hrefKind: "session" };
  if (taskType === "concept_review") return { label: "개념 1개 회상", hrefKind: "session" };
  if (taskType === "first_ox_retry") return { label: "5분 O/X 재시도", hrefKind: "first_ox" };
  return { label: mode === "first" ? "5분 다시 풀기" : "다시 쓰기", hrefKind: "session" };
}

function toGap(item: ReviewQueueCard) {
  return `${item.mistakeType} 관련 간극 1개`;
}

function toNextAction(mode: "first" | "second", item: ReviewQueueCard, taskType: TodayPlanTaskType) {
  if (taskType === "ocr_confirmation") return `${item.problemTitle}의 숫자/용어 1개를 확인하고 노트를 저장합니다.`;
  if (taskType === "second_answer_rewrite") return `${item.problemTitle}에서 누락 논점 1개를 문단으로 다시 씁니다.`;
  if (taskType === "accounting_template_retry") return `${item.problemTitle}의 산식 틀을 먼저 적고 계산을 다시 확인합니다.`;
  if (taskType === "cloze_review") return `${item.problemTitle} 핵심어 1개를 가리고 회상합니다.`;
  if (taskType === "concept_review") return `${item.problemTitle} 핵심 조건 1개를 회상 후 확인합니다.`;
  return mode === "first" ? `${item.problemTitle}을 다시 풀고 근거 1줄을 남깁니다.` : `${item.problemTitle} 핵심 논점 1개를 회상합니다.`;
}

function toProblemSnapTask(mode: "first" | "second", signal: LearningSignalEventRecord): TodayPlanTask {
  const taskType: TodayPlanTaskType = mode === "second" ? "second_answer_rewrite" : "first_ox_retry";
  return {
    itemId: `problem-snap-${signal.id}`,
    title: `${signal.subject} Problem Snap 다음 작업`,
    subject: signal.subject,
    exam_mode: mode,
    due_bucket: "today",
    status: "due",
    reason: "문제 스냅으로 저장한 막힌 문제입니다.",
    one_biggest_gap: "막힌 지점 1개를 다시 해결합니다.",
    one_next_action: signal.nextTask || (mode === "second" ? "쟁점 1개를 다시 써서 검토합니다." : "핵심 조건 1개를 회상하고 다시 풉니다."),
    task_type: taskType,
    estimated_minutes: mode === "second" ? 15 : 10,
    priority_reason: "문제 스냅 최신 기록을 바로 재시도로 연결합니다.",
    primary_cta: primaryCtaFor(taskType, mode),
    created_from_capture: true,
    source_label: "Problem Snap 기반",
  };
}

function toFirstOxSignalTask(signal: LearningSignalEventRecord): TodayPlanTask {
  const isConcept = signal.nextTaskType === "concept_review";
  const isCloze = signal.nextTaskType === "cloze_review";
  const taskType: TodayPlanTaskType = isConcept ? "concept_review" : isCloze ? "cloze_review" : "first_ox_retry";
  return {
    itemId: `first-ox-${signal.id}`,
    title: isCloze ? `${signal.subject} 빈칸 회상` : `${signal.subject} O/X 선지 재시도`,
    subject: signal.subject,
    exam_mode: "first",
    due_bucket: "today",
    status: "due",
    reason: isConcept ? "모름으로 남긴 1차 선지라 개념 확인이 먼저 필요합니다." : isCloze ? "헷갈림으로 남긴 1차 선지라 핵심어 회상이 먼저 필요합니다." : "틀림으로 남긴 1차 선지입니다.",
    one_biggest_gap: isConcept ? "판단 기준 1개가 비어 있습니다." : isCloze ? "핵심 표현 1개가 아직 불안정합니다." : "선지 표현과 근거 연결이 약했습니다.",
    one_next_action: signal.nextTask || (isConcept ? "핵심 개념 1개를 확인하고 O/X를 다시 판단합니다." : isCloze ? "핵심어 1개를 가리고 회상합니다." : "근거 1줄을 회상하고 같은 선지를 다시 판단합니다."),
    task_type: taskType,
    estimated_minutes: isConcept ? 7 : 5,
    priority_reason: "1차 O/X 연습에서 만든 최신 학습 신호입니다.",
    primary_cta: isConcept ? { label: "개념 1개 회상", hrefKind: "first_ox" } : primaryCtaFor(taskType, "first"),
    created_from_capture: false,
    source_label: "1차 O/X 기반",
  };
}

function pickRecentFirstOxSignal(learningSignals: LearningSignalEventRecord[], mode: "first" | "second", now: Date) {
  if (mode !== "first") return null;
  const cutoff = now.getTime() - DAY_MS * 3;
  return learningSignals
    .filter((signal) => signal.sourceType === "first-ox" && signal.examMode === "감정평가사 1차")
    .filter((signal) => {
      const createdTs = parseTime(signal.createdAt);
      return createdTs !== null && createdTs >= cutoff && createdTs <= now.getTime();
    })
    .sort((a, b) => (parseTime(b.createdAt) ?? 0) - (parseTime(a.createdAt) ?? 0))[0] ?? null;
}

function pickRecentProblemSnapSignal(learningSignals: LearningSignalEventRecord[], mode: "first" | "second", now: Date) {
  const cutoff = now.getTime() - DAY_MS * 3;
  const expectedExamMode = mode === "second" ? "감정평가사 2차" : "감정평가사 1차";
  return learningSignals
    .filter((signal) => signal.sourceType === "problem-snap" && signal.examMode === expectedExamMode)
    .filter((signal) => {
      const createdTs = parseTime(signal.createdAt);
      return createdTs !== null && createdTs >= cutoff && createdTs <= now.getTime();
    })
    .sort((a, b) => (parseTime(b.createdAt) ?? 0) - (parseTime(a.createdAt) ?? 0))[0] ?? null;
}

function toItemTask(item: WrongAnswerItemRecord, mode: "first" | "second", now: Date): { task: TodayPlanTask; score: number } | null {
  const createdFromCapture = Boolean(item.rawPayload?.created_from_capture ?? item.derivedPayload?.created_from_capture ?? item.createdFromCapture);
  const pageCount = getPageCount(item);
  const lowConfidence = isLowConfidenceOcrItem(item);
  const captureNote = typeof item.derivedPayload?.capture_note_engine_v2 === "object" && item.derivedPayload.capture_note_engine_v2 ? item.derivedPayload.capture_note_engine_v2 as Record<string, unknown> : null;
  const biggestGap = String(item.biggestGap ?? item.missingIssue ?? captureNote?.one_biggest_gap ?? item.userReasonPreset ?? "가장 큰 간극 1개를 확인합니다.");
  const title = item.problemTitle ?? item.problemIdentifier ?? (createdFromCapture ? "저장한 캡처 노트" : "오답 노트");
  const createdTs = parseTime(item.createdAt);
  const recentBoost = createdTs !== null && now.getTime() - createdTs >= 0 && now.getTime() - createdTs <= 2 * DAY_MS ? 14 : 0;

  let taskType: TodayPlanTaskType | null = null;
  let reason = "저장된 노트에서 오늘 이어갈 작업입니다.";
  let nextAction = String(captureNote?.one_next_action ?? "핵심 조건 1개를 회상하고 다시 시도합니다.");
  let estimated = mode === "second" ? 15 : 10;
  let sourceLabel = createdFromCapture ? "저장한 캡처 노트 기반" : "오답 노트 기반";
  let score = 28 + confidenceBoost(item.confidence) + recentBoost;

  if (lowConfidence) {
    taskType = "ocr_confirmation";
    reason = pageCount > 1 ? "여러 페이지 OCR 중 신뢰도가 낮은 부분이 있어 확인이 필요합니다." : "OCR 인식 신뢰도가 낮아 숫자/용어 확인이 필요합니다.";
    nextAction = "원문과 노트의 숫자/용어 1개를 확인합니다.";
    estimated = pageCount > 1 ? 8 : 5;
    sourceLabel = "확인 필요";
    score += 45;
  } else if (mode === "second" && (item.missingIssue || item.weakStructurePoint || item.rewriteInstruction || item.rewriteCompleted === false)) {
    taskType = "second_answer_rewrite";
    reason = "답안에서 보강할 문단이 남아 있습니다.";
    nextAction = item.rewriteInstruction ?? "누락 논점 1개를 문단으로 다시 씁니다.";
    estimated = 20;
    score += 22;
  } else if (mode === "first" && /회계|계산|산식|단위|공식/.test(`${item.subjectLabel} ${item.userReasonPreset ?? ""} ${item.userReasonText ?? ""}`)) {
    taskType = "accounting_template_retry";
    reason = "계산/산식 기록은 템플릿으로 다시 확인하면 좋습니다.";
    nextAction = "산식 틀을 먼저 쓰고 숫자를 대입합니다.";
    estimated = 12;
    score += 18;
  } else if (item.confidence === "낮음") {
    taskType = "cloze_review";
    reason = "확신이 낮았던 개념이라 회상부터 고정합니다.";
    nextAction = "핵심어 1개를 가리고 떠올린 뒤 확인합니다.";
    estimated = 7;
    score += 15;
  } else if (createdFromCapture || item.userReasonPreset || item.userReasonText) {
    taskType = mode === "first" ? "first_ox_retry" : "concept_review";
    reason = createdFromCapture ? "저장한 Capture-to-Note 항목입니다." : "오답 노트에서 복습할 항목입니다.";
    nextAction = mode === "first" ? "다시 풀고 근거 1줄을 남깁니다." : "핵심 논점 1개를 회상합니다.";
  }

  if (!taskType) return null;
  return {
    score,
    task: {
      itemId: item.id,
      title,
      subject: item.subjectLabel,
      exam_mode: mode,
      due_bucket: "today",
      status: "pending",
      reason,
      one_biggest_gap: biggestGap,
      one_next_action: nextAction,
      task_type: taskType,
      estimated_minutes: estimated,
      priority_reason: reason,
      primary_cta: primaryCtaFor(taskType, mode),
      created_from_capture: createdFromCapture,
      source_label: sourceLabel,
    },
  };
}

export function buildTodayPlanTasks({ mode, queue, items = [], learningSignals = [], now = new Date(), repeatedGaps = [], riskLevel = "stable" }: BuildWeaknessInput): TodayPlanTask[] {
  const topRepeatedGap = repeatedGaps[0] ?? null;
  const rankedQueue = queue
    .map((item) => {
      const dueTs = parseTime(item.dueAt);
      const isOverdue = dueTs !== null && dueTs <= now.getTime();
      const overdueDays = isOverdue && dueTs !== null ? Math.max(1, Math.floor((now.getTime() - dueTs) / DAY_MS) + 1) : 0;
      const createdTs = parseTime(item.itemCreatedAt);
      const createdAgeMs = createdTs === null ? null : now.getTime() - createdTs;
      const createdRecently = createdAgeMs !== null && createdAgeMs >= 0 && createdAgeMs <= 2 * DAY_MS;
      const captureRecentBoost = item.createdFromCapture && createdRecently ? 9 : 0;
      const recurrenceBoost = Math.min(item.recurrenceCount, 4) * 7;
      const taskType = resolveQueueTaskType(mode, item);
      const rewriteBoost = taskType === "second_answer_rewrite" ? 14 : 0;
      const overdueBoost = isOverdue ? 50 + overdueDays * 6 : 0;
      const weaknessBoost =
        riskLevel === "high" && topRepeatedGap && topRepeatedGap.count >= 3 && `${item.subjectLabel} · ${item.mistakeType}` === topRepeatedGap.label ? 8 : 0;
      const score = item.priorityScore * 0.2 + overdueBoost + captureRecentBoost + confidenceBoost(item.confidence) + recurrenceBoost + rewriteBoost + weaknessBoost;
      const priority_reason = isOverdue
        ? `예정 복습 시점이 지나 ${overdueDays}일 밀린 항목입니다.`
        : captureRecentBoost > 0
          ? "방금 남긴 캡처 기록이라 기억이 남아 있을 때 바로 연결합니다."
          : item.confidence === "낮음"
            ? "확신이 낮았던 항목이라 먼저 고정합니다."
            : item.recurrenceCount >= 2
              ? "반복 실수가 누적되어 먼저 줄입니다."
              : "오늘 학습 흐름을 유지하기 좋은 항목입니다.";
      return { item, score, taskType, priority_reason };
    })
    .sort((a, b) => b.score - a.score || ((parseTime(a.item.dueAt) ?? Number.MAX_SAFE_INTEGER) - (parseTime(b.item.dueAt) ?? Number.MAX_SAFE_INTEGER)) || a.item.itemId.localeCompare(b.item.itemId));

  const queueTasks = rankedQueue.map(({ item, taskType, priority_reason, score }) => ({
    score,
    task: {
      itemId: item.itemId,
      queueId: item.queueId,
      title: item.problemTitle,
      subject: item.subjectLabel,
      exam_mode: mode,
      due_bucket: resolveDueBucket(item.dueAt, now),
      status: resolveDueBucket(item.dueAt, now) === "upcoming" ? "pending" as const : "due" as const,
      reason: priority_reason,
      one_biggest_gap: toGap(item),
      one_next_action: toNextAction(mode, item, taskType),
      task_type: taskType,
      estimated_minutes: taskType === "second_answer_rewrite" ? 20 : taskType === "ocr_confirmation" ? 5 : taskType === "first_ox_retry" ? 15 : 12,
      priority_reason,
      primary_cta: primaryCtaFor(taskType, mode),
      created_from_capture: item.createdFromCapture,
      source_label: item.createdFromCapture ? "오늘 기록 기반" : "복습 큐 기반",
    },
  }));

  const itemTasks = items
    .filter((item) => item.examName === (mode === "second" ? "감정평가사 2차" : "감정평가사 1차"))
    .map((item) => toItemTask(item, mode, now))
    .filter((value): value is { task: TodayPlanTask; score: number } => Boolean(value));

  const topQueueScore = rankedQueue[0]?.score ?? -1;
  const topQueueDueTs = rankedQueue[0] ? parseTime(rankedQueue[0].item.dueAt) : null;
  const queueHasStrongDueTask = topQueueScore >= 80 || (topQueueDueTs !== null && topQueueDueTs <= now.getTime());
  const recentProblemSnap = queueHasStrongDueTask ? null : pickRecentProblemSnapSignal(learningSignals, mode, now);
  const problemSnapTasks = recentProblemSnap ? [{ task: toProblemSnapTask(mode, recentProblemSnap), score: 73 }] : [];
  const recentFirstOx = queueHasStrongDueTask ? null : pickRecentFirstOxSignal(learningSignals, mode, now);
  const firstOxTasks = recentFirstOx ? [{ task: toFirstOxSignalTask(recentFirstOx), score: 76 }] : [];

  const deduped = new Map<string, { task: TodayPlanTask; score: number }>();
  [...queueTasks, ...itemTasks, ...problemSnapTasks, ...firstOxTasks].forEach((entry) => {
    const existing = deduped.get(entry.task.itemId);
    if (!existing || entry.score > existing.score) deduped.set(entry.task.itemId, entry);
  });

  return [...deduped.values()]
    .sort((a, b) => b.score - a.score || a.task.itemId.localeCompare(b.task.itemId))
    .slice(0, 3)
    .map((entry) => entry.task);
}
