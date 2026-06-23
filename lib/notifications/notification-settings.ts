export type NotificationSettings = {
  enabled: boolean;
  timezone: string;
  reminderDays: number[];
  reminderTime: string;
};

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  platform?: string;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  timezone: "Asia/Seoul",
  reminderDays: [1, 2, 3, 4, 5],
  reminderTime: "09:00",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeTimezone(value: unknown) {
  const timezone = typeof value === "string" && value.trim().length > 0 ? value.trim() : DEFAULT_NOTIFICATION_SETTINGS.timezone;
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    throw new Error("notification-timezone-invalid");
  }
}

export function normalizeReminderDays(value: unknown) {
  if (!Array.isArray(value)) throw new Error("notification-reminder-days-invalid");
  const days = [...new Set(value.map((day) => Number(day)))].sort((left, right) => left - right);
  if (days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error("notification-reminder-days-invalid");
  }
  return days;
}

export function normalizeReminderTime(value: unknown) {
  if (typeof value !== "string") throw new Error("notification-reminder-time-invalid");
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value.trim());
  if (!match) throw new Error("notification-reminder-time-invalid");
  return `${match[1]}:${match[2]}`;
}

export function parseNotificationSettingsInput(input: unknown): NotificationSettings {
  if (!isRecord(input)) throw new Error("notification-settings-invalid");
  return {
    enabled: input.enabled === true,
    timezone: normalizeTimezone(input.timezone),
    reminderDays: normalizeReminderDays(input.reminderDays),
    reminderTime: normalizeReminderTime(input.reminderTime),
  };
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null;
}

function requireSubscriptionText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0 || value.length > maxLength) {
    throw new Error(`notification-subscription-invalid-${field}`);
  }
  return value;
}

export function parsePushSubscriptionInput(input: unknown): PushSubscriptionInput {
  if (!isRecord(input) || !isRecord(input.keys)) throw new Error("notification-subscription-invalid");
  const endpoint = requireSubscriptionText(input.endpoint, "endpoint", 2048);
  if (!/^https:\/\//i.test(endpoint)) throw new Error("notification-subscription-invalid-endpoint");
  return {
    endpoint,
    keys: {
      p256dh: requireSubscriptionText(input.keys.p256dh, "p256dh", 512),
      auth: requireSubscriptionText(input.keys.auth, "auth", 256),
    },
    userAgent: normalizeOptionalText(input.userAgent, 512) ?? undefined,
    platform: normalizeOptionalText(input.platform, 80) ?? undefined,
  };
}

export function toNotificationSettings(row: Record<string, unknown> | null | undefined): NotificationSettings {
  if (!row) return DEFAULT_NOTIFICATION_SETTINGS;
  return {
    enabled: row.enabled === true,
    timezone: normalizeTimezone(row.timezone),
    reminderDays: normalizeReminderDays(row.reminder_days),
    reminderTime: normalizeReminderTime(row.reminder_time),
  };
}
