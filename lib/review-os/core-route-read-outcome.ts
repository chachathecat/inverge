export const CORE_ROUTE_READ_SOURCES = [
  "today_focus",
  "today_items",
  "today_learning_signal_events",
  "today_daily_activity",
  "today_recent_study_log",
  "today_plan_tasks",
  "today_weekly_summary",
  "today_learning_signal_summary",
  "today_question_references",
  "review_queue",
  "review_calculator_candidates",
  "review_capture_details",
  "notes_items",
  "notes_learning_signal_events",
  "agenda_items",
  "agenda_review_queue",
  "agenda_usage_events",
  "weekly_plan",
  "weekly_learning_signal_summary",
  "weekly_learning_signal_events",
  "weekly_focus",
] as const;

export type CoreRouteReadSource = (typeof CORE_ROUTE_READ_SOURCES)[number];

export type EssentialCoreRouteReadOutcome<T> =
  | Readonly<{ status: "ready"; value: T }>
  | Readonly<{
      status: "unavailable";
      retryable: true;
      safety: Readonly<{ kind: "unknown"; preservationKnown: false }>;
    }>;

export type OptionalCoreRouteReadOutcome<T> =
  | Readonly<{ status: "ready"; value: T }>
  | Readonly<{
      status: "degraded";
      value: T;
      reason: "optional_read_unavailable";
    }>;

function logUnavailableRead(
  source: CoreRouteReadSource,
  criticality: "essential" | "optional",
) {
  // Keep observability metadata-only. The persistence/provider error and learner
  // context must never be copied into logs or learner-facing state.
  console.warn("[review-os] core route read unavailable", {
    source,
    criticality,
  });
}

export function readyEssentialCoreRouteRead<T>(
  value: T,
): EssentialCoreRouteReadOutcome<T> {
  return Object.freeze({ status: "ready", value });
}

export async function resolveEssentialCoreRouteRead<T>(
  source: CoreRouteReadSource,
  read: Promise<T> | (() => Promise<T>),
): Promise<EssentialCoreRouteReadOutcome<T>> {
  try {
    return readyEssentialCoreRouteRead(
      await (typeof read === "function" ? read() : read),
    );
  } catch {
    logUnavailableRead(source, "essential");
    return Object.freeze({
      status: "unavailable",
      retryable: true,
      safety: Object.freeze({
        kind: "unknown",
        preservationKnown: false,
      }),
    });
  }
}

export async function resolveOptionalCoreRouteRead<T>(
  source: CoreRouteReadSource,
  read: Promise<T> | (() => Promise<T>),
  fallback: () => T,
): Promise<OptionalCoreRouteReadOutcome<T>> {
  try {
    return Object.freeze({
      status: "ready",
      value: await (typeof read === "function" ? read() : read),
    });
  } catch {
    logUnavailableRead(source, "optional");
    return Object.freeze({
      status: "degraded",
      value: fallback(),
      reason: "optional_read_unavailable" as const,
    });
  }
}

export function countDegradedCoreRouteReads(
  outcomes: readonly OptionalCoreRouteReadOutcome<unknown>[],
) {
  return outcomes.filter((outcome) => outcome.status === "degraded").length;
}
