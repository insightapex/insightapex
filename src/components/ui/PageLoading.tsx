import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({ message = "Loading…", className }: PageLoadingProps) {
  return (
    <div
      className={cn(
        "flex h-64 flex-col items-center justify-center gap-2 text-sm text-slate-500",
        className
      )}
    >
      <Spinner className="h-5 w-5 text-brand-600" />
      {message}
    </div>
  );
}
