import type { AppraisalMode } from "@/lib/review-os/appraisal";

export const LEARNING_AGENDA_EVENT_TYPES = [
  "capture_saved",
  "note_created",
  "review_due",
  "review_completed",
  "today_task_completed",
  "weakness_recovered",
] as const;

export type LearningAgendaEventType = (typeof LEARNING_AGENDA_EVENT_TYPES)[number];

export type LearningAgendaEvent = {
  id: string;
  type: LearningAgendaEventType;
  title: string;
  date: string;
  sourceId?: string;
  subject?: string;
  noteId?: string;
  reviewItemId?: string;
  todayTaskId?: string;
};

export type LearningAgendaMonthCell = {
  date: string;
  dayOfMonth: number;
  count: number;
  active: boolean;
};

export type LearningAgendaDayGroup = {
  date: string;
  events: LearningAgendaEvent[];
};

const EVENT_TITLE_BY_TYPE: Record<LearningAgendaEventType, string> = {
  capture_saved: "오늘 한 것 기록",
  note_created: "학습 노트 저장",
  review_due: "복습 예정",
  review_completed: "복습 완료",
  today_task_completed: "오늘 할 일 완료",
  weakness_recovered: "약점 회복 후보",
};

const FORBIDDEN_AGENDA_FIELD_NAMES = [
  "rawOcrText",
  "raw_ocr_text",
  "rawAnswerText",
  "raw_answer_text",
  "rawProblemText",
  "raw_problem_text",
  "rawQuestionText",
  "raw_question_text",
  "uploadedFileContent",
  "uploaded_file_content",
  "fileContent",
  "answerText",
  "problemText",
  "ocrText",
];

type AgendaWrongAnswerItem = {
  id?: string;
  examName?: string;
  subjectLabel?: string;
  createdAt?: string;
  nextReviewDate?: string | null;
  createdFromCapture?: boolean;
};

type AgendaReviewQueueItem = {
  queueId?: string;
  itemId?: string;
  examName?: string;
  subjectLabel?: string;
  dueAt?: string;
};

type AgendaUsageEvent = {
  id?: string;
  eventName?: string;
  entityId?: string | null;
  entityType?: string | null;
  createdAt?: string;
};

type AgendaLocalNote = {
  id?: string;
  mode?: string;
  subjectLabel?: string;
  createdAt?: string;
};

type BuildLearningAgendaEventsInput = {
  mode: AppraisalMode;
  items?: AgendaWrongAnswerItem[];
  reviewQueue?: AgendaReviewQueueItem[];
  usageEvents?: AgendaUsageEvent[];
  now?: Date;
};

export function titleForLearningAgendaEvent(type: LearningAgendaEventType) {
  return EVENT_TITLE_BY_TYPE[type];
}

export function assertLearningAgendaEventMetadataOnly(event: Record<string, unknown>) {
  const stack: Record<string, unknown>[] = [event];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const [key, value] of Object.entries(current)) {
      if (FORBIDDEN_AGENDA_FIELD_NAMES.includes(key)) {
        throw new Error(`Agenda event cannot include raw learner field: ${key}`);
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        stack.push(value as Record<string, unknown>);
      }
    }
  }
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isValidDate(value: string | undefined) {
  if (!value) return false;
  return Number.isFinite(Date.parse(value));
}

function modeLabel(mode: AppraisalMode) {
  return mode === "second" ? "감정평가사 2차" : "감정평가사 1차";
}

function matchesMode(mode: AppraisalMode, examName?: string) {
  return !examName || examName === modeLabel(mode);
}

function normalizeEvent(input: Omit<LearningAgendaEvent, "title"> & { title?: string }): LearningAgendaEvent | null {
  if (!LEARNING_AGENDA_EVENT_TYPES.includes(input.type)) return null;
  if (!isValidDate(input.date)) return null;
  const event: LearningAgendaEvent = {
    id: input.id,
    type: input.type,
    title: input.title ?? titleForLearningAgendaEvent(input.type),
    date: input.date,
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
    ...(input.subject ? { subject: input.subject } : {}),
    ...(input.noteId ? { noteId: input.noteId } : {}),
    ...(input.reviewItemId ? { reviewItemId: input.reviewItemId } : {}),
    ...(input.todayTaskId ? { todayTaskId: input.todayTaskId } : {}),
  };
  assertLearningAgendaEventMetadataOnly(event);
  return event;
}

