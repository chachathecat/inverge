import { getReviewOsServerContext } from "@/lib/review-os/server";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isOwnerPcTheoryEnabled, ownerTheoryStatus } from "@/lib/owner-study/owner-pc-theory";
import { requireTrustedRepairAccess } from "@/lib/review-os/trusted-repair-access";
export const dynamic = "force-dynamic";
export default async function OwnerTheoryPage() {
  if (!isOwnerPcTheoryEnabled()) notFound();
  const { access } = await getReviewOsServerContext("/app/owner-theory");
  if (access.status !== "allowed") return <ReviewOsAccessState access={access} embedded />;
  const owner = await requireTrustedRepairAccess();
  if (owner.email !== "owner@localhost.test") notFound();
  const status = await ownerTheoryStatus();
  return <main className="mx-auto max-w-2xl space-y-5" data-owner-theory-home>
    <h1 className="text-2xl font-semibold">이론 문제·답안 1건으로 시작</h1>
    <p>감정평가이론 · 직접 선택한 텍스트 자료 한 건. AI 미검토 학습보조이며 사람 검토나 공식 채점이 아닙니다.</p>
    <p>문제와 내 답안을 입력하고 내용을 확인해 저장하세요. 다음 화면에서 분석을 직접 누를 때만 선택한 문제·답안을 Gemini로 전송합니다. 교정문도 확인을 누를 때 전송합니다.</p>
    <p>사진·PDF 분석, 실무·법규와 추가 문제의 Gemini 검토는 이 모드에서 미지원입니다.</p>
    <section aria-label="Gemini 누적 예산" className="rounded-lg border p-4">
      <h2 className="font-semibold">이론 1건 누적 한도 US$5</h2>
      {status.ready ? <p>호출 전 최대비용 예약 누계 US${(status.reservedMicros / 1_000_000).toFixed(6)} · 남은 호출 {status.remainingCalls}회</p> : <p role="status">{status.reason}</p>}
      <p>예약액은 실제 청구액이 아닙니다. 실패·진행 중 호출·재시도도 포함하며 재시작이나 날짜 변경으로 늘어나지 않습니다. 세금·환전 수수료 별도.</p>
    </section>
    <Link className="inline-block rounded bg-blue-700 px-4 py-3 text-white" href={status.caseId ? `/app/capture/repair?itemId=${status.caseId}` : "/app/capture?mode=second&subject=감정평가이론"}>{status.caseId ? "선택한 이론 기록 이어가기" : "이론 문제·내 답안 입력"}</Link>
    <nav className="flex flex-wrap gap-4"><Link href="/app/review?mode=second">이론 복습</Link><Link href="/app?mode=second">이론 Today</Link><Link href="/app/first-stage/economics-trial">경제학으로 돌아가기</Link></nav>
  </main>;
}
