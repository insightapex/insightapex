import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  info: "border-brand-200/60 bg-brand-50/50 text-brand-800",
  success: "border-emerald-200/60 bg-emerald-50/50 text-emerald-800",
  warning: "border-amber-200/60 bg-amber-50/50 text-amber-800",
  error: "border-red-200/60 bg-red-50/50 text-red-800",
  danger: "border-red-200/60 bg-red-50/50 text-red-800",
};

interface AlertProps {
  tone?: keyof typeof tones;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ tone = "info", title, children, onDismiss, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", tones[tone], className)}
    >
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 self-start rounded-md p-0.5 opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
