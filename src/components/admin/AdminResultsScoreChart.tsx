"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { ScoreBand, ScoreBandId } from "@/lib/admin-results";

const BAND_COLORS: Record<ScoreBandId, string> = {
  under_50: "#ef4444",
  "50_59": "#f97316",
  "60_79": "#eab308",
  "80_plus": "#10b981",
};

interface AdminResultsScoreChartProps {
  bands: ScoreBand[];
  totalSubmissions: number;
  paperLabel?: string;
  activeFilter: ScoreBandId | null;
  onBandClick: (bandId: ScoreBandId) => void;
}

type PieLabelProps = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  payload?: ScoreBand;
};

function renderExternalLabel({ cx = 0, cy = 0, midAngle = 0, outerRadius = 0, payload }: PieLabelProps) {
  if (!payload || payload.count === 0) return null;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      <tspan x={x} dy={-2} className="fill-slate-800 text-[12px] font-medium">
        {payload.label}
      </tspan>
      <tspan x={x} dy="1.2em" className="fill-slate-600 text-[11px]">
        {payload.percent}%
      </tspan>
    </text>
  );
}

export function AdminResultsScoreChart({
  bands,
  totalSubmissions,
  paperLabel,
  activeFilter,
  onBandClick,
}: AdminResultsScoreChartProps) {
  const chartData = bands.filter((band) => band.count > 0 || totalSubmissions === 0);
  const hasData = totalSubmissions > 0;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-ink-900">Score Distribution</h2>
        <p className="mt-1 text-sm text-slate-500">
          {paperLabel ? (
            <>
              Student submissions for <span className="font-medium text-slate-700">{paperLabel}</span>{" "}
              grouped by score range. Click{" "}
              <span className="font-medium text-emerald-700">80% and above</span> to filter the table.
            </>
          ) : (
            <>
              Student submissions grouped by score range. Click{" "}
              <span className="font-medium text-emerald-700">80% and above</span> to filter the table.
            </>
          )}
        </p>
      </CardHeader>
      <CardBody>
        {!hasData ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No submitted quiz results yet.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
            <div className="mx-auto h-[320px] w-full max-w-md sm:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={96}
                    paddingAngle={0}
                    labelLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                    label={renderExternalLabel}
                    onClick={(_, index) => {
                      const band = chartData[index];
                      if (band?.id === "80_plus") onBandClick("80_plus");
                    }}
                  >
                    {chartData.map((band) => (
                      <Cell
                        key={band.id}
                        fill={BAND_COLORS[band.id]}
                        stroke={activeFilter === band.id ? "#0f172a" : "#ffffff"}
                        strokeWidth={activeFilter === band.id ? 2 : 1.5}
                        className={cn(
                          band.id === "80_plus" ? "cursor-pointer" : "cursor-default",
                          band.id === "80_plus" && "focus:outline-none"
                        )}
                        aria-label={`${band.label}: ${band.count} submissions`}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name, item) => {
                      const payload = item.payload as ScoreBand;
                      return [
                        `${value} submissions (${payload.percent}%)`,
                        payload.label,
                      ];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {bands.map((band) => {
                const isClickable = band.id === "80_plus";
                const isActive = activeFilter === band.id;

                return (
                  <button
                    key={band.id}
                    type="button"
                    disabled={!isClickable || band.count === 0}
                    onClick={() => isClickable && onBandClick("80_plus")}
                    className={cn(
                      "flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors",
                      isClickable && band.count > 0
                        ? "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
                        : "cursor-default border-slate-200 bg-slate-50/60",
                      isActive && "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: BAND_COLORS[band.id] }}
                        aria-hidden
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{band.label}</p>
                        {isClickable && band.count > 0 && (
                          <p className="text-xs text-emerald-700">Click to filter table</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{band.count}</p>
                      <p className="text-xs text-slate-500">{band.percent}%</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
