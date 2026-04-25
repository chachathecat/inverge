"use client";

import { useEffect, useMemo, useState } from "react";

import {
  FREE_SUBSCRIPTION_STATE,
  canUseFeature,
  type InvergeFeatureKey,
  type InvergeSubscriptionState,
} from "@/lib/inverge/billing";

type SubscriptionApiResponse = {
  ok: boolean;
  subscription: InvergeSubscriptionState;
};

function dispatchSubscriptionChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("inverge:subscription-change"));
}

async function fetchServerSubscriptionState() {
  try {
    const response = await fetch("/api/inverge/subscription", {
      cache: "no-store",
    });
    if (!response.ok) return FREE_SUBSCRIPTION_STATE;

    const result = (await response.json()) as SubscriptionApiResponse;
    return result.subscription ?? FREE_SUBSCRIPTION_STATE;
  } catch {
    return FREE_SUBSCRIPTION_STATE;
  }
}

export function useSubscriptionState(initialState: InvergeSubscriptionState = FREE_SUBSCRIPTION_STATE) {
  const [state, setState] = useState<InvergeSubscriptionState>(initialState);

  useEffect(() => {
    let cancelled = false;

    async function syncState() {
      const nextState = await fetchServerSubscriptionState();
      if (!cancelled) {
        setState(nextState);
      }
    }

    window.addEventListener("storage", syncState);
    window.addEventListener("inverge:subscription-change", syncState);
    void syncState();

    return () => {
      cancelled = true;
      window.removeEventListener("storage", syncState);
      window.removeEventListener("inverge:subscription-change", syncState);
    };
  }, []);

  return state;
}

export function useFeatureAccess(feature: InvergeFeatureKey, initialState?: InvergeSubscriptionState) {
  const subscription = useSubscriptionState(initialState);
  return useMemo(
    () => ({
      subscription,
      allowed: canUseFeature(subscription, feature),
    }),
    [feature, subscription],
  );
}

export function notifySubscriptionChanged() {
  dispatchSubscriptionChange();
}
