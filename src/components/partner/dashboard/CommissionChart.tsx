"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { RangeFilter, type TrendRange } from "./RangeFilter";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrencyCents } from "@/lib/utils";

type Point = { label: string; commissionCents: number };

export function CommissionChart({ currency }: { currency: string }) {
  const [range, setRange] = useState<TrendRange>("3m");
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/partner/commission?range=${range}`);
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

  const chartData = points.map((p) => ({ ...p, commission: p.commissionCents / 100 }));
  const hasData = points.some((p) => p.commissionCents > 0);

  return (
    <ChartCard
      title="Commission Trend"
      description="Commission earned over time"
      actions={<RangeFilter value={range} onChange={setRange} />}
    >
      <div className="h-72 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No commission earned in this period yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="commissionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(v: number) => formatCurrencyCents(Math.round(v * 100), currency)}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  boxShadow: "0 4px 24px rgba(15,23,42,0.08)",
                }}
                formatter={(value: number) => [formatCurrencyCents(Math.round(value * 100), currency), "Commission"]}
              />
              <Area
                type="monotone"
                dataKey="commission"
                stroke="#059669"
                strokeWidth={2.5}
                fill="url(#commissionFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}
