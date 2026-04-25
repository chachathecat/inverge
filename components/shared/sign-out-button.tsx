"use client";

import { useRouter } from "next/navigation";

import { clearAppraisalFirstBrowserState } from "@/lib/appraisal-first/browser-storage";
import { clearReviewOsBrowserState } from "@/lib/review-os/browser-storage";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    clearAppraisalFirstBrowserState();
    clearReviewOsBrowserState();
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className="rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[color:var(--foreground-strong)]"
    >
      로그아웃
    </button>
  );
}
