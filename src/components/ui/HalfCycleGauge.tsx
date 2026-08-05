"use client";

import { cn } from "@/lib/utils";

interface HalfCycleGaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  progressClassName?: string;
  label?: string;
  sublabel?: string;
}

/** Semicircle progress gauge (0–100). */
export function HalfCycleGauge({
  value,
  size = 160,
  strokeWidth = 12,
  className,
  trackClassName = "stroke-slate-100",
  progressClassName = "stroke-brand-500",
  label,
  sublabel,
}: HalfCycleGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg width={size} height={size / 2 + strokeWidth} viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}>
        <path
          d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={trackClassName}
        />
        <path
          d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={progressClassName}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
        <span className="text-2xl font-bold tracking-tight text-ink-900">
          {label ?? `${Math.round(clamped)}%`}
        </span>
        {sublabel && <span className="text-[11px] font-medium text-slate-500">{sublabel}</span>}
      </div>
    </div>
  );
}
