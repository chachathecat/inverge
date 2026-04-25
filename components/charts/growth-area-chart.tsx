"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { EvaluationHistoryPoint } from "@/types/evaluation";

type GrowthAreaChartProps = {
  points: EvaluationHistoryPoint[];
};

export function GrowthAreaChart({ points }: GrowthAreaChartProps) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points}>
          <defs>
            <linearGradient id="growth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#064E3B" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#064E3B" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="exam_date" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
          <Tooltip />
          <Area type="monotone" dataKey="total_score" stroke="none" fill="url(#growth-fill)" />
          <Line
            type="monotone"
            dataKey="total_score"
            stroke="#064E3B"
            strokeWidth={4}
            dot={{ r: 3, fill: "#064E3B" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
