"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchInput } from "@/components/ui/SearchInput";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/search";

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  part: "Part",
  paper: "Paper",
  category: "Category",
  subcategory: "Sub category",
};

interface GlobalSearchProps {
  className?: string;
  inputClassName?: string;
  showShortcut?: boolean;
}

export function GlobalSearch({ className, inputClassName, showShortcut = true }: GlobalSearchProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results ?? []);
      setActiveIndex(-1);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void fetchResults(query);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, open, fetchResults]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function selectResult(result: SearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(result.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }

    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectResult(results[activeIndex]);
    }
  }

  const showShortcutBadge = showShortcut && !query;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <SearchInput
        ref={inputRef}
        placeholder="Search for papers, topics, questions…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClear={() => {
          setQuery("");
          setResults([]);
          setError(null);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
        aria-label="Search papers and topics"
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
        className={cn(
          "h-10 w-full rounded-xl border-slate-200/80 bg-slate-50/60 focus:bg-white",
          showShortcutBadge ? "pr-[4.5rem]" : "pr-10",
          inputClassName
        )}
      />

      {showShortcutBadge && (
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 md:inline">
          ⌘ K
        </kbd>
      )}

      {open && (query.length >= 2 || loading || error) && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-float">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
              <Spinner className="h-4 w-4 text-brand-600" />
              Searching…
            </div>
          )}

          {!loading && error && (
            <p className="px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && results.length === 0 && query.length >= 2 && (
            <p className="px-4 py-3 text-sm text-slate-500">No results for &ldquo;{query}&rdquo;</p>
          )}

          {!loading && !error && results.length > 0 && (
            <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
              {results.map((result, index) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
                      index === activeIndex ? "bg-brand-50" : "hover:bg-slate-50"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectResult(result)}
                  >
                    <span className="mt-0.5 shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {TYPE_LABELS[result.type]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">{result.label}</span>
                      <span className="block truncate text-xs text-slate-500">{result.meta}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
