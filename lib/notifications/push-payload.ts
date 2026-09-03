export const NOTIFICATION_ALLOWED_URLS = ["/app", "/app/review"] as const;
export const NOTIFICATION_ALLOWED_TYPES = ["today", "review", "calculator_recovery", "test"] as const;
export const NOTIFICATION_ALLOWED_KEYS = ["type", "title", "body", "url", "notificationId", "tag"] as const;

export type NotificationPayloadType = (typeof NOTIFICATION_ALLOWED_TYPES)[number];
export type NotificationUrl = (typeof NOTIFICATION_ALLOWED_URLS)[number];

export type NotificationPayload = {
  type: NotificationPayloadType;
  title: string;
  body: string;
  url: NotificationUrl;
  notificationId: string;
  tag: string;
};

const ALLOWED_URL_SET = new Set<string>(NOTIFICATION_ALLOWED_URLS);
const ALLOWED_TYPE_SET = new Set<string>(NOTIFICATION_ALLOWED_TYPES);
const ALLOWED_KEY_SET = new Set<string>(NOTIFICATION_ALLOWED_KEYS);
const MAX_TITLE_LENGTH = 80;
const MAX_BODY_LENGTH = 120;
const MAX_ID_LENGTH = 96;
const MAX_TAG_LENGTH = 64;

const FORBIDDEN_RAW_DATA_KEY_PATTERN =
  /(raw|ocr|problem|question|answer|official|modelAnswer|formula|formulas|number|numbers|unit|units|casio|keystroke|display|expected|verificationMemo|mistakeMemo|score|pass|fail|instructor|comment|sourceText|fullText|originalText)/i;

const FORBIDDEN_NOTIFICATION_COPY_PATTERNS = [
  /공식\s*채점/,
  /공식\s*답안/,
  /모범\s*답안/,
  /기준\s*답안/,
  /점수\s*예측/,
  /합격\s*예측/,
  /합격\s*가능성\s*확정/,
  /pass\s*\/?\s*fail/i,
  /score\s*prediction/i,
  /official\s*(grading|answer|score)/i,
  /model\s*answer/i,
  /CASIO/i,
  /RUN-MAT/i,
  /EXE\b/i,
  /[0-9]+(?:\.[0-9]+)?\s*(?:원|만원|㎡|m2|%|점|년|개월|일|회|kg|g|cm|mm)/i,
];

const DEFAULT_COPY: Record<NotificationPayloadType, Pick<NotificationPayload, "title" | "body" | "url" | "tag">> = {
  review: {
    title: "복습할 항목이 준비되어 있습니다",
    body: "Inverge에서 오늘 복습을 확인하세요.",
    url: "/app/review",
    tag: "inverge-review",
  },
  calculator_recovery: {
    title: "계산·검토 회복 항목이 있습니다",
    body: "Inverge에서 오늘 할 일을 확인하세요.",
    url: "/app",
    tag: "inverge-calculator-recovery",
  },
  today: {
    title: "오늘 할 일이 준비되어 있습니다",
    body: "Inverge에서 오늘 계획을 확인하세요.",
    url: "/app",
    tag: "inverge-today",
  },
  test: {
    title: "Inverge 알림 테스트",
    body: "알림이 정상적으로 연결되었습니다.",
    url: "/app",
    tag: "inverge-test",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertNoForbiddenNotificationData(value: unknown, path = "payload"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenNotificationData(entry, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RAW_DATA_KEY_PATTERN.test(key)) {
      throw new Error(`notification-raw-field-rejected:${path}.${key}`);
    }
    assertNoForbiddenNotificationData(nested, `${path}.${key}`);
  }
}

function assertSafeNotificationCopy(value: string, field: "title" | "body") {
  if (value.trim() !== value || value.length === 0) {
    throw new Error(`notification-invalid-${field}`);
  }
  if (field === "title" && value.length > MAX_TITLE_LENGTH) {
    throw new Error("notification-title-too-long");
  }
  if (field === "body" && value.length > MAX_BODY_LENGTH) {
    throw new Error("notification-body-too-long");
  }
  const forbidden = FORBIDDEN_NOTIFICATION_COPY_PATTERNS.find((pattern) => pattern.test(value));
  if (forbidden) throw new Error(`notification-forbidden-copy:${String(forbidden)}`);
}

function requireString(value: unknown, field: keyof NotificationPayload, maxLength: number) {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0 || value.length > maxLength) {
    throw new Error(`notification-invalid-${field}`);
  }
  return value;
}

export function validateNotificationPayload(input: unknown): NotificationPayload {
  assertNoForbiddenNotificationData(input);
  if (!isRecord(input)) throw new Error("notification-payload-invalid");
  const keys = Object.keys(input);
  if (keys.length !== NOTIFICATION_ALLOWED_KEYS.length || keys.some((key) => !ALLOWED_KEY_SET.has(key))) {
    throw new Error("notification-payload-keys-invalid");
  }

  const type = requireString(input.type, "type", 32);
  if (!ALLOWED_TYPE_SET.has(type)) throw new Error("notification-type-invalid");

  const title = requireString(input.title, "title", MAX_TITLE_LENGTH);
  const body = requireString(input.body, "body", MAX_BODY_LENGTH);
  assertSafeNotificationCopy(title, "title");
  assertSafeNotificationCopy(body, "body");

  const url = requireString(input.url, "url", 16);
  if (!ALLOWED_URL_SET.has(url)) throw new Error("notification-url-invalid");

  const notificationId = requireString(input.notificationId, "notificationId", MAX_ID_LENGTH);
  const tag = requireString(input.tag, "tag", MAX_TAG_LENGTH);

  return {
    type: type as NotificationPayloadType,
    title,
    body,
    url: url as NotificationUrl,
    notificationId,
    tag,
  };
}

export function buildNotificationPayloadCandidate(type: NotificationPayloadType, notificationId: string): unknown {
  const base = DEFAULT_COPY[type];
  return {
    type,
    title: base.title,
    body: base.body,
    url: base.url,
    notificationId,
    tag: base.tag,
  };
}

export function buildNotificationPayload(type: NotificationPayloadType, notificationId: string): NotificationPayload {
  return validateNotificationPayload(buildNotificationPayloadCandidate(type, notificationId));
}

export function sanitizeNotificationClickUrl(url: unknown): NotificationUrl {
  return typeof url === "string" && ALLOWED_URL_SET.has(url) ? (url as NotificationUrl) : "/app";
}
