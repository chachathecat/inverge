"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FailureAwareState } from "@/components/learner";
import type { CalculatorRoutineCompletionSignalV1 } from "@/lib/review-os/calculator-routine";
import {
  buildCalculatorRoutineOfflineEvidence,
  CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY,
  CALCULATOR_ROUTINE_OUTBOX_WEB_LOCK,
  enqueueCalculatorRoutineCompletion,
  isSameCalculatorRoutineCompletion,
  parseCalculatorRoutineDurableReceipt,
  readCalculatorRoutineOutbox,
  removeCalculatorRoutineOutboxEntry,
  type CalculatorRoutineOutboxEntryV1,
} from "@/lib/review-os/calculator-routine-outbox";
import type { FailureAwareStateEvidence } from "@/lib/review-os/failure-aware-state";

export type CalculatorRoutineSyncStatus =
  | "saved"
  | "deduped"
  | "offline"
  | "pending"
  | "local_only"
  | "account_mismatch"
  | "failed";

export type CalculatorRoutineSyncState = {
  status: "idle" | "syncing" | CalculatorRoutineSyncStatus;
  retryAvailable: boolean;
  offlineEvidence: Extract<FailureAwareStateEvidence, { kind: "offline" }> | null;
};

type TransportOutcome =
  | Readonly<{
      kind: "receipt";
      receipt: NonNullable<ReturnType<typeof parseCalculatorRoutineDurableReceipt>>;
      body: unknown;
    }>
  | Readonly<{ kind: "auth" | "terminal" | "retryable" }>;

type AccountScopeOutcome =
  | Readonly<{ kind: "ready"; accountScope: string }>
  | Readonly<{ kind: "auth" | "unavailable" }>;

type PageAccountScopeOutcome =
  | AccountScopeOutcome
  | Readonly<{ kind: "account_mismatch" }>;

type NavigatorLockManager = {
  request<T>(
    name: string,
    options: { mode: "exclusive" },
    callback: () => Promise<T>,
  ): Promise<T>;
};

type BrowserLockOutcome<T> =
  | Readonly<{ status: "ran"; value: T }>
  | Readonly<{ status: "unavailable" }>;

const DELIVERY_TIMEOUT_MS = 15_000;
const SESSION_SCOPE_TIMEOUT_MS = 10_000;
const AUTOMATIC_RETRY_DELAY_MS = 5_000;
const AUTOMATIC_RETRY_MAX_DELAY_MS = 60_000;
const AUTOMATIC_RETRY_MAX_ATTEMPTS = 6;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let localSyncTail: Promise<void> = Promise.resolve();

async function withBrowserSyncLock<T>(
  task: () => Promise<T>,
): Promise<BrowserLockOutcome<T>> {
  let resolveRun!: (value: BrowserLockOutcome<T>) => void;
  const result = new Promise<BrowserLockOutcome<T>>((resolve) => {
    resolveRun = resolve;
  });

  localSyncTail = localSyncTail.then(async () => {
    try {
      const lockManager = (window.navigator as Navigator & { locks?: NavigatorLockManager })
        .locks;
      if (!lockManager) {
        resolveRun({ status: "unavailable" });
        return;
      }
      const value = await lockManager.request(
        CALCULATOR_ROUTINE_OUTBOX_WEB_LOCK,
        { mode: "exclusive" },
        task,
      );
      resolveRun({ status: "ran", value });
    } catch {
      resolveRun({ status: "unavailable" });
    }
  });
  localSyncTail = localSyncTail.catch(() => undefined);
  return result;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function sha256Hex(value: string) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function readAuthenticatedAccountScope(): Promise<AccountScopeOutcome> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    SESSION_SCOPE_TIMEOUT_MS,
  );
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) return { kind: "auth" };
    if (!response.ok) return { kind: "unavailable" };
    const body = (await response.json().catch(() => null)) as unknown;
    if (!isPlainRecord(body) || body.ok !== true || !isPlainRecord(body.session)) {
      return { kind: "unavailable" };
    }
    const session = body.session;
    const authenticatedUserId =
      session.isAuthenticated === true &&
      typeof session.userId === "string" &&
      UUID_PATTERN.test(session.userId)
        ? session.userId.toLowerCase()
        : null;
    const demoUserId =
      session.authEnabled === false &&
      session.isDemo === true &&
      typeof session.userId === "string" &&
      session.userId === "mvp-user"
        ? session.userId
        : null;
    const scopeSeed = authenticatedUserId
      ? `authenticated:${authenticatedUserId}`
      : demoUserId
        ? `demo:${demoUserId}`
        : null;
    if (!scopeSeed) return { kind: "auth" };
    const accountScope = await sha256Hex(scopeSeed);
    return accountScope
      ? { kind: "ready", accountScope }
      : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  } finally {
    window.clearTimeout(timeout);
  }
}