function usageEventToAgendaEvent(event: AgendaUsageEvent): LearningAgendaEvent | null {
  const name = safeString(event.eventName);
  const createdAt = safeString(event.createdAt);
  const sourceId = safeString(event.entityId) ?? safeString(event.id);
  if (!name || !createdAt) return null;

  if (name === "capture_saved") {
    return normalizeEvent({
      id: `usage-capture-${event.id ?? sourceId ?? createdAt}`,
      type: "capture_saved",
      date: createdAt,
      sourceId,
    });
  }
  if (name === "review_complete" || name === "review_completed" || name === "review_queue_task_completed") {
    return normalizeEvent({
      id: `usage-review-completed-${event.id ?? sourceId ?? createdAt}`,
      type: "review_completed",
      date: createdAt,
      sourceId,
      reviewItemId: sourceId,
    });
  }
  if (name === "post_save_execution_completed" || name === "today_task_completed" || name === "today_plan_task_completed") {
    return normalizeEvent({
      id: `usage-today-completed-${event.id ?? sourceId ?? createdAt}`,
      type: "today_task_completed",
      date: createdAt,
      sourceId,
      todayTaskId: sourceId,
    });
  }
  if (name === "overdue_recovery_completed" || name === "weakness_recovered") {
    return normalizeEvent({
      id: `usage-weakness-recovered-${event.id ?? sourceId ?? createdAt}`,
      type: "weakness_recovered",
      date: createdAt,
      sourceId,
    });
  }
  return null;
}

export function buildLearningAgendaEvents(input: BuildLearningAgendaEventsInput) {
  const events: LearningAgendaEvent[] = [];

  for (const item of input.items ?? []) {
    if (!matchesMode(input.mode, item.examName)) continue;
    const itemId = safeString(item.id);
    const createdAt = safeString(item.createdAt);
    const subject = safeString(item.subjectLabel);
    if (!itemId || !createdAt) continue;

    if (item.createdFromCapture) {
      const captureEvent = normalizeEvent({
        id: `capture-saved-${itemId}`,
        type: "capture_saved",
        date: createdAt,
        sourceId: itemId,
        noteId: itemId,
        subject,
      });
      if (captureEvent) events.push(captureEvent);
    }

    const noteEvent = normalizeEvent({
      id: `note-created-${itemId}`,
      type: "note_created",
      date: createdAt,
      sourceId: itemId,
      noteId: itemId,
      subject,
    });
    if (noteEvent) events.push(noteEvent);
  }

  for (const queueItem of input.reviewQueue ?? []) {
    if (!matchesMode(input.mode, queueItem.examName)) continue;
    const queueId = safeString(queueItem.queueId);
    const dueAt = safeString(queueItem.dueAt);
    if (!queueId || !dueAt) continue;
    const event = normalizeEvent({
      id: `review-due-${queueId}`,
      type: "review_due",
      date: dueAt,
      sourceId: safeString(queueItem.itemId),
      reviewItemId: queueId,
      subject: safeString(queueItem.subjectLabel),
    });
    if (event) events.push(event);
  }

  for (const usageEvent of input.usageEvents ?? []) {
    const event = usageEventToAgendaEvent(usageEvent);
    if (event) events.push(event);
  }

  return mergeLearningAgendaEvents(events);
}

