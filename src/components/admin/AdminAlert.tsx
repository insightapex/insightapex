import { cn } from "@/lib/utils";

interface AdminAlertProps {
  tone?: "success" | "error";
  message: string;
  onDismiss?: () => void;
}

export function AdminAlert({ tone = "success", message, onDismiss }: AdminAlertProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      )}
    >
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 text-current opacity-60 hover:opacity-100">
          ✕
        </button>
      )}
    </div>
  );
}
