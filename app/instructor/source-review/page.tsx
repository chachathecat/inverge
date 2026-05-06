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

type CardItem = readonly [label: string, value: string];

function StatusCard({ title, helper, items }: { title: string; helper: string; items: readonly CardItem[] }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
      <h2 className="text-base font-semibold text-[color:var(--foreground-strong)]">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-[color:var(--foreground-muted)]">{helper}</p>
      <dl className="mt-4 grid gap-2 text-sm">
        {items.map(([label, value]) => (
          <div key={label} className="grid gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 px-3 py-2 md:grid-cols-[180px_1fr] md:items-center">
            <dt className="text-[color:var(--foreground-muted)]">{label}</dt>
            <dd className="font-medium text-[color:var(--foreground-strong)]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
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

  const sourceItems = [
    ["Source 문서 ID", sourceDocument?.id ?? extractionCandidate.source_document_id],
    ["과목 / 연도", `${sourceDocument?.subject ?? "-"} / ${sourceDocument?.exam_year ?? "-"}`],
  ] as const;

  const candidateItems = [
    ["추출 후보 상태", extractionCandidate.review_status],
    ["구조화 후보 상태", structuredCandidate.candidate_status],
    ["연결된 Reference ID", structuredCandidate.linked_reference_id],
  ] as const;

  const reviewItems = [
    ["검수 기록", `${extractionReview.decision}, ${structuredReview.decision}`],
    [
      "검수 적용 결과",
      extractionReviewedCopy.review_status === "reviewed" && structuredReviewedCopy.candidate_status === "reviewed" ? "reviewed copy 생성됨" : "reviewed copy 미생성",
    ],
  ] as const;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--foreground-strong)]">내부 Source Review v1</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-muted)]">내부 검수용입니다. 공식 답안이나 공식 채점 기준이 아닙니다.</p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-muted)]">현재 화면은 읽기 전용이며, OCR·업로드·상태 변경은 제공하지 않습니다.</p>

        <div className="mt-6 grid gap-4">
          <StatusCard title="Source" helper="원문 문서 메타데이터를 확인하는 읽기 전용 영역입니다." items={sourceItems} />
          <StatusCard title="Candidate" helper="추출/구조화 후보 상태를 조회하는 읽기 전용 영역입니다." items={candidateItems} />
          <StatusCard title="Review" helper="검수 기록과 적용 결과를 확인하는 읽기 전용 영역입니다." items={reviewItems} />
        </div>
      </section>
    </main>
  );
}
