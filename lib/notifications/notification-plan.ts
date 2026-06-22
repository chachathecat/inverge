import { buildNotificationPayload, type NotificationPayload, type NotificationPayloadType } from "./push-payload";

export type NotificationPlanInput = {
  userId: string;
  reviewQueueItems?: Array<{ id?: string; status?: string | null; prioritySignals?: string[] | null }>;
  calculatorSignals?: Array<{ id?: string; sourceType?: string | null; derivedTags?: string[] | null; metadataJson?: Record<string, unknown> | null }>;
  hasTodayPlanSignal?: boolean;
  notificationId: string;
};

export type NotificationPlan = {
  type: NotificationPayloadType;
  payload: NotificationPayload;
  reason: "review_queue_due" | "calculator_recovery_due" | "today_plan_due";
  metadataOnly: true;
};

export type ReminderPreference = {
  userId: string;
  enabled: boolean;
  timezone: string;
  reminderDays: number[];
  reminderTime: string;
};

export type LocalReminderWindow = {
  due: boolean;
  localDate: string;
  localDay: number;
  localMinutes: number;
  reminderMinutes: number;
};

const RAW_FIELD_PATTERN =
  /(raw|ocr|problemText|questionText|answerText|officialAnswer|formula|numbers|units|casio|displayValue|expectedAnswer|score|passFail|instructorComment)/i;

function assertMetadataOnly(value: unknown, path = "notificationPlanInput") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertMetadataOnly(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (RAW_FIELD_PATTERN.test(key)) throw new Error(`notification-plan-raw-field-rejected:${path}.${key}`);
    assertMetadataOnly(nested, `${path}.${key}`);
  }
}

function hasDueReview(input: NotificationPlanInput) {
  return (input.reviewQueueItems ?? []).some((item) => item.status === undefined || item.status === null || item.status === "pending");
}

function hasCalculatorRecovery(input: NotificationPlanInput) {
  return (input.calculatorSignals ?? []).some((event) => {
    const tags = event.derivedTags ?? [];
    const metadata = event.metadataJson ?? {};
    return (
      event.sourceType === "calculator-routine" &&
      (tags.includes("calculator_recovery") || tags.includes("review_candidate") || metadata.result === "wrong" || metadata.result === "unknown")
    );
  });
}

export function buildNotificationPlan(input: NotificationPlanInput): NotificationPlan | null {
  assertMetadataOnly(input);
  if (hasDueReview(input)) {
    return {
      type: "review",
      payload: buildNotificationPayload("review", input.notificationId),
      reason: "review_queue_due",
      metadataOnly: true,
    };
  }
  if (hasCalculatorRecovery(input)) {
    return {
      type: "calculator_recovery",
      payload: buildNotificationPayload("calculator_recovery", input.notificationId),
      reason: "calculator_recovery_due",
      metadataOnly: true,
    };
  }
  if (input.hasTodayPlanSignal) {
    return {
      type: "today",
      payload: buildNotificationPayload("today", input.notificationId),
      reason: "today_plan_due",
      metadataOnly: true,
    };
  }
  return null;
}

function parseReminderMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value);
  if (!match) throw new Error("notification-reminder-time-invalid");
  return Number(match[1]) * 60 + Number(match[2]);
}

function localParts(now: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    localDate: `${parts.year}-${parts.month}-${parts.day}`,
    localDay: dayMap[parts.weekday] ?? now.getUTCDay(),
    localMinutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function resolveLocalReminderWindow(
  preference: Pick<ReminderPreference, "timezone" | "reminderDays" | "reminderTime" | "enabled">,
  now = new Date(),
  windowMinutes = 59,
): LocalReminderWindow {
  const parts = localParts(now, preference.timezone);
  const reminderMinutes = parseReminderMinutes(preference.reminderTime);
  const minuteDelta = parts.localMinutes - reminderMinutes;
  return {
    ...parts,
    reminderMinutes,
    due: Boolean(
      preference.enabled &&
      preference.reminderDays.includes(parts.localDay) &&
      minuteDelta >= 0 &&
      minuteDelta <= windowMinutes,
    ),
  };
}

export function buildNotificationDeliveryKey(input: {
  userId: string;
  subscriptionId: string;
  type: NotificationPayloadType;
  localDate: string;
  reminderTime: string;
}) {
  return [
    "m418",
    input.userId,
    input.subscriptionId,
    input.localDate,
    input.reminderTime.slice(0, 5),
    input.type,
  ].join(":");
}
