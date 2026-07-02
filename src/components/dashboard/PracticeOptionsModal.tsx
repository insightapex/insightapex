"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  getQuestionCountOptions,
  type ReviewMode,
  type TimeOption,
  timeOptionToSeconds,
} from "@/lib/practice";
import { cn } from "@/lib/utils";

export interface PracticeStartOptions {
  questionCount: number;
  durationSeconds: number;
  reviewMode: ReviewMode;
}

interface PracticeOptionsModalProps {
  open: boolean;
  onClose: () => void;
  paper: { code: string; title: string };
  topicTitle: string;
  availableCount: number;
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
const REVIEW_OPTIONS: { value: ReviewMode; label: string }[] = [
  { value: "after_each", label: "Show explanation after each question" },
  { value: "at_end", label: "Show explanation at the end" },
];

export function PracticeOptionsModal({
  open,
  onClose,
  paper,
  topicTitle,
  availableCount,
  loading = false,
  error = null,
  onStart,
}: PracticeOptionsModalProps) {
  const questionOptions = getQuestionCountOptions(availableCount);
  const hasQuestions = availableCount > 0 && questionOptions.length > 0;

  const [questionCount, setQuestionCount] = useState(questionOptions[0] ?? 10);
  const [timeOption, setTimeOption] = useState<TimeOption>("untimed");
  const [reviewMode, setReviewMode] = useState<ReviewMode>("at_end");

  useEffect(() => {
    if (!open) return;
    const counts = getQuestionCountOptions(availableCount);
    setQuestionCount(counts[counts.length - 1] ?? counts[0] ?? 10);
    setTimeOption("untimed");
    setReviewMode("at_end");
  }, [open, availableCount]);

  function handleStart() {
    if (!hasQuestions || loading) return;
    onStart({
      questionCount,
      durationSeconds: timeOptionToSeconds(timeOption),
      reviewMode,
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
            Topic: <span className="font-medium text-slate-800">{topicTitle}</span>
          </p>
          <p className="mt-1 text-slate-500">
            Available Questions:{" "}
            <span className="font-medium text-slate-800">{availableCount}</span>
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

            <div className="space-y-2.5">
              <p className="text-sm font-medium text-slate-700">Review</p>
              <div className="space-y-2">
                {REVIEW_OPTIONS.map((option) => {
                  const active = reviewMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setReviewMode(option.value)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-sm transition-all",
                        active
                          ? "border-brand-500 bg-brand-50 text-brand-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50/50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          active ? "border-brand-500 bg-brand-500" : "border-slate-300"
                        )}
                      >
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
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