export function buildLocalBetaLearningAgendaEvents(notes: AgendaLocalNote[], mode: AppraisalMode) {
  const events: LearningAgendaEvent[] = [];
  for (const note of notes) {
    if (note.mode !== mode) continue;
    const noteId = safeString(note.id);
    const createdAt = safeString(note.createdAt);
    if (!noteId || !createdAt) continue;
    const subject = safeString(note.subjectLabel);
    const captureEvent = normalizeEvent({
      id: `local-capture-saved-${noteId}`,
      type: "capture_saved",
      date: createdAt,
      sourceId: noteId,
      noteId,
      subject,
    });
    const noteEvent = normalizeEvent({
      id: `local-note-created-${noteId}`,
      type: "note_created",
      date: createdAt,
      sourceId: noteId,
      noteId,
      subject,
    });
    if (captureEvent) events.push(captureEvent);
    if (noteEvent) events.push(noteEvent);
  }
  return mergeLearningAgendaEvents(events);
}

export function mergeLearningAgendaEvents(events: LearningAgendaEvent[]) {
  const byId = new Map<string, LearningAgendaEvent>();
  for (const event of events) {
    assertLearningAgendaEventMetadataOnly(event);
    byId.set(event.id, event);
  }
  return [...byId.values()].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
}

export function toLearningAgendaDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function groupLearningAgendaEventsByDay(events: LearningAgendaEvent[]) {
  const groups = new Map<string, LearningAgendaEvent[]>();
  for (const event of events) {
    const key = toLearningAgendaDateKey(event.date);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()]
    .map(([date, dayEvents]) => ({
      date,
      events: dayEvents.sort((left, right) => Date.parse(right.date) - Date.parse(left.date)),
    }))
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function buildLearningAgendaMonthCells(events: LearningAgendaEvent[], now = new Date()): LearningAgendaMonthCell[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const countByDay = new Map<string, number>();
  for (const event of events) {
    const key = toLearningAgendaDateKey(event.date);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }
  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1);
    const key = toLearningAgendaDateKey(date);
    const count = countByDay.get(key) ?? 0;
    return {
      date: key,
      dayOfMonth: index + 1,
      count,
      active: count > 0,
    };
  });
}

export function buildLearningAgendaWeekGroups(events: LearningAgendaEvent[], now = new Date()): LearningAgendaDayGroup[] {
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + mondayOffset);
  const grouped = groupLearningAgendaEventsByDay(events);
  const byDate = new Map(grouped.map((group) => [group.date, group.events]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = toLearningAgendaDateKey(date);
    return {
      date: key,
      events: byDate.get(key) ?? [],
    };
  });
}

export type LearningRecordTimelineModel = {
  thisWeek: LearningAgendaEvent[];
  history: LearningAgendaEvent[];
  nextReview: LearningAgendaEvent | null;
  completedWeek: boolean;
};

function startOfLocalWeek(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  return start;
}

function startOfLocalDay(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function buildLearningRecordTimelineModel(
  events: LearningAgendaEvent[],
  now = new Date(),
): LearningRecordTimelineModel {
  const normalized = mergeLearningAgendaEvents(events);
  const weekStart = startOfLocalWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const todayStart = startOfLocalDay(now).getTime();

  const thisWeek = normalized
    .filter((event) => {
      const timestamp = Date.parse(event.date);
      return timestamp >= weekStart.getTime() && timestamp < weekEnd.getTime();
    })
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date));

  const history = normalized.filter((event) => Date.parse(event.date) < weekStart.getTime());
  const dueReviews = normalized.filter((event) => event.type === "review_due");
  const upcomingReviews = dueReviews
    .filter((event) => Date.parse(event.date) >= todayStart)
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date));
  const overdueReviews = dueReviews
    .filter((event) => Date.parse(event.date) < todayStart)
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
  const completedTypes = new Set<LearningAgendaEventType>([
    "review_completed",
    "today_task_completed",
    "weakness_recovered",
  ]);
  const completedWeek =
    thisWeek.some((event) => completedTypes.has(event.type)) &&
    !thisWeek.some((event) => event.type === "review_due");

  return {
    thisWeek,
    history,
    nextReview: upcomingReviews[0] ?? overdueReviews[0] ?? null,
    completedWeek,
  };
}
