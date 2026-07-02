export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "success" | "danger" }) {
  const colors: Record<string, string> = {
    brand: "bg-brand-600",
    success: "bg-emerald-500",
    danger: "bg-red-500",
  };
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div
        className={`h-2 rounded-full ${colors[tone]} transition-all`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
