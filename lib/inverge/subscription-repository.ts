import "server-only";

import {
  FREE_SUBSCRIPTION_STATE,
  getPlan,
  isPlanId,
  type CheckoutProviderName,
  type InvergeBillingInterval,
  type InvergePlanId,
  type InvergeSubscriptionState,
} from "@/lib/inverge/billing";
import { createJsonFileRepository } from "@/lib/inverge/file-persistence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canUseSupabasePersistence } from "@/lib/supabase/persistence";

export type StoredCheckoutStatus = "pending" | "completed" | "canceled" | "failed";

export type StoredCheckoutSession = {
  checkoutSessionId: string;
  userId: string;
  planId: InvergePlanId;
  interval: InvergeBillingInterval;
  provider: CheckoutProviderName;
  checkoutUrl: string;
  returnPath: string;
  status: StoredCheckoutStatus;
  failureReason?: string;
  mock: boolean;
  createdAt: string;
  updatedAt: string;
};

type PersistedSubscriptionStore = {
  subscriptions: Record<string, InvergeSubscriptionState>;
  checkoutSessions: StoredCheckoutSession[];
};

const store = createJsonFileRepository<PersistedSubscriptionStore>("subscription-state.json", () => ({
  subscriptions: {},
  checkoutSessions: [],
}));

function buildPeriodEnd(interval: InvergeBillingInterval) {
  const now = new Date();
  const durationDays = interval === "season" ? 90 : 30;
  return new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
}

function clampSessions(sessions: StoredCheckoutSession[]) {
  return sessions.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 400);
}

class FileSubscriptionRepository {
  getSubscriptionState(userId: string) {
    const data = store.read();
    const subscriptions = data.subscriptions ?? {};
    const legacySubscription = (data as PersistedSubscriptionStore & { subscription?: InvergeSubscriptionState }).subscription;
    return subscriptions[userId] ?? legacySubscription ?? FREE_SUBSCRIPTION_STATE;
  }

  getCheckoutSession(userId: string, sessionId: string) {
    return (store.read().checkoutSessions ?? []).find((session) => session.userId === userId && session.checkoutSessionId === sessionId) ?? null;
  }

  createCheckoutSession(input: {
    userId: string;
    checkoutSessionId: string;
    planId: InvergePlanId;
    interval: InvergeBillingInterval;
    provider: CheckoutProviderName;
    checkoutUrl: string;
    returnPath: string;
    mock: boolean;
  }) {
    return store.update((data) => {
      const now = new Date().toISOString();
      const nextSession: StoredCheckoutSession = {
        ...input,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };

      return {
        next: {
          subscriptions: data.subscriptions,
          checkoutSessions: clampSessions([
            nextSession,
            ...(data.checkoutSessions ?? []).filter((session) => session.checkoutSessionId !== input.checkoutSessionId),
          ]),
        },
        result: nextSession,
      };
    });
  }

  confirmCheckoutSession(userId: string, sessionId: string) {
    return store.update((data) => {
      const session = (data.checkoutSessions ?? []).find((entry) => entry.userId === userId && entry.checkoutSessionId === sessionId);
      if (!session || !isPlanId(session.planId) || session.planId === "free") {
        return { next: data, result: null };
      }
      const now = new Date().toISOString();
      const nextSubscription: InvergeSubscriptionState = {
        planId: getPlan(session.planId).id,
        status: "active",
        provider: session.provider,
        currentPeriodEndsAt: buildPeriodEnd(session.interval),
        checkoutSessionId: session.checkoutSessionId,
        updatedAt: now,
      };
      const nextSession: StoredCheckoutSession = { ...session, status: "completed", updatedAt: now, failureReason: undefined };
      return {
        next: {
          subscriptions: { ...data.subscriptions, [userId]: nextSubscription },
          checkoutSessions: (data.checkoutSessions ?? []).map((entry) => entry.checkoutSessionId === sessionId ? nextSession : entry),
        },
        result: { subscription: nextSubscription, checkoutSession: nextSession },
      };
    });
  }

  cancelCheckoutSession(userId: string, sessionId: string, reason?: string) {
    return store.update((data) => {
      const session = (data.checkoutSessions ?? []).find((entry) => entry.userId === userId && entry.checkoutSessionId === sessionId);
      if (!session) return { next: data, result: null };
      const nextSession: StoredCheckoutSession = {
        ...session,
        status: reason ? "failed" : "canceled",
        failureReason: reason,
        updatedAt: new Date().toISOString(),
      };
      return {
        next: {
          ...data,
          checkoutSessions: (data.checkoutSessions ?? []).map((entry) => entry.checkoutSessionId === sessionId ? nextSession : entry),
        },
        result: nextSession,
      };
    });
  }
}

class SupabaseSubscriptionRepository {
  private readonly fileFallback = new FileSubscriptionRepository();

  private get client() {
    return createSupabaseAdminClient();
  }

