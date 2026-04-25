"use client";

import { MVP_USER_ID, type SubjectId } from "@/lib/appraisal-first/types";

type UserScopedKeyInput = {
  userId: string;
  feature: "onboarding-draft" | "past-set-draft";
  subjectId?: SubjectId;
  entityId?: string;
};

const APPRAISAL_FIRST_STORAGE_PREFIX = "inverge:appraisal-first";

export function getAppraisalFirstBrowserUserId(userId: string | null, isDemo = false) {
  if (userId) return userId;
  if (isDemo) return MVP_USER_ID;
  return null;
}

export function buildUserScopedKey({ userId, feature, subjectId, entityId }: UserScopedKeyInput) {
  const parts = [`${APPRAISAL_FIRST_STORAGE_PREFIX}:user:${userId}`, feature];
  if (subjectId) parts.push(subjectId);
  if (entityId) parts.push(entityId);
  return parts.join(":");
}

export function clearAppraisalFirstBrowserState() {
  if (typeof window === "undefined") return;

  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && key.startsWith(APPRAISAL_FIRST_STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}

