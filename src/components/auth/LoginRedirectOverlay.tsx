import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

export function LoginRedirectOverlay({
  message,
  variant = "light",
}: {
  message: string;
  variant?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl2 backdrop-blur-sm",
        variant === "dark" ? "bg-ink-900/90" : "bg-white/95"
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner className={cn("h-8 w-8", variant === "dark" ? "text-brand-400" : "text-brand-600")} />
      <p className={cn("mt-4 text-sm font-medium", variant === "dark" ? "text-slate-200" : "text-slate-700")}>
        {message}
      </p>
    </div>
  );
}
