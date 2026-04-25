import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col items-center justify-center gap-6 px-4 text-center sm:px-6">
      <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
        Inverge
      </span>
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
        요청하신 화면을 찾을 수 없습니다.
      </h1>
      <p className="max-w-2xl text-sm leading-8 text-slate-600 sm:text-base">
        시험 선택 화면으로 돌아가 감정평가사 1차 또는 감정평가사 2차 흐름을 다시 선택해 주세요.
      </p>
      <Link href="/exams">
        <Button size="lg">시험 선택 화면으로 이동</Button>
      </Link>
    </div>
  );
}