  async getSubscriptionState(userId: string) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return this.fileFallback.getSubscriptionState(userId);
    const { data } = await client.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
    if (!data) return FREE_SUBSCRIPTION_STATE;
    return {
      planId: data.plan_id as InvergePlanId,
      status: data.status as InvergeSubscriptionState["status"],
      provider: data.provider as InvergeSubscriptionState["provider"],
      currentPeriodEndsAt: data.current_period_ends_at ?? undefined,
      checkoutSessionId: data.checkout_session_id ?? undefined,
      updatedAt: data.updated_at,
    };
  }

  async getCheckoutSession(userId: string, sessionId: string) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return this.fileFallback.getCheckoutSession(userId, sessionId);
    const { data } = await client.from("checkout_sessions").select("*").eq("user_id", userId).eq("checkout_session_id", sessionId).maybeSingle();
    if (!data) return null;
    return {
      checkoutSessionId: data.checkout_session_id,
      userId: data.user_id,
      planId: data.plan_id,
      interval: data.interval,
      provider: data.provider,
      checkoutUrl: data.checkout_url,
      returnPath: data.return_path,
      status: data.status,
      failureReason: data.failure_reason ?? undefined,
      mock: data.mock,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as StoredCheckoutSession;
  }

  async createCheckoutSession(input: {
    userId: string;
    checkoutSessionId: string;
    planId: InvergePlanId;
    interval: InvergeBillingInterval;
    provider: CheckoutProviderName;
    checkoutUrl: string;
    returnPath: string;
    mock: boolean;
  }) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(input.userId)) return this.fileFallback.createCheckoutSession(input);
    const now = new Date().toISOString();
    const nextSession: StoredCheckoutSession = {
      ...input,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    await client.from("checkout_sessions").upsert({
      checkout_session_id: nextSession.checkoutSessionId,
      user_id: nextSession.userId,
      plan_id: nextSession.planId,
      interval: nextSession.interval,
      provider: nextSession.provider,
      checkout_url: nextSession.checkoutUrl,
      return_path: nextSession.returnPath,
      status: nextSession.status,
      failure_reason: null,
      mock: nextSession.mock,
      raw_payload: nextSession,
      created_at: nextSession.createdAt,
      updated_at: nextSession.updatedAt,
    });
    return nextSession;
  }

  async confirmCheckoutSession(userId: string, sessionId: string) {
    const session = await this.getCheckoutSession(userId, sessionId);
    if (!session || !isPlanId(session.planId) || session.planId === "free") return null;
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return this.fileFallback.confirmCheckoutSession(userId, sessionId);
    const now = new Date().toISOString();
    const nextSubscription: InvergeSubscriptionState = {
      planId: getPlan(session.planId).id,
      status: "active",
      provider: session.provider,
      currentPeriodEndsAt: buildPeriodEnd(session.interval),
      checkoutSessionId: session.checkoutSessionId,
      updatedAt: now,
    };
    await client.from("checkout_sessions").update({
      status: "completed",
      failure_reason: null,
      updated_at: now,
    }).eq("checkout_session_id", sessionId).eq("user_id", userId);
    await client.from("subscriptions").upsert({
      user_id: userId,
      plan_id: nextSubscription.planId,
      status: nextSubscription.status,
      provider: nextSubscription.provider,
      current_period_ends_at: nextSubscription.currentPeriodEndsAt,
      checkout_session_id: nextSubscription.checkoutSessionId,
      raw_payload: nextSubscription,
      updated_at: nextSubscription.updatedAt,
    });
    return { subscription: nextSubscription, checkoutSession: { ...session, status: "completed", updatedAt: now } };
  }

  async cancelCheckoutSession(userId: string, sessionId: string, reason?: string) {
    const session = await this.getCheckoutSession(userId, sessionId);
    if (!session) return null;
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return this.fileFallback.cancelCheckoutSession(userId, sessionId, reason);
    const nextStatus: StoredCheckoutStatus = reason ? "failed" : "canceled";
    const now = new Date().toISOString();
    await client.from("checkout_sessions").update({
      status: nextStatus,
      failure_reason: reason ?? null,
      updated_at: now,
    }).eq("checkout_session_id", sessionId).eq("user_id", userId);
    return { ...session, status: nextStatus, failureReason: reason, updatedAt: now };
  }
}

const fileRepository = new FileSubscriptionRepository();
const supabaseRepository = new SupabaseSubscriptionRepository();

export function getServerSubscriptionState(userId: string) {
  return canUseSupabasePersistence(userId) ? supabaseRepository.getSubscriptionState(userId) : fileRepository.getSubscriptionState(userId);
}

export function createServerCheckoutSession(input: {
  userId: string;
  checkoutSessionId: string;
  planId: InvergePlanId;
  interval: InvergeBillingInterval;
  provider: CheckoutProviderName;
  checkoutUrl: string;
  returnPath: string;
  mock: boolean;
}) {
  return canUseSupabasePersistence(input.userId) ? supabaseRepository.createCheckoutSession(input) : fileRepository.createCheckoutSession(input);
}

export function getServerCheckoutSession(userId: string, sessionId: string) {
  return canUseSupabasePersistence(userId) ? supabaseRepository.getCheckoutSession(userId, sessionId) : fileRepository.getCheckoutSession(userId, sessionId);
}

export function confirmServerCheckoutSession(userId: string, sessionId: string) {
  return canUseSupabasePersistence(userId) ? supabaseRepository.confirmCheckoutSession(userId, sessionId) : fileRepository.confirmCheckoutSession(userId, sessionId);
}

export function cancelServerCheckoutSession(userId: string, sessionId: string, reason?: string) {
  return canUseSupabasePersistence(userId) ? supabaseRepository.cancelCheckoutSession(userId, sessionId, reason) : fileRepository.cancelCheckoutSession(userId, sessionId, reason);
}