async function deliverCalculatorRoutineCompletion(
  signal: CalculatorRoutineCompletionSignalV1,
): Promise<TransportOutcome> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  try {
    const response = await fetch("/api/os/calculator-routine/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signal),
      signal: controller.signal,
    });
    if (response.status === 401) return { kind: "auth" };
    if (
      response.status === 400 ||
      response.status === 402 ||
      response.status === 403 ||
      response.status === 404 ||
      response.status === 422
    ) {
      return { kind: "terminal" };
    }
    if (!response.ok) return { kind: "retryable" };
    const body = (await response.json().catch(() => null)) as unknown;
    const receipt = parseCalculatorRoutineDurableReceipt(body);
    return receipt ? { kind: "receipt", receipt, body } : { kind: "retryable" };
  } catch {
    return { kind: "retryable" };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useCalculatorRoutineLearningSignalSync() {
  const [status, setStatus] =
    useState<CalculatorRoutineSyncState["status"]>("idle");
  const [lastSignal, setLastSignal] =
    useState<CalculatorRoutineCompletionSignalV1 | null>(null);
  const [offlineEvidence, setOfflineEvidence] = useState<
    CalculatorRoutineSyncState["offlineEvidence"]
  >(null);
  const [accountScopeReady, setAccountScopeReady] = useState(false);
  const autoSyncRegisteredRef = useRef(false);
  const mountedRef = useRef(false);
  const accountScopeRef = useRef<string | null>(null);
  const operationGenerationRef = useRef(0);
  const automaticRetryTimerRef = useRef<number | null>(null);
  const automaticRetryAttemptRef = useRef(0);
  const flushOutboxRef = useRef<() => Promise<void>>(async () => undefined);

  const isCurrentOperation = useCallback(
    (generation: number) =>
      mountedRef.current && operationGenerationRef.current === generation,
    [],
  );

  const clearAutomaticRetry = useCallback(() => {
    if (automaticRetryTimerRef.current !== null) {
      window.clearTimeout(automaticRetryTimerRef.current);
      automaticRetryTimerRef.current = null;
    }
    automaticRetryAttemptRef.current = 0;
  }, []);

  const scheduleAutomaticRetry = useCallback(() => {
    if (automaticRetryTimerRef.current !== null) {
      window.clearTimeout(automaticRetryTimerRef.current);
      automaticRetryTimerRef.current = null;
    }
    if (automaticRetryAttemptRef.current >= AUTOMATIC_RETRY_MAX_ATTEMPTS) return;
    const delay = Math.min(
      AUTOMATIC_RETRY_DELAY_MS * 2 ** automaticRetryAttemptRef.current,
      AUTOMATIC_RETRY_MAX_DELAY_MS,
    );
    automaticRetryAttemptRef.current += 1;
    automaticRetryTimerRef.current = window.setTimeout(() => {
      automaticRetryTimerRef.current = null;
      void flushOutboxRef.current();
    }, delay);
  }, []);

  const resolvePageAccountScope = useCallback(async (): Promise<PageAccountScopeOutcome> => {
    const current = await readAuthenticatedAccountScope();
    if (current.kind !== "ready") {
      accountScopeRef.current = null;
      if (mountedRef.current) setAccountScopeReady(false);
      return current;
    }
    if (
      accountScopeRef.current &&
      accountScopeRef.current !== current.accountScope
    ) {
      accountScopeRef.current = null;
      if (mountedRef.current) setAccountScopeReady(false);
      return { kind: "account_mismatch" };
    }
    accountScopeRef.current = current.accountScope;
    if (mountedRef.current) setAccountScopeReady(true);
    return current;
  }, []);

  const invalidateAccountScope = useCallback(() => {
    accountScopeRef.current = null;
    if (mountedRef.current) setAccountScopeReady(false);
  }, []);

  const setQueuedState = useCallback(
    (entry: CalculatorRoutineOutboxEntryV1, generation: number) => {
      if (!isCurrentOperation(generation)) return;
      if (window.navigator.onLine) {
        setOfflineEvidence(null);
        setStatus("pending");
      } else {
        setOfflineEvidence(buildCalculatorRoutineOfflineEvidence(entry));
        setStatus("offline");
      }
    },
    [isCurrentOperation],
  );

  const enqueueForAutomaticSync = useCallback(
    (
      signal: CalculatorRoutineCompletionSignalV1,
      accountScope: string,
    ) => {
      if (!autoSyncRegisteredRef.current) return null;
      const outcome = enqueueCalculatorRoutineCompletion(
        window.localStorage,
        signal,
        { accountScope, autoSyncRegistered: true },
      );
      return outcome.status === "queued" ? outcome.entry : null;
    },
    [],
  );

  const flushOutbox = useCallback(async () => {
    if (!autoSyncRegisteredRef.current) return;
    const generation = operationGenerationRef.current;
    const locked = await withBrowserSyncLock(async () => {
      let accountScope = accountScopeRef.current;
      if (window.navigator.onLine) {
        const resolvedScope = await resolvePageAccountScope();
        if (resolvedScope.kind !== "ready") return resolvedScope;
        accountScope = resolvedScope.accountScope;
      }

      const read = readCalculatorRoutineOutbox(window.localStorage);
      if (read.status !== "ready") {
        return { kind: "storage_unavailable" as const };
      }
      if (read.entries.length === 0) return { kind: "empty" as const };
      if (!accountScope) return { kind: "scope_unavailable" as const };

      const eligibleEntries = read.entries.filter(
        (entry) => entry.accountScope === accountScope,
      );
      if (eligibleEntries.length === 0) {
        return { kind: "account_mismatch" as const };
      }
      if (!window.navigator.onLine) {
        return { kind: "queued" as const, entry: eligibleEntries[0] };
      }

      let finalReceipt: "saved" | "deduped" | null = null;
      let terminalEntrySeen = false;
      for (const entry of eligibleEntries) {
        if (isCurrentOperation(generation)) setStatus("syncing");
        const delivered = await deliverCalculatorRoutineCompletion(entry.signal);
        if (delivered.kind === "receipt") {
          const removed = removeCalculatorRoutineOutboxEntry(
            window.localStorage,
            entry.queueId,
            delivered.body,
          );
          if (!removed) {
            return { kind: "storage_unavailable" as const, entry };
          }
          finalReceipt = delivered.receipt.status;
          continue;
        }
        if (delivered.kind === "auth") {
          return { kind: "auth" as const, entry };
        }
        if (delivered.kind === "terminal") {
          terminalEntrySeen = true;
          continue;
        }
        return { kind: "queued" as const, entry };
      }
      if (terminalEntrySeen) return { kind: "terminal" as const };
      return finalReceipt
        ? ({ kind: "receipt" as const, status: finalReceipt })
        : ({ kind: "empty" as const });
    });

    if (!isCurrentOperation(generation)) return;
    if (locked.status === "unavailable") {
      setOfflineEvidence(null);
      setStatus("failed");
      return;
    }

    const result = locked.value;
    if (result.kind === "receipt") {
      clearAutomaticRetry();
      setOfflineEvidence(null);
      setStatus(result.status);
    } else if (result.kind === "queued") {
      setQueuedState(result.entry, generation);
      if (window.navigator.onLine) scheduleAutomaticRetry();
    } else if (result.kind === "empty") {
      clearAutomaticRetry();
      setOfflineEvidence(null);
      setStatus((current) =>
        current === "offline" || current === "pending" || current === "syncing"
          ? "idle"
          : current,
      );
    } else if (result.kind === "auth") {
      clearAutomaticRetry();
      setOfflineEvidence(null);
      setStatus("local_only");
    } else if (result.kind === "account_mismatch") {
      clearAutomaticRetry();
      setOfflineEvidence(null);
      setStatus("account_mismatch");
    } else if (
      result.kind === "storage_unavailable" ||
      result.kind === "scope_unavailable" ||
      result.kind === "unavailable"
    ) {
      setOfflineEvidence(null);
      setStatus("failed");
      if (window.navigator.onLine) scheduleAutomaticRetry();
    } else if (result.kind === "terminal") {
      clearAutomaticRetry();
      setOfflineEvidence(null);
      setStatus("failed");
    }
  }, [
    clearAutomaticRetry,
    isCurrentOperation,
    resolvePageAccountScope,
    scheduleAutomaticRetry,
    setQueuedState,
  ]);

  useEffect(() => {
    flushOutboxRef.current = flushOutbox;
  }, [flushOutbox]);

  useEffect(() => {
    mountedRef.current = true;
    autoSyncRegisteredRef.current = true;
    const onOnline = () => {
      if (
        document.visibilityState !== "visible" ||
        !document.hasFocus()
      ) {
        invalidateAccountScope();
        return;
      }
      clearAutomaticRetry();
      void flushOutbox();
    };
    const onOffline = () => clearAutomaticRetry();
    const onStorage = (event: StorageEvent) => {
      invalidateAccountScope();
      if (event.key === CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY) {
        clearAutomaticRetry();
        void flushOutbox();
      } else if (window.navigator.onLine) {
        void flushOutbox();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        invalidateAccountScope();
      } else if (window.navigator.onLine) {
        clearAutomaticRetry();
        void flushOutbox();
      }
    };
    const onBlur = () => invalidateAccountScope();
    const onFocus = () => {
      if (window.navigator.onLine) {
        clearAutomaticRetry();
        void flushOutbox();
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("storage", onStorage);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    void flushOutbox();
    return () => {
      autoSyncRegisteredRef.current = false;
      mountedRef.current = false;
      clearAutomaticRetry();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [clearAutomaticRetry, flushOutbox, invalidateAccountScope]);

  const syncCompletion = useCallback(
    async (signal: CalculatorRoutineCompletionSignalV1) => {
      const generation = operationGenerationRef.current + 1;
      operationGenerationRef.current = generation;
      clearAutomaticRetry();
      setLastSignal(signal);
      setOfflineEvidence(null);

      const locked = await withBrowserSyncLock(async () => {
        if (!window.navigator.onLine) {
          if (
            document.visibilityState !== "visible" ||
            !document.hasFocus()
          ) {
            invalidateAccountScope();
            return { kind: "scope_unavailable" as const };
          }
          const accountScope = accountScopeRef.current;
          if (!accountScope) return { kind: "scope_unavailable" as const };
          const entry = enqueueForAutomaticSync(signal, accountScope);
          return entry
            ? ({ kind: "queued" as const, entry })
            : ({ kind: "storage_unavailable" as const });
        }

        const resolvedScope = await resolvePageAccountScope();
        if (resolvedScope.kind !== "ready") return resolvedScope;
        if (isCurrentOperation(generation)) setStatus("syncing");
        const read = readCalculatorRoutineOutbox(window.localStorage);
        if (read.status !== "ready") {
          return { kind: "storage_unavailable" as const };
        }
        const queuedEntry = read.entries.find(
          (entry) =>
            entry.accountScope === resolvedScope.accountScope &&
            isSameCalculatorRoutineCompletion(entry.signal, signal),
        );
        const delivered = await deliverCalculatorRoutineCompletion(
          queuedEntry?.signal ?? signal,
        );
        if (delivered.kind === "receipt") {
          if (!queuedEntry) return delivered;
          const removed = removeCalculatorRoutineOutboxEntry(
            window.localStorage,
            queuedEntry.queueId,
            delivered.body,
          );
          return removed
            ? delivered
            : ({ kind: "storage_unavailable" as const, entry: queuedEntry });
        }
        if (delivered.kind === "auth") return { kind: "auth" as const };
        if (delivered.kind === "terminal") return { kind: "terminal" as const };
        if (queuedEntry) return { kind: "queued" as const, entry: queuedEntry };
        const entry = enqueueForAutomaticSync(
          signal,
          resolvedScope.accountScope,
        );
        return entry
          ? ({ kind: "queued" as const, entry })
          : ({ kind: "storage_unavailable" as const });
      });

      if (!isCurrentOperation(generation)) return;
      if (locked.status === "unavailable") {
        setStatus("failed");
        return;
      }
      const result = locked.value;
      if (result.kind === "receipt") {
        setLastSignal(null);
        setStatus(result.receipt.status);
      } else if (result.kind === "queued") {
        setLastSignal(null);
        setQueuedState(result.entry, generation);
        if (window.navigator.onLine) scheduleAutomaticRetry();
      } else if (result.kind === "auth") {
        setLastSignal(null);
        setStatus("local_only");
      } else if (result.kind === "account_mismatch") {
        setLastSignal(null);
        setStatus("account_mismatch");
      } else if (result.kind === "terminal") {
        setLastSignal(null);
        setStatus("failed");
      } else if (
        result.kind === "storage_unavailable" ||
        result.kind === "scope_unavailable" ||
        result.kind === "unavailable"
      ) {
        setStatus("failed");
      }
    },
    [
      clearAutomaticRetry,
      enqueueForAutomaticSync,
      invalidateAccountScope,
      isCurrentOperation,
      resolvePageAccountScope,
      scheduleAutomaticRetry,
      setQueuedState,
    ],
  );

  const retry = useCallback(() => {
    if (lastSignal) {
      void syncCompletion(lastSignal);
    } else {
      void flushOutbox();
    }
  }, [flushOutbox, lastSignal, syncCompletion]);

  const reset = useCallback(() => {
    operationGenerationRef.current += 1;
    clearAutomaticRetry();
    setStatus("idle");
    setLastSignal(null);
    setOfflineEvidence(null);
  }, [clearAutomaticRetry]);

  return {
    status,
    accountScopeReady,
    offlineEvidence,
    reset,
    retry,
    retryAvailable: status === "failed" && Boolean(lastSignal),
    syncCompletion,
  };
}

export function CalculatorRoutineSyncStatusLine({
  status,
  offlineEvidence,
  retryAvailable,
  onRetry,
}: {
  status: CalculatorRoutineSyncState["status"];
  offlineEvidence?: CalculatorRoutineSyncState["offlineEvidence"];
  retryAvailable?: boolean;
  onRetry?: () => void;
}) {
  if (status === "idle") return null;
  if (status === "offline" && offlineEvidence) {
    return (
      <FailureAwareState
        evidence={offlineEvidence}
        testId="calculator-routine-outbox-offline"
      />
    );
  }

  const copy =
    status === "syncing"
      ? "학습 신호 저장 중"
      : status === "saved"
        ? "학습 기록에 연결됨"
        : status === "deduped"
          ? "이미 연결된 학습 기록입니다"
          : status === "pending"
            ? "저장 확인을 기다리는 항목이 대기열에 있습니다. 자동으로 다시 시도합니다"
            : status === "local_only"
              ? "로그인이 필요해 저장 여부를 확인하지 못했습니다"
              : status === "account_mismatch"
                ? "현재 계정과 다른 대기 항목은 전송하지 않았습니다"
                : status === "offline"
                  ? "기기 전송 대기열을 확인할 수 없습니다"
                  : "학습 기록 연결 실패";

  return (
    <div
      className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs leading-5 text-[color:var(--muted)]"
      data-calculator-routine-sync-state={status}
      role="status"
      aria-live="polite"
    >
      <span>{copy}</span>
      {retryAvailable && onRetry ? (
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 font-medium text-[color:var(--foreground-strong)] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-700)]"
          onClick={onRetry}
        >
          다시 시도
        </button>
      ) : null}
    </div>
  );
}
