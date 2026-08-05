"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { PageLoading } from "@/components/ui/PageLoading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { PracticeJourney } from "@/components/dashboard/PracticeJourney";
import { cn } from "@/lib/utils";

interface Part {
  id: string;
  code: string;
  title: string;
  description: string | null;
  paperCount: number;
}

interface MockPaper {
  id: string;
  code: string;
  title: string;
  description: string | null;
  mockExamCount: number;
  unlockedCount: number;
  lockedCount: number;
  isPremiumSubscriber: boolean;
  isLocked: boolean;
  hasAnyAccess: boolean;
}

interface MockExam {
  id: string;
  title: string;
  description: string | null;
  paperId: string;
  paperCode: string;
  paperTitle: string;
  questionCount: number;
  durationMinutes: number;
  passMarkPercent: number;
  accessLevel: string;
  isPremium: boolean;
  hasAccess: boolean;
  isLocked: boolean;
}

type Stage = "select-part" | "select-paper" | "select-set";

export default function MockExamsPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("select-part");
  const [parts, setParts] = useState<Part[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [partsError, setPartsError] = useState<string | null>(null);

  const [papers, setPapers] = useState<MockPaper[]>([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [papersError, setPapersError] = useState<string | null>(null);

  const [exams, setExams] = useState<MockExam[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [examsError, setExamsError] = useState<string | null>(null);

  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<MockPaper | null>(null);

  const [starting, setStarting] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    setPartsLoading(true);
    setPartsError(null);
    fetch("/api/parts", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Could not load parts");
        setParts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setParts([]);
        setPartsError(err instanceof Error ? err.message : "Could not load parts");
      })
      .finally(() => setPartsLoading(false));
  }, []);

  async function selectPart(part: Part) {
    setSelectedPart(part);
    setSelectedPaper(null);
    setExams([]);
    setPapers([]);
    setPapersLoading(true);
    setPapersError(null);
    setStage("select-paper");

    try {
      const res = await fetch(`/api/mock-exams/papers?partId=${part.id}`, { cache: "no-store" });
      const raw = await res.text();
      let data: unknown = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(
          res.ok
            ? "Invalid server response."
            : "Could not load papers. Restart the server and try again."
        );
      }
      if (!res.ok) {
        const errMsg =
          data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Could not load papers";
        throw new Error(errMsg);
      }
      setPapers(Array.isArray(data) ? data : []);
    } catch (err) {
      setPapers([]);
      setPapersError(err instanceof Error ? err.message : "Could not load papers");
    } finally {
      setPapersLoading(false);
    }
  }

  async function selectPaper(paper: MockPaper) {
    setSelectedPaper(paper);
    setExamsLoading(true);
    setExamsError(null);
    setStartError(null);
    setStage("select-set");

    try {
      const res = await fetch(`/api/mock-exams?paperId=${paper.id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load mock exams");
      setExams(data.mockExams ?? []);
    } catch (err) {
      setExams([]);
      setExamsError(err instanceof Error ? err.message : "Could not load mock exams");
    } finally {
      setExamsLoading(false);
    }
  }

  async function startExam(exam: MockExam) {
    if (exam.isLocked || !exam.hasAccess) {
      router.push("/dashboard/pricing");
      return;
    }

    setStarting(exam.id);
    setStartError(null);
    try {
      const res = await fetch(`/api/mock-exams/${exam.id}/start`, { method: "POST" });
      const raw = await res.text();
      let data: { error?: string; code?: string; upgradeUrl?: string; attemptId?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          res.ok
            ? "Invalid server response."
            : "Server error starting mock exam. Restart npm run dev, then try again."
        );
      }
      if (!res.ok) {
        if (data.code === "ACCESS_DENIED") {
          router.push(data.upgradeUrl ?? "/dashboard/pricing");
          return;
        }
        throw new Error(data.error ?? "Could not start mock exam");
      }
      if (!data.attemptId) throw new Error("Mock exam started but no attempt id was returned.");
      router.push(`/dashboard/mock-exams/session?attemptId=${data.attemptId}`);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStarting(null);
    }
  }

  const goToParts = useCallback(() => {
    setStage("select-part");
    setSelectedPart(null);
    setSelectedPaper(null);
    setExams([]);
  }, []);

  if (partsLoading) {
    return <PageLoading message="Loading mock exams…" />;
  }

  if (stage === "select-part") {
    return (
      <div className="space-y-6">
        <PracticeJourney
          steps={[{ label: "Parts" }]}
          currentStep={0}
          totalSteps={3}
          title="Mock Exams"
          description="Choose a Part, then a Paper, then start a published mock exam."
        />

        {partsError && <Alert tone="error">{partsError}</Alert>}

        {parts.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No parts available"
            description="Mock exams will appear once parts are published."
            actionLabel="Go to Practice"
            actionHref="/dashboard/quiz"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {parts.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => selectPart(part)}
                className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-card transition-colors hover:border-brand-300"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {part.code}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-ink-900">{part.title}</h2>
                {part.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{part.description}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (stage === "select-paper" && selectedPart) {
    return (
      <div className="space-y-6">
        <PracticeJourney
          steps={[
            { label: "Parts", onClick: goToParts },
            { label: selectedPart.code },
          ]}
          currentStep={1}
          totalSteps={3}
          title="Select paper"
          description={`Papers with published mock exams under ${selectedPart.title}.`}
        />

        {papersError && <Alert tone="error">{papersError}</Alert>}

        {papersLoading ? (
          <PageLoading message="Loading papers…" className="h-40" />
        ) : papers.length === 0 ? (
          <EmptyState
            compact
            title="No mock papers here"
            description="No published mock exams for this part yet. Ask your admin to publish one."
            actionLabel="Back to parts"
            onAction={goToParts}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {papers.map((paper) => (
              <button
                key={paper.id}
                type="button"
                onClick={() => selectPaper(paper)}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card transition-colors hover:border-brand-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-brand-600">{paper.code}</p>
                    <h3 className="mt-1 font-semibold text-ink-900">{paper.title}</h3>
                  </div>
                  {paper.isLocked ? (
                    <Badge tone="warning">Locked</Badge>
                  ) : (
                    <Badge tone="brand">Available</Badge>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {paper.mockExamCount} mock exam{paper.mockExamCount === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (stage === "select-set" && selectedPart && selectedPaper) {
    return (
      <div className="space-y-6">
        <PracticeJourney
          steps={[
            { label: "Parts", onClick: goToParts },
            {
              label: selectedPaper.code,
              onClick: () => {
                setStage("select-paper");
                setSelectedPaper(null);
                setExams([]);
              },
            },
            { label: "Mock exams" },
          ]}
          currentStep={2}
          totalSteps={3}
          title="Choose mock exam"
          description={`Published mock exams for ${selectedPaper.code}.`}
        />

        {(examsError || startError) && <Alert tone="error">{examsError ?? startError}</Alert>}

        {examsLoading ? (
          <PageLoading message="Loading mock exams…" className="h-40" />
        ) : exams.length === 0 ? (
          <EmptyState
            compact
            title="No published mock exams"
            description="This paper has no published mock exams yet."
            actionLabel="Back to papers"
            onAction={() => {
              setStage("select-paper");
              setSelectedPaper(null);
            }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {exams.map((exam) => {
              const locked = exam.isLocked || !exam.hasAccess;
              const isPremium = exam.accessLevel === "PREMIUM" || exam.isPremium;
              return (
                <div
                  key={exam.id}
                  className={cn(
                    "rounded-xl border bg-white p-5 shadow-card",
                    locked ? "border-slate-200 opacity-95" : "border-slate-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-brand-600">{exam.paperCode}</p>
                      <h3 className="mt-1 font-semibold text-ink-900">{exam.title}</h3>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {isPremium ? (
                        <Badge tone="premium">Premium</Badge>
                      ) : (
                        <Badge tone="success">Free</Badge>
                      )}
                      {locked && <Badge tone="warning">Locked</Badge>}
                    </div>
                  </div>
                  {exam.description && (
                    <p className="mt-2 text-sm text-slate-500">{exam.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>{exam.questionCount} questions</span>
                    <span>{exam.durationMinutes} min</span>
                    <span>Pass: {exam.passMarkPercent}%</span>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    variant={locked ? "outline" : "primary"}
                    disabled={starting === exam.id}
                    onClick={() => startExam(exam)}
                  >
                    {starting === exam.id && <Spinner className="h-4 w-4" />}
                    {locked ? "Unlock mock exam" : "Start mock exam"}
                  </Button>
                  {locked && (
                    <p className="mt-2 text-center text-xs text-slate-500">
                      Available with Premium or a purchase for this paper.{" "}
                      <Link
                        href="/dashboard/pricing"
                        className="font-medium text-brand-600 hover:underline"
                      >
                        View pricing
                      </Link>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}
