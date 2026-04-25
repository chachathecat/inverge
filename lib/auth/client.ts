"use client";

import { useEffect, useState } from "react";

export type AuthSessionState = {
  authEnabled: boolean;
  isAuthenticated: boolean;
  isDemo: boolean;
  userId: string | null;
  email: string | null;
  source?: "demo" | "supabase";
};

const DEFAULT_STATE: AuthSessionState = {
  authEnabled: false,
  isAuthenticated: false,
  isDemo: true,
  userId: null,
  email: null,
};

export function useAuthSession(initialState: AuthSessionState = DEFAULT_STATE) {
  const [state, setState] = useState<AuthSessionState>(initialState);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as { ok?: boolean; session?: AuthSessionState };
        if (!cancelled && result.ok && result.session) {
          setState(result.session);
        }
      } catch {
        // Keep initial state.
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
