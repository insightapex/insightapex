import { SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

/**
 * Native select with browser chrome fully suppressed.
 * Avoids Windows/Chrome ghost option bars (duplicate gray strips under the control)
 * that appear when appearance-none is used without a solid bg + clipped wrapper + custom chevron.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, value, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const isEmpty = value === "" || value === undefined || value === null;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border bg-white",
            "border-slate-200/80 transition-colors duration-200 hover:border-slate-300",
            "focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100",
            error && "border-red-300 focus-within:border-red-400 focus-within:ring-red-100"
          )}
        >
          <select
            ref={ref}
            id={selectId}
            value={value}
            className={cn(
              "relative z-10 block h-11 w-full cursor-pointer border-0 bg-white py-2 pl-3.5 pr-10",
              "text-sm outline-none ring-0 focus:outline-none focus:ring-0",
              // Kill all native dropdown chrome (required on Windows Edge/Chrome)
              "appearance-none",
              "[-webkit-appearance:none]",
              "[-moz-appearance:none]",
              // MS legacy
              "[&::-ms-expand]:hidden",
              isEmpty ? "text-slate-500" : "text-ink-900",
              "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
              // Keep the closed list native-looking; never inherit inverted / white-on-gray
              "[&>option]:bg-white [&>option]:text-ink-900",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom chevron (native arrow is hidden via appearance-none) */}
          <span
            className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-10 items-center justify-center text-slate-400"
            aria-hidden
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
