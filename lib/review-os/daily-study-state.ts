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
