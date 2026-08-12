import { firstMatchingGlob } from "./glob-match.mjs";

export const RUNTIME_REQUIRED_PATTERNS = Object.freeze([
  "supabase/migrations/**",
  "app/api/auth/**",
  "lib/auth/**",
  "middleware.ts",
  "app/api/notifications/**",
  "lib/notifications/**",
  "app/api/billing/**",
  "lib/billing/**",
  "app/api/payments/**",
  "lib/payments/**",
  "app/api/entitlements/**",
  "lib/entitlements/**",
  "config/paid-launch-readiness.json",
  "vercel.json",
]);

// WCV-C2 has a branch-pinned, exact-head, two-fresh-database runtime gate that
// is stricter than the generic S233A/S236P adapters. Only this exact migration
// is delegated; arbitrary migration paths remain fail-closed here.
export const DEDICATED_RUNTIME_ADAPTER_PATHS = Object.freeze([
  "supabase/migrations/20260812011903_wcv_c2_trusted_repair_vertical.sql",
]);

export function runtimeRequiredPathRecords(files) {
  if (!Array.isArray(files)) return [];
  return files.flatMap((file) => {
    if (DEDICATED_RUNTIME_ADAPTER_PATHS.includes(file)) return [];
    const pattern = firstMatchingGlob(RUNTIME_REQUIRED_PATTERNS, file);
    return pattern ? [{ path: file, pattern }] : [];
  });
}
