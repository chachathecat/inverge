"use client";

import type { AppraisalMode } from "@/lib/review-os/appraisal";

export type LocalLearnerAnalyticsEvent = {
  event: string;
  surface?: "learner_shell" | "capture";
  route?: string;
  mode?: AppraisalMode;
  action?: string;
  subject?: string;
  sourceType?: string;
  status?: "clicked" | "saved" | "started";
  createdFromCapture?: boolean;
  nextTaskType?: string;
  metadataOnly: true;
  safeUse: "closed_beta_local_analytics";
};

declare global {
  interface Window {
    dataLayer?: LocalLearnerAnalyticsEvent[];
    invergeDataLayer?: LocalLearnerAnalyticsEvent[];
  }
}

function safeString(value: unknown, maxLength = 96) {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function safeMode(value: unknown): AppraisalMode | undefined {
  return value === "first" || value === "second" ? value : undefined;
}

function safeBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export function sanitizeLocalLearnerAnalyticsEvent(input: Record<string, unknown>): LocalLearnerAnalyticsEvent {
  return {
    event: safeString(input.event, 64) ?? "learner_event",
    surface: input.surface === "learner_shell" || input.surface === "capture" ? input.surface : undefined,
    route: safeString(input.route, 96),
    mode: safeMode(input.mode),
    action: safeString(input.action, 64),
    subject: safeString(input.subject, 64),
    sourceType: safeString(input.sourceType, 32),
    status: input.status === "clicked" || input.status === "saved" || input.status === "started" ? input.status : undefined,
    createdFromCapture: safeBoolean(input.createdFromCapture),
    nextTaskType: safeString(input.nextTaskType, 64),
    metadataOnly: true,
    safeUse: "closed_beta_local_analytics",
  };
}

export function ensureLocalLearnerAnalyticsBuffer() {
  if (typeof window === "undefined") return null;
  window.invergeDataLayer ??= [];
  window.dataLayer ??= window.invergeDataLayer;
  return window.invergeDataLayer;
}

export function pushLocalLearnerAnalyticsEvent(input: Record<string, unknown>) {
  const buffer = ensureLocalLearnerAnalyticsBuffer();
  if (!buffer) return null;
  const event = sanitizeLocalLearnerAnalyticsEvent(input);
  buffer.push(event);
  if (window.dataLayer && window.dataLayer !== buffer) {
    window.dataLayer.push(event);
  }
  return event;
}
