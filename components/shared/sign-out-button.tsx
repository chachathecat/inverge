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
      className="v3-type-label inline-flex min-h-11 items-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-background-surface)] px-3 text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
    >
      로그아웃
    </button>
  );
}
