"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { RangeFilter, type TrendRange } from "./RangeFilter";
import { Spinner } from "@/components/ui/Spinner";

type Point = { label: string; signups: number; premium: number };

export function GrowthChart() {
  const [range, setRange] = useState<TrendRange>("3m");
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/partner/growth?range=${range}`);
        const json = await res.json();
        if (!cancelled && res.ok) setPoints(json.points ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const hasData = points.some((p) => p.signups > 0 || p.premium > 0);

  return (
    <ChartCard
      title="Student Growth Trends"
      description="New signups and new premium users over time"
      actions={<RangeFilter value={range} onChange={setRange} />}
    >
      <div className="h-72 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No student activity in this period yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  boxShadow: "0 4px 24px rgba(15,23,42,0.08)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="signups"
                name="New signups"
                stroke="#059669"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="premium"
                name="New premium"
                stroke="#2456f5"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}
