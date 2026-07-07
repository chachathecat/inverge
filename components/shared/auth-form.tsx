"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
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
  const router = useRouter();
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
      router.push(returnTo === "/app" ? sanitizeInternalReturnTo(result.redirectTo, returnTo) : returnTo);
      router.refresh();
    } catch {
      setStatus("error");
      setMessage(getErrorMessage());
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm leading-6 text-[color:var(--muted)]">초대받은 계정으로만 이용할 수 있습니다.</p>

      <label className="block space-y-2 text-sm">
        <span className="text-[color:var(--foreground-strong)]">이메일</span>
        <input
          type="email"
          className="w-full rounded-xl border border-[var(--border)] bg-[color:var(--surface)] px-4 py-3 outline-none"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="text-[color:var(--foreground-strong)]">비밀번호</span>
        <input
          type="password"
          className="w-full rounded-xl border border-[var(--border)] bg-[color:var(--surface)] px-4 py-3 outline-none"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </label>

      {message ? (
        <p className={`text-sm ${status === "error" ? "text-[color:var(--status-red)]" : "text-[color:var(--muted)]"}`}>{message}</p>
      ) : null}

      <Button type="submit" data-testid="login-submit" className="w-full" disabled={status === "submitting"}>
        {status === "submitting" ? "처리 중" : "로그인"}
      </Button>
    </form>
  );
}
