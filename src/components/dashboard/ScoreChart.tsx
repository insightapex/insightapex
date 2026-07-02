"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface DataPoint {
  date: string;
  score: number;
  paper: string;
}

export function ScoreChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
        <span className="mb-2 text-2xl">📊</span>
        <p className="text-sm font-medium text-slate-600">No score history yet</p>
        <p className="mt-1 max-w-xs text-xs text-slate-400">
          Start your first practice to see your score trend over time.
        </p>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={formatted} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2456f5" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#2456f5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
          }}
          formatter={(v, _n, props) => [
            `${v}%`,
            `${(props.payload as DataPoint).paper}`,
          ]}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <ReferenceLine
          y={50}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          label={{ value: "Pass (50%)", fill: "#f59e0b", fontSize: 10, position: "insideTopRight" }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#2456f5"
          strokeWidth={2.5}
          fill="url(#scoreGradient)"
          dot={{ r: 4, fill: "#2456f5", strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
