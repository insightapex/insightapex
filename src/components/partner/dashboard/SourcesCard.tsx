"use client";

import { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChartCard } from "./ChartCard";
import { cn } from "@/lib/utils";

export type SourceRow = {
  id: string;
  name: string;
  slug: string;
  signups: number;
  premium: number;
  conversionRate: number;
};

type Metric = "signups" | "paid";

const PALETTE = ["#059669", "#2456f5", "#8b2ff5", "#f59e0b", "#ef4444", "#0ea5e9", "#14b8a6"];

export function SourcesCard({ sources }: { sources: SourceRow[] }) {
  const [metric, setMetric] = useState<Metric>("signups");

  const totalSignups = sources.reduce((sum, s) => sum + s.signups, 0);
  const totalPaid = sources.reduce((sum, s) => sum + s.premium, 0);
  const total = metric === "signups" ? totalSignups : totalPaid;

  const pieData = sources
    .map((s) => ({
      ...s,
      value: metric === "signups" ? s.signups : s.premium,
    }))
    .filter((s) => s.value > 0);

  const centerLabel = metric === "signups" ? "Total Signups" : "Total Paid";
  const unitLabel = metric === "signups" ? "signups" : "paid";

  return (
    <ChartCard
      title="Student Acquisition Sources"
      description="Where your students came from"
    >
      {totalSignups === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          No student signups yet.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
          <div className="relative mx-auto h-52 w-52">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                No paid students yet.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {pieData.map((entry) => {
                        const colorIndex = sources.findIndex((s) => s.id === entry.id);
                        return (
                          <Cell
                            key={entry.id}
                            fill={PALETTE[(colorIndex >= 0 ? colorIndex : 0) % PALETTE.length]}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                        boxShadow: "0 4px 24px rgba(15,23,42,0.08)",
                      }}
                      formatter={(value: number, name: string) => [`${value} ${unitLabel}`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-ink-900">
                    {total}
                  </p>
                  <p className="mt-0.5 max-w-[5.5rem] text-[11px] font-medium leading-tight text-slate-500">
                    {centerLabel}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2">Source</th>
                  <th className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setMetric("signups")}
                      className={cn(
                        "rounded-md px-1.5 py-0.5 transition-colors",
                        metric === "signups"
                          ? "bg-brand-50 text-brand-700"
                          : "hover:bg-slate-50 hover:text-slate-700"
                      )}
                    >
                      Signups
                    </button>
                  </th>
                  <th className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setMetric("paid")}
                      className={cn(
                        "rounded-md px-1.5 py-0.5 transition-colors",
                        metric === "paid"
                          ? "bg-brand-50 text-brand-700"
                          : "hover:bg-slate-50 hover:text-slate-700"
                      )}
                    >
                      Paid
                    </button>
                  </th>
                  <th className="px-2 py-2 text-right">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sources.map((s, i) => (
                  <tr key={s.id}>
                    <td className="px-2 py-2.5">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: PALETTE[i % PALETTE.length] }}
                        />
                        <span className="font-medium text-slate-800">{s.name}</span>
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2.5 text-right tabular-nums",
                        metric === "signups" ? "font-semibold text-brand-700" : "text-slate-700"
                      )}
                    >
                      {s.signups}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2.5 text-right tabular-nums",
                        metric === "paid" ? "font-semibold text-brand-700" : "text-slate-700"
                      )}
                    >
                      {s.premium}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums font-medium text-emerald-700">
                      {s.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
