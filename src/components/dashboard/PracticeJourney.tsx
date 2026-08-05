import { Breadcrumb, BreadcrumbItem } from "@/components/ui/Breadcrumb";
import { cn } from "@/lib/utils";

interface PracticeJourneyProps {
  steps: BreadcrumbItem[];
  currentStep: number;
  totalSteps?: number;
  title: string;
  description?: string;
}

export function PracticeJourney({ steps, currentStep, totalSteps = 5, title, description }: PracticeJourneyProps) {
  return (
    <div className="space-y-4">
      <Breadcrumb items={steps} />
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i < currentStep ? "bg-gradient-brand" : i === currentStep ? "bg-brand-300" : "bg-slate-200"
            )}
          />
        ))}
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}
      </div>
    </div>
  );
}
