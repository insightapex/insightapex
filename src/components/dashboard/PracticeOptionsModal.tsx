"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  getQuestionCountOptions,
  type TimeOption,
  timeOptionToSeconds,
} from "@/lib/practice";
import { cn } from "@/lib/utils";

export interface PracticeStartOptions {
  questionCount: number;
  durationSeconds: number;
}

interface PracticeOptionsModalProps {
  open: boolean;
  onClose: () => void;
  paper: { code: string; title: string };
  subCategoryTitle: string;
  freeQuestionCount: number;
  premiumQuestionCount: number;
  totalQuestionCount: number;
  availableCount: number;
  hasPremiumAccess?: boolean;
  loading?: boolean;
  error?: string | null;
  onStart: (options: PracticeStartOptions) => void;
}

function OptionGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  formatLabel,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
  formatLabel?: (value: T) => string;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={String(option)}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "rounded-lg border px-3.5 py-2 text-sm font-medium transition-all",
                active
                  ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50/50"
              )}
            >
              {formatLabel ? formatLabel(option) : String(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TIME_OPTIONS: TimeOption[] = ["untimed", "20", "40"];

export function PracticeOptionsModal({
  open,
  onClose,
  paper,
  subCategoryTitle,
  freeQuestionCount,
  premiumQuestionCount,
  totalQuestionCount,
  availableCount,
  hasPremiumAccess = false,
  loading = false,
  error = null,
  onStart,
}: PracticeOptionsModalProps) {
  const questionOptions = getQuestionCountOptions(availableCount);
  const hasQuestions = availableCount > 0 && questionOptions.length > 0;

  const [questionCount, setQuestionCount] = useState(questionOptions[0] ?? 10);
  const [timeOption, setTimeOption] = useState<TimeOption>("untimed");

  useEffect(() => {
    if (!open) return;
    const counts = getQuestionCountOptions(availableCount);
    setQuestionCount(counts[counts.length - 1] ?? counts[0] ?? 10);
    setTimeOption("untimed");
  }, [open, availableCount]);

  function handleStart() {
    if (!hasQuestions || loading) return;
    onStart({
      questionCount,
      durationSeconds: timeOptionToSeconds(timeOption),
    });
  }

  return (
    <Modal open={open} onClose={loading ? () => {} : onClose} title="Start Practice">
      <div className="space-y-5">
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <p className="text-slate-500">
            Paper:{" "}
            <span className="font-medium text-slate-800">
              {paper.code} – {paper.title}
            </span>
          </p>
          <p className="mt-1 text-slate-500">
            Sub Category: <span className="font-medium text-slate-800">{subCategoryTitle}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
            <span>Free: <span className="font-medium text-emerald-700">{freeQuestionCount}</span></span>
            <span>Premium: <span className="font-medium text-brand-700">{premiumQuestionCount}</span></span>
            <span>Total: <span className="font-medium text-slate-800">{totalQuestionCount}</span></span>
          </div>
          <p className="mt-1 text-slate-500">
            You can practice:{" "}
            <span className="font-medium text-slate-800">{availableCount}</span>
            {!hasPremiumAccess && premiumQuestionCount > 0 && (
              <span className="text-amber-700"> (premium questions locked)</span>
            )}
          </p>
        </div>

        {!hasQuestions ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No questions available yet.
          </p>
        ) : (
          <>
            <OptionGroup
              label="Number of Questions"
              options={questionOptions}
              value={questionCount}
              onChange={setQuestionCount}
            />

            <OptionGroup
              label="Time"
              options={TIME_OPTIONS}
              value={timeOption}
              onChange={setTimeOption}
              formatLabel={(option) => {
                if (option === "untimed") return "Untimed";
                if (option === "20") return "20 mins";
                return "40 mins";
              }}
            />

          </>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            disabled={!hasQuestions || loading}
            className="w-full sm:w-auto"
          >
            {loading && <Spinner className="h-4 w-4" />}
            {loading ? "Starting..." : "Start Practice"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
