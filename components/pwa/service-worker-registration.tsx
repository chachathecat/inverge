"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    navigator.serviceWorker.getRegistration("/sw.js")
      .then((existing) => {
        if (cancelled || existing) return null;
        return navigator.serviceWorker.register("/sw.js", { scope: "/" });
      })
      .catch(() => {
        // PWA support is progressive enhancement and must not block app rendering.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
