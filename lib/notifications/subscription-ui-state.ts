export type NotificationUiStatus =
  | "loading"
  | "ready"
  | "saving"
  | "saved"
  | "save-error"
  | "subscribe-error"
  | "subscription_saved_schedule_failed"
  | "subscribing"
  | "subscribed"
  | "unsubscribing"
  | "unsubscribed"
  | "testing"
  | "test-error"
  | "test-sent"
  | "vapid-missing"
  | "local-only"
  | "load-error"
  | string;

export type NotificationSupportState =
  | "loading"
  | "supported"
  | "service-worker-unsupported"
  | "push-unsupported"
  | "notification-unsupported"
  | "ios-not-standalone";

export type SubscribeCompletionInput = {
  subscriptionSaved: boolean;
  preferenceSaved: boolean;
};

export type SubscribeCompletionState = {
  status: NotificationUiStatus;
  activeSubscriptionCount: number;
  scheduleSaved: boolean;
};

export function resolveSubscribeCompletionState(input: SubscribeCompletionInput): SubscribeCompletionState {
  if (!input.subscriptionSaved) {
    return {
      status: "subscribe-error",
      activeSubscriptionCount: 0,
      scheduleSaved: false,
    };
  }

  if (!input.preferenceSaved) {
    return {
      status: "subscription_saved_schedule_failed",
      activeSubscriptionCount: 1,
      scheduleSaved: false,
    };
  }

  return {
    status: "subscribed",
    activeSubscriptionCount: 1,
    scheduleSaved: true,
  };
}

export function isNotificationErrorStatus(status: NotificationUiStatus) {
  return [
    "save-error",
    "subscribe-error",
    "subscription_saved_schedule_failed",
    "test-error",
    "load-error",
    "vapid-missing",
  ].includes(status);
}

export function resolveNotificationStatusCopy(input: {
  status: NotificationUiStatus;
  support: NotificationSupportState;
  permission: NotificationPermission | "unsupported";
  vapidConfigured: boolean;
  activeSubscriptionCount: number;
  settingsEnabled: boolean;
}) {
  const subscribed = input.activeSubscriptionCount > 0;

  if (input.status === "loading") return "알림 설정을 불러오는 중입니다.";
  if (input.support === "service-worker-unsupported") return "이 브라우저는 서비스 워커를 지원하지 않습니다.";
  if (input.support === "push-unsupported") return "이 브라우저는 Web Push를 지원하지 않습니다.";
  if (input.support === "notification-unsupported") return "이 브라우저는 알림 권한을 지원하지 않습니다.";
  if (input.support === "ios-not-standalone") return "iPhone은 홈 화면에 추가한 앱에서만 알림을 받을 수 있습니다.";
  if (!input.vapidConfigured) return "알림 서버 키가 아직 설정되지 않았습니다.";
  if (input.permission === "denied") return "권한을 거절한 경우 브라우저 설정에서 다시 허용해야 할 수 있습니다.";
  if (input.status === "subscription_saved_schedule_failed") {
    return "알림 구독은 연결됐지만 일정 저장에 실패했습니다. 예약 알림은 아직 활성화되지 않았습니다.";
  }
  if (input.status === "subscribe-error") return "알림 구독을 저장하지 못했습니다.";
  if (input.status === "save-error") return "알림 설정을 저장하지 못했습니다.";
  if (input.status === "test-error") return "테스트 알림을 보내지 못했습니다.";
  if (input.status === "vapid-missing") return "알림 서버 키가 설정되지 않아 테스트 알림을 보낼 수 없습니다.";
  if (subscribed && input.settingsEnabled) return "알림 구독과 일정 설정이 저장되어 있습니다.";
  if (subscribed) return "알림 구독은 연결되어 있지만 예약 알림은 꺼져 있습니다.";
  return "알림은 사용자가 허용한 경우에만 전송합니다.";
}
