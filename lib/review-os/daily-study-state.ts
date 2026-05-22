import type { AppraisalMode } from "@/lib/review-os/appraisal";

export type DailyStudyDisplayState =
  | "first_capture"
  | "start_today_task"
  | "overdue_recovery"
  | "post_completion"
  | "evening_capture";

type ResolveDailyStudyStateInput = {
  hasNoData: boolean;
  hasDueQueue: boolean;
  hasOverdueQueue: boolean;
  savedToday: boolean;
  completedToday: boolean;
  mode: AppraisalMode;
};

export function resolveDailyStudyState(input: ResolveDailyStudyStateInput): DailyStudyDisplayState {
  if (input.completedToday) return "post_completion";
  if (input.hasOverdueQueue) return "overdue_recovery";
  if (input.hasNoData) return "first_capture";
  if (input.savedToday && !input.hasDueQueue) return "evening_capture";
  return "start_today_task";
}


export function isOverdueDueAt(dueAt: string, now = Date.now()): boolean {
  const dueTime = Date.parse(dueAt);
  return Number.isFinite(dueTime) && dueTime < now;
}


const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getKstDayKey(date = new Date()): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 10);
}

export function isSameKstDay(iso: string, now = new Date()): boolean {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return false;
  return getKstDayKey(target) === getKstDayKey(now);
}
