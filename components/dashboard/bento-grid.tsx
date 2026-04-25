"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Target, TrendingUp } from "lucide-react";

import { GrowthAreaChart } from "@/components/charts/growth-area-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWeaknessDescription } from "@/lib/evaluate/tags";
import type { EvaluationHistoryPoint, EvaluationResult } from "@/types/evaluation";

type DashboardBentoProps = {
  result: EvaluationResult | null;
  history: EvaluationHistoryPoint[];
};

function deriveRelativeLabel(score: number) {
  const percentile = Math.max(5, Math.min(95, Math.round(100 - score * 0.7)));
  const gap = Math.max(0, 78 - score);
  return { percentile, gap };
}

function getTodayMission(result: EvaluationResult | null) {
  if (!result) {
    return "분석 결과가 생성되면 오늘의 미션이 자동 추천됩니다.";
  }

  const weakest = [
    { axis: "구조", score: result.structure_score, action: "목차를 먼저 쓰고 각 문단 첫 문장에 결론을 배치하세요." },
    { axis: "내용", score: result.content_score, action: "쟁점별 키워드 3개와 근거 2개를 세트로 정리하세요." },
    { axis: "표현", score: result.expression_score, action: "한 문장 25자 내외로 줄이고 접속어를 문단당 1개로 제한하세요." },
  ].sort((a, b) => a.score - b.score)[0];

  return `${weakest.axis} 축 보완: ${weakest.action}`;
}

export function DashboardBento({ result, history }: DashboardBentoProps) {
  const score = result?.total_score ?? 0;
  const { percentile, gap } = deriveRelativeLabel(score);

  const weaknessCounts = useMemo(() => {
    const map = new Map<string, number>();

    history.forEach(() => {
      result?.weaknesses.forEach((item) => {
        map.set(item, (map.get(item) ?? 0) + 1);
      });
    });

    return map;
  }, [history, result]);

  const weaknessList = result?.weaknesses ?? ["논점누락", "키워드부족", "결론약함"];
  const [selectedWeakness, setSelectedWeakness] = useState<string>(weaknessList[0]);

  return (
    <div className="grid gap-4 md:grid-cols-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="md:col-span-5"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-900" />
              총점 상대 위치
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-semibold text-slate-900">{result?.total_score ?? "-"}/100</p>
            <p className="mt-3 text-sm text-slate-600">
              현재 상위 {percentile}% 수준이며 합격자 평균 대비 {gap}점 부족합니다.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.03 }}
        className="md:col-span-7"
      >
        <Card>
          <CardHeader>
            <CardTitle>성장 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthAreaChart points={history} />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div className="md:col-span-6" whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-emerald-900" /> 오늘의 미션
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-700">{getTodayMission(result)}</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div className="md:col-span-6" whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">약점 TOP3</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {weaknessList.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedWeakness(tag)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    selectedWeakness === tag
                      ? "border-emerald-800 bg-emerald-900 text-white"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {tag} · {weaknessCounts.get(tag) ?? 1}회
                </button>
              ))}
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{selectedWeakness}</p>
              <p className="mt-1">{getWeaknessDescription(selectedWeakness)}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
