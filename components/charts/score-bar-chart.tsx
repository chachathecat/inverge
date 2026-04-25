"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { EvaluationResult } from "@/types/evaluation";

type ScoreBarChartProps = {
  result: EvaluationResult;
};

export function ScoreBarChart({ result }: ScoreBarChartProps) {
  const data = [
    { name: "구조", score: result.structure_score },
    { name: "내용", score: result.content_score },
    { name: "표현", score: result.expression_score },
  ];

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 10 }}>
          <CartesianGrid vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
          <Tooltip cursor={{ fill: "#ECFDF5" }} />
          <Bar dataKey="score" fill="#064E3B" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
