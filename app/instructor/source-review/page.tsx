import { redirect } from "next/navigation";

import { isAllowedAdminEmail } from "@/lib/auth/admin";
import { getServerSessionUser } from "@/lib/auth/session";
import { applyExtractionReviewRecord, applyStructuredCandidateReviewRecord } from "@/lib/review-os/past-exam-source";
import { listPastExamExtractionReviewRecords, listPastExamStructuredCandidateReviewRecords } from "@/lib/review-os/past-exam-review-seeds";
import { listPastExamSourceDocuments } from "@/lib/review-os/past-exam-source-seeds";
import {
  listPastExamSourceTextPilotExtractionCandidates,
  listPastExamSourceTextPilotStructuredCandidates,
} from "@/lib/review-os/past-exam-source-text-pilot";

function AccessDeniedPanel() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-6 py-14">
      <section className="w-full rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--foreground-strong)]">접근 권한이 필요합니다</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-muted)]">
          이 화면은 학원용 답안 운영 콘솔 전용입니다. 권한이 없는 계정으로 로그인한 경우 <span className="font-medium">/exams</span>에서 학습을 이어가 주세요.
        </p>
      </section>
    </main>
  );
}

export default async function InstructorSourceReviewPage() {
  const session = await getServerSessionUser();

  if (session.authEnabled && !session.isAuthenticated) {
    redirect("/login?returnTo=%2Finstructor%2Fsource-review");
  }

  if (!session.isAuthenticated || !isAllowedAdminEmail(session.email)) {
    return <AccessDeniedPanel />;
  }

  const extractionCandidate = listPastExamSourceTextPilotExtractionCandidates()[0];
  const structuredCandidate = listPastExamSourceTextPilotStructuredCandidates()[0];
  const extractionReview = listPastExamExtractionReviewRecords()[0];
  const structuredReview = listPastExamStructuredCandidateReviewRecords()[0];
  const sourceDocument = listPastExamSourceDocuments().find((item) => item.id === extractionCandidate.source_document_id);

  const extractionReviewedCopy = applyExtractionReviewRecord(extractionCandidate, extractionReview);
  const structuredReviewedCopy = applyStructuredCandidateReviewRecord(structuredCandidate, structuredReview);

  const items = [
    ["source document id", sourceDocument?.id ?? extractionCandidate.source_document_id],
    ["source document subject/year", `${sourceDocument?.subject ?? "-"} / ${sourceDocument?.exam_year ?? "-"}`],
    ["extraction candidate status", extractionCandidate.review_status],
    ["structured candidate status", structuredCandidate.candidate_status],
    ["linked reference id", structuredCandidate.linked_reference_id],
    ["review record decision", `${extractionReview.decision}, ${structuredReview.decision}`],
    [
      "whether apply helper produces reviewed copy",
      extractionReviewedCopy.review_status === "reviewed" && structuredReviewedCopy.candidate_status === "reviewed" ? "yes" : "no",
    ],
  ] as const;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--foreground-strong)]">내부 Source Review v0</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-muted)]">내부 검수용입니다. 공식 답안이나 공식 채점 기준이 아닙니다.</p>
        <dl className="mt-6 grid gap-3 text-sm">
          {items.map(([label, value]) => (
            <div key={label} className="grid gap-1 rounded-xl border border-[var(--border)] px-4 py-3 md:grid-cols-[220px_1fr] md:items-center">
              <dt className="text-[color:var(--foreground-muted)]">{label}</dt>
              <dd className="font-medium text-[color:var(--foreground-strong)]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
