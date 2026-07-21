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

export function runtimeRequiredPathRecords(files) {
  if (!Array.isArray(files)) return [];
  return files.flatMap((file) => {
    const pattern = firstMatchingGlob(RUNTIME_REQUIRED_PATTERNS, file);
    return pattern ? [{ path: file, pattern }] : [];
  });
}
