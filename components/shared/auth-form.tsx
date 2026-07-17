"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { V3ActionButton } from "@/components/learner";
import { parseAppraisalMode } from "@/lib/review-os/appraisal";

type AuthResponse = {
  ok: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
  redirectTo?: string;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "missing-fields":
      return "이메일과 비밀번호를 모두 입력해 주세요.";
    case "supabase-not-configured":
      return "현재 환경에서 로그인이 아직 연결되지 않았습니다.";
    case "auth-failed":
      return "로그인에 실패했습니다. 입력 정보를 다시 확인해 주세요.";
    default:
      return "요청을 처리하지 못했습니다.";
  }
}

function sanitizeInternalReturnTo(value: string | null | undefined, fallback = "/app") {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (/[\u0000-\u001F\u007F\\]/.test(trimmed)) return fallback;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;

  try {
    const url = new URL(trimmed, "http://inverge.local");
    if (url.origin !== "http://inverge.local") return fallback;
    if (url.pathname === "/app") {
      const safeMode = parseAppraisalMode(url.searchParams.get("mode"));
      return safeMode ? `/app?mode=${safeMode}` : "/app";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function AuthForm() {
  const searchParams = useSearchParams();
  const returnTo = sanitizeInternalReturnTo(searchParams.get("returnTo"));
  const returnToUrl = new URL(returnTo, "http://inverge.local");
  const explicitMode = parseAppraisalMode(searchParams.get("mode")) ?? parseAppraisalMode(returnToUrl.searchParams.get("mode"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "success">("idle");
  const [message, setMessage] = useState<string>("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode: explicitMode }),
      });
      const result = (await response.json()) as AuthResponse;

      if (!response.ok || !result.ok) {
        setStatus("error");
        setMessage(getErrorMessage(result.error));
        return;
      }

      if (result.requiresEmailConfirmation) {
        setStatus("success");
        setMessage("이메일 인증을 마친 뒤 다시 로그인해 주세요.");
        return;
      }

      setStatus("success");
      const redirectTarget =
        returnTo === "/app" ? sanitizeInternalReturnTo(result.redirectTo, returnTo) : returnTo;
      window.location.assign(redirectTarget);
    } catch {
      setStatus("error");
      setMessage(getErrorMessage());
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} aria-busy={status === "submitting"}>
      <p className="v3-type-compact text-[var(--color-text-secondary)]">초대받은 계정으로만 이용할 수 있습니다.</p>

      <label className="v3-type-label-strong block space-y-2 text-[var(--color-text-primary)]">
        <span>이메일</span>
        <input
          type="email"
          className="v3-type-body long-token min-h-[var(--control-height)] w-full rounded-[var(--v3-radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-background-surface)] px-4 py-3 text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-background-canvas)]"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
      </label>

      <label className="v3-type-label-strong block space-y-2 text-[var(--color-text-primary)]">
        <span>비밀번호</span>
        <input
          type="password"
          className="v3-type-body min-h-[var(--control-height)] w-full rounded-[var(--v3-radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-background-surface)] px-4 py-3 text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-background-canvas)]"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </label>

      {message ? (
        <p
          className={`v3-type-compact ${status === "error" ? "text-[var(--color-text-risk)]" : "text-[var(--color-text-secondary)]"}`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}

      <V3ActionButton type="submit" fullWidth data-testid="login-submit" disabled={status === "submitting"}>
        {status === "submitting" ? "처리 중" : "로그인"}
      </V3ActionButton>
    </form>
  );
}
