import { notFound } from "next/navigation";

import { OwnerAlphaPracticeLoop } from "@/components/review-os/owner-alpha-practice-loop";
import {
  isOwnerAlphaPracticeAccessError,
  requireOwnerAlphaPracticeAccess,
} from "@/lib/review-os/owner-alpha-practice-access";
import { OWNER_ALPHA_PRACTICE_ROUTE_KEY } from "@/lib/review-os/owner-alpha-practice-contract";
import {
  OwnerAlphaPracticeRuntimeError,
} from "@/lib/review-os/owner-alpha-practice-runtime";
import { createOwnerAlphaPracticeRuntime } from "@/lib/review-os/owner-alpha-practice-server";

import ProblemSnapClientPage from "./problem-snap-client";

type PageProps = {
  searchParams?: Promise<{
    mode?: string;
    subject?: string;
    ownerAlpha?: string;
    sessionId?: string;
  }>;
};

async function loadOwnerAlphaInitialSession(sessionId?: string) {
  try {
    const ownerSession = await requireOwnerAlphaPracticeAccess();
    if (!sessionId) return null;
    const runtime = await createOwnerAlphaPracticeRuntime(ownerSession.userId);
    return runtime.get(sessionId);
  } catch (error) {
    if (
      isOwnerAlphaPracticeAccessError(error) ||
      (error instanceof OwnerAlphaPracticeRuntimeError &&
        error.code === "session_not_found")
    ) {
      notFound();
    }
    throw error;
  }
}

export default async function ProblemSnapPage({ searchParams }: PageProps) {
  const query = await searchParams;
  if (query?.ownerAlpha === OWNER_ALPHA_PRACTICE_ROUTE_KEY) {
    const initialSession = await loadOwnerAlphaInitialSession(query.sessionId);
    return <OwnerAlphaPracticeLoop initialSession={initialSession} />;
  }
  const mode = query?.mode === "first" ? "first" : "second";
  const subject = typeof query?.subject === "string" ? query.subject : undefined;
  return <ProblemSnapClientPage initialExamMode={mode} initialSubject={subject} />;
}
