import { cn } from "@/lib/utils";

interface QuestionExplanationsProps {
  explanation?: string | null;
  explanationMy?: string | null;
  className?: string;
  /** Compact labels for result cards */
  compact?: boolean;
}

const MYANMAR_RE = /[\u1000-\u109F]/;

/**
 * Preserve Excel line breaks. For older imports that collapsed whitespace,
 * re-split common explanation patterns (Incorrect Options / option letters /
 * Burmese full stops ။).
 */
function formatExplanationLines(text: string): string {
  const base = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!base) return base;

  if (base.includes("\n")) {
    return base
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  }

  let t = base;

  // Section headers (EN + MY)
  t = t.replace(/\s*(Incorrect Options)\s*/gi, "\n$1\n");
  t = t.replace(/\s*(အခြားအဖြေများ)\s*/g, "\n$1\n");
  t = t.replace(/\s*(မှားသောအဖြေများ)\s*/g, "\n$1\n");
  t = t.replace(/\s*(အမှားအဖြေများ)\s*/g, "\n$1\n");
  t = t.replace(/([.!?။])(Incorrect Options)/gi, "$1\n$2");
  t = t.replace(/([^\s\n])(အခြားအဖြေများ|မှားသောအဖြေများ|အမှားအဖြေများ)/g, "$1\n$2");

  // Option labels A–D on their own lines
  t = t.replace(/([.!?။])\s*([A-D]:\s*)/g, "$1\n$2");
  t = t.replace(
    /(Incorrect Options|အခြားအဖြေများ|မှားသောအဖြေများ|အမှားအဖြေများ)\s*([A-D]:\s*)/gi,
    "$1\n$2"
  );
  t = t.replace(/([^\s\n])([A-D]:\s+)/g, "$1\n$2");

  // Burmese: each sentence ending with ။ becomes its own line (Excel-style)
  if (MYANMAR_RE.test(t)) {
    t = t.replace(/([။])\s*(?=\S)/g, "$1\n");
  }

  return t
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function QuestionExplanations({
  explanation,
  explanationMy,
  className,
  compact = false,
}: QuestionExplanationsProps) {
  const en = explanation?.trim() ? formatExplanationLines(explanation) : null;
  const my = explanationMy?.trim() ? formatExplanationLines(explanationMy) : null;

  if (!en && !my) {
    return (
      <p className={cn("text-sm text-slate-600", className)}>
        No explanation provided for this question.
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {en && (
        <div>
          <p
            className={cn(
              "font-semibold text-brand-800",
              compact ? "mb-1 text-xs uppercase tracking-wide" : "mb-1.5 text-xs uppercase tracking-wide"
            )}
          >
            English explanation
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{en}</p>
        </div>
      )}
      {my && (
        <div>
          <p
            className={cn(
              "font-semibold text-brand-800",
              compact ? "mb-1 text-xs uppercase tracking-wide" : "mb-1.5 text-xs uppercase tracking-wide"
            )}
          >
            Burmese explanation
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{my}</p>
        </div>
      )}
    </div>
  );
}
