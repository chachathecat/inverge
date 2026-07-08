"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  resolveNotificationStatusCopy,
  resolveSubscribeCompletionState,
  type NotificationSupportState,
  type NotificationUiStatus,
} from "@/lib/notifications/subscription-ui-state";

type NotificationSettings = {
  enabled: boolean;
  timezone: string;
  reminderDays: number[];
  reminderTime: string;
};

type SettingsResponse = {
  ok: boolean;
  settings?: NotificationSettings;
  activeSubscriptionCount?: number;
  vapidPublicKey?: string | null;
  vapidPublicKeyConfigured?: boolean;
  status?: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

type SaveSettingsOptions = {
  successStatus?: NotificationUiStatus;
  failureStatus?: NotificationUiStatus;
  failureMessage?: string;
};

const WEEKDAYS = [
  { value: 0, label: "일" },
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
] as const;

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  timezone: "Asia/Seoul",
  reminderDays: [1, 2, 3, 4, 5],
  reminderTime: "09:00",
};

function browserPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

function isIosLike() {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform ?? "";
  return /iPhone|iPad|iPod/.test(platform) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function supportState(): NotificationSupportState {
  if (typeof window === "undefined") return "loading";
  if (!("serviceWorker" in navigator)) return "service-worker-unsupported";
  if (!("PushManager" in window)) return "push-unsupported";
  if (typeof Notification === "undefined") return "notification-unsupported";
  if (isIosLike() && !isStandaloneMode()) return "ios-not-standalone";
  return "supported";
}

export function NotificationSettingsClient() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => browserPermission());
  const [support] = useState(() => supportState());
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [vapidConfigured, setVapidConfigured] = useState(false);
  const [activeSubscriptionCount, setActiveSubscriptionCount] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const subscribed = activeSubscriptionCount > 0;
  const canSubscribe = support === "supported" && permission !== "denied" && Boolean(vapidPublicKey);
  const statusCopy = useMemo(() => {
    return resolveNotificationStatusCopy({
      status,
      support,
      permission,
      vapidConfigured,
      activeSubscriptionCount,
      settingsEnabled: settings.enabled,
    });
  }, [activeSubscriptionCount, permission, settings.enabled, status, support, vapidConfigured]);

  useEffect(() => {
    fetch("/api/notifications/settings", { cache: "no-store" })
      .then((response) => response.json() as Promise<SettingsResponse>)
      .then((data) => {
        if (!data.ok || !data.settings) {
          setStatus(data.status === "server_unavailable" ? "local-only" : "load-error");
          setError("알림 설정을 불러오지 못했습니다.");
          return;
        }
        setSettings(data.settings);
        setActiveSubscriptionCount(data.activeSubscriptionCount ?? 0);
        setVapidPublicKey(data.vapidPublicKey ?? null);
        setVapidConfigured(data.vapidPublicKeyConfigured === true);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("load-error");
        setError("알림 설정을 불러오지 못했습니다.");
      });
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function toggleDay(day: number) {
    setSettings((current) => {
      const hasDay = current.reminderDays.includes(day);
      const reminderDays = hasDay
        ? current.reminderDays.filter((value) => value !== day)
        : [...current.reminderDays, day].sort((left, right) => left - right);
      return { ...current, reminderDays: reminderDays.length > 0 ? reminderDays : current.reminderDays };
    });
  }

  async function saveSettings(nextSettings = settings, options: SaveSettingsOptions = {}) {
    setError(null);
    setStatus("saving");
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nextSettings),
      });
      const data = await response.json().catch(() => null) as SettingsResponse | null;
      if (!response.ok || !data?.ok) {
        setStatus(options.failureStatus ?? "save-error");
        setError(options.failureMessage ?? "알림 설정을 저장하지 못했습니다.");
        return false;
      }
      setSettings(data.settings ?? nextSettings);
      setStatus(options.successStatus ?? "saved");
      return true;
    } catch {
      setStatus(options.failureStatus ?? "save-error");
      setError(options.failureMessage ?? "알림 설정을 저장하지 못했습니다.");
      return false;
    }
  }

  async function subscribe() {
    setError(null);
    if (!canSubscribe || !vapidPublicKey) return;
    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission !== "granted") return;

    try {
      setStatus("subscribing");
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const createdSubscription = existing ? null : subscription;
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...subscription.toJSON(),
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        }),
      });
      if (!response.ok) {
        await createdSubscription?.unsubscribe().catch(() => false);
        throw new Error("subscribe-failed");
      }
      const nextSettings = { ...settings, enabled: true };
      setActiveSubscriptionCount(1);
      setSettings(nextSettings);
      const settingsSaved = await saveSettings(nextSettings, {
        successStatus: "subscribed",
        failureStatus: "subscription_saved_schedule_failed",
        failureMessage: "알림 구독은 연결됐지만 일정 저장에 실패했습니다. 일정 저장을 다시 시도해 주세요.",
      });
      const outcome = resolveSubscribeCompletionState({
        subscriptionSaved: true,
        preferenceSaved: settingsSaved,
      });
      setActiveSubscriptionCount(outcome.activeSubscriptionCount);
      setStatus(outcome.status);
    } catch {
      const outcome = resolveSubscribeCompletionState({
        subscriptionSaved: false,
        preferenceSaved: false,
      });
      setActiveSubscriptionCount(outcome.activeSubscriptionCount);
      setStatus(outcome.status);
      setError("알림 구독을 저장하지 못했습니다.");
    }
  }

  async function retryScheduleSave() {
    const nextSettings = { ...settings, enabled: true };
    setSettings(nextSettings);
    const settingsSaved = await saveSettings(nextSettings, {
      successStatus: "subscribed",
      failureStatus: "subscription_saved_schedule_failed",
      failureMessage: "알림 구독은 연결됐지만 일정 저장에 실패했습니다. 일정 저장을 다시 시도해 주세요.",
    });
    const outcome = resolveSubscribeCompletionState({
      subscriptionSaved: true,
      preferenceSaved: settingsSaved,
    });
    setActiveSubscriptionCount(outcome.activeSubscriptionCount);
    setStatus(outcome.status);
  }

  async function unsubscribe() {
    setError(null);
    try {
      setStatus("unsubscribing");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;
      await subscription?.unsubscribe().catch(() => false);
      const response = await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      if (!response.ok) throw new Error("unsubscribe-failed");
      setActiveSubscriptionCount(0);
      setStatus("unsubscribed");
    } catch {
      setStatus("save-error");
      setError("알림 구독 해제를 저장하지 못했습니다.");
    }
  }

  async function sendTest() {
    setError(null);
    try {
      setStatus("testing");
      const response = await fetch("/api/notifications/test", { method: "POST" });
      const data = await response.json().catch(() => null) as { ok?: boolean; status?: string } | null;
      if (!response.ok || !data?.ok) {
        setStatus(data?.status === "vapid_not_configured" ? "vapid-missing" : "test-error");
        setError("테스트 알림을 보내지 못했습니다.");
        return;
      }
      setStatus("test-sent");
    } catch {
      setStatus("test-error");
      setError("테스트 알림을 보내지 못했습니다.");
    }
  }

  return (
    <section className="space-y-5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[color:var(--surface)] p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-xs font-medium text-[color:var(--muted)]">PWA 알림</p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[color:var(--foreground-strong)]">오늘 할 일 알림</h1>
        <p className="text-sm leading-7 text-[color:var(--muted)]">알림에는 문제·답안·계산 내용이 포함되지 않습니다.</p>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm leading-7 text-[color:var(--foreground-strong)]" role="status" aria-live="polite">
        {statusCopy}
        {status === "local-only" ? <p className="text-[color:var(--muted)]">서버 저장이 불가능해 현재 브라우저에서만 상태를 확인할 수 있습니다.</p> : null}
        {error ? <p className="text-[color:var(--foreground-strong)]">{error}</p> : null}
      </div>

      {support === "ios-not-standalone" ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-3 text-sm leading-7 text-[color:var(--muted)]">
          Safari 공유 버튼에서 홈 화면에 추가를 선택한 뒤, 홈 화면의 Inverge 앱에서 다시 알림을 허용해 주세요.
        </div>
      ) : null}

      {installPrompt ? (
        <Button type="button" variant="outline" onClick={() => installPrompt.prompt()}>
          홈 화면에 추가
        </Button>
      ) : null}

      <div className="space-y-4">
        <label className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-[color:var(--foreground-strong)]">알림 사용</span>
            <span className="block text-xs leading-5 text-[color:var(--muted)]">오늘 할 일, 복습, 계산 회복이 있을 때만 보냅니다.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
            className="h-5 w-5"
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[color:var(--foreground-strong)]">요일</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`min-h-10 rounded-full border px-4 text-sm font-medium ${
                  settings.reminderDays.includes(day.value)
                    ? "border-[color:var(--brand-700)] bg-[color:var(--brand-900)] text-[color:var(--text-inverse)]"
                    : "border-[var(--border-subtle)] text-[color:var(--muted)]"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--foreground-strong)]">시간</span>
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(event) => setSettings((current) => ({ ...current, reminderTime: event.target.value }))}
              className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[color:var(--surface)] px-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--foreground-strong)]">시간대</span>
            <input
              value={settings.timezone}
              onChange={(event) => setSettings((current) => ({ ...current, timezone: event.target.value }))}
              className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[color:var(--surface)] px-3"
              placeholder="Asia/Seoul"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" onClick={() => saveSettings()} disabled={status === "saving"}>
          설정 저장
        </Button>
        <Button type="button" variant="outline" onClick={subscribe} disabled={!canSubscribe || status === "subscribing"}>
          알림 허용하고 구독
        </Button>
        {status === "subscription_saved_schedule_failed" ? (
          <Button type="button" variant="outline" onClick={retryScheduleSave}>
            일정 저장 다시 시도
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={sendTest} disabled={!subscribed || status === "testing"}>
          테스트 알림 보내기
        </Button>
        <Button type="button" variant="ghost" onClick={unsubscribe} disabled={!subscribed || status === "unsubscribing"}>
          구독 해제
        </Button>
      </div>
    </section>
  );
}
