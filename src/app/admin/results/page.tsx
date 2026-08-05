"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/PageLoading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { AdminResultsScoreChart } from "@/components/admin/AdminResultsScoreChart";
import type { ScoreBand, ScoreBandId } from "@/lib/admin-results";

interface SubmissionRow {
  id: string;
  studentName: string;
  email: string;
  paper: string;
  score: number;
  passed: boolean | null;
  submittedAt: string | null;
}

interface ResultsResponse {
  scoreBands: ScoreBand[];
  totalSubmissions: number;
  selectedPaper: { id: string; code: string; title: string; label: string };
  filter: ScoreBandId | null;
  submissions: SubmissionRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PaperOption {
  id: string;
  code: string;
  title: string;
}

interface AttemptDetail {
  id: string;
  studentName: string;
  email: string;
  paper: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  scorePercent: number;
  passed: boolean | null;
  submittedAt: string | null;
  durationSec: number | null;
  review: {
    questionText: string;
    categoryTitle: string;
    subCategoryTitle: string;
    selectedOptionText: string | null;
    correctOptionText: string | null;
    isCorrect: boolean | null;
    explanation: string | null;
  }[];
}

export default function AdminResultsPage() {
  const [papers, setPapers] = useState<PaperOption[]>([]);
  const [papersLoading, setPapersLoading] = useState(true);
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ScoreBandId | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptDetail | null>(null);

  const loadResults = useCallback(async () => {
    if (!selectedPaperId) return;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ paperId: selectedPaperId });
    if (activeFilter !== "80_plus") {
      params.set("bandsOnly", "1");
    } else {
      params.set("page", String(page));
      params.set("limit", "20");
      params.set("minScore", "80");
      if (search.trim()) params.set("search", search.trim());
    }

    try {
      const res = await fetch(`/api/admin/results?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load results.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load results.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page, search, selectedPaperId]);

  useEffect(() => {
    setPapersLoading(true);
    fetch("/api/admin/papers", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load papers.");
        const options: PaperOption[] = Array.isArray(json)
          ? json
              .filter((paper: PaperOption & { isActive?: boolean }) => paper.isActive !== false)
              .map((paper: PaperOption) => ({
                id: paper.id,
                code: paper.code,
                title: paper.title,
              }))
          : [];
        setPapers(options);
        if (options.length > 0) {
          setSelectedPaperId((current) => current || options[0].id);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load papers.");
      })
      .finally(() => setPapersLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPaperId) return;
    void loadResults();
  }, [loadResults, selectedPaperId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeFilter === "80_plus") {
        setSearch(searchInput);
        setPage(1);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, activeFilter]);

  function handlePaperChange(paperId: string) {
    setSelectedPaperId(paperId);
    setActiveFilter(null);
    setPage(1);
    setSearch("");
    setSearchInput("");
  }

  function handleBandClick(bandId: ScoreBandId) {
    if (bandId !== "80_plus") return;
    setActiveFilter("80_plus");
    setPage(1);
  }

  function clearFilter() {
    setActiveFilter(null);
    setPage(1);
    setSearch("");
    setSearchInput("");
  }

  async function openAttemptDetail(attemptId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedAttempt(null);

    try {
      const res = await fetch(`/api/admin/results/${attemptId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load attempt details.");
      setSelectedAttempt(json);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Could not load attempt details.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeAttemptDetail() {
    setDetailOpen(false);
    setSelectedAttempt(null);
    setDetailError(null);
  }

  const submissions = data?.submissions ?? [];
  const pagination = data?.pagination;
  const isHighScoreFilter = activeFilter === "80_plus";
  const selectedPaperLabel =
    data?.selectedPaper?.label ??
    papers.find((paper) => paper.id === selectedPaperId)?.code ??
    "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Results"
        description="Review score distribution and high performers for each ACCA paper."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <label htmlFor="results-paper" className="text-sm font-medium text-slate-700">
            Paper
          </label>
          <select
            id="results-paper"
            value={selectedPaperId}
            onChange={(event) => handlePaperChange(event.target.value)}
            disabled={papersLoading || papers.length === 0}
            className="h-11 min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {papers.length === 0 ? (
              <option value="">No papers available</option>
            ) : (
              papers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.code} – {paper.title}
                </option>
              ))
            )}
          </select>
        </div>

        {selectedPaperLabel && (
          <p className="text-sm text-slate-500">
            Showing results for{" "}
            <span className="font-medium text-slate-800">{selectedPaperLabel}</span>
          </p>
        )}
      </div>

      {papersLoading ? (
        <PageLoading message="Loading papers…" />
      ) : papers.length === 0 ? (
        <EmptyState
          compact
          icon="papers"
          title="No papers available"
          description="Add ACCA papers in the admin panel to review student results."
          actionLabel="Manage Papers"
          actionHref="/admin/papers"
        />
      ) : loading && !data ? (
        <PageLoading message="Loading results…" />
      ) : error && !data ? (
        <Alert tone="error" title="Unable to load results">
          {error}
        </Alert>
      ) : (
        <>
          <AdminResultsScoreChart
            bands={data?.scoreBands ?? []}
            totalSubmissions={data?.totalSubmissions ?? 0}
            paperLabel={selectedPaperLabel}
            activeFilter={activeFilter}
            onBandClick={handleBandClick}
          />

          {isHighScoreFilter && (
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    High Scorers (80%+)
                  </h2>
                  <p className="mt-2 text-sm font-medium text-emerald-700">
                    Showing students with scores of 80% and above for {selectedPaperLabel}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                  <label className="sr-only" htmlFor="results-search">
                    Search submissions
                  </label>
                  <input
                    id="results-search"
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search name or email…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2 sm:min-w-[260px]"
                  />
                  <Button variant="outline" onClick={clearFilter} className="shrink-0">
                    Clear filter
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardBody className="space-y-4 p-0 sm:p-0">
              {loading ? (
                <PageLoading message="Updating submissions…" className="h-40" />
              ) : error ? (
                <div className="p-6">
                  <Alert tone="error" title="Unable to load submissions">
                    {error}
                  </Alert>
                </div>
              ) : submissions.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon="results"
                    title="No students scored 80% or above"
                    description="Try clearing the filter or check again after more student submissions."
                    actionLabel="Clear filter"
                    onAction={clearFilter}
                  />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHead>
                      <TableHeader>Student</TableHeader>
                      <TableHeader>Email</TableHeader>
                      <TableHeader>Paper</TableHeader>
                      <TableHeader>Score</TableHeader>
                      <TableHeader>Result</TableHeader>
                      <TableHeader>Submitted</TableHeader>
                      <TableHeader className="text-right">Action</TableHeader>
                    </TableHead>
                    <TableBody>
                      {submissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-medium">{submission.studentName}</TableCell>
                          <TableCell className="text-slate-600">{submission.email}</TableCell>
                          <TableCell className="font-medium text-brand-600">{submission.paper}</TableCell>
                          <TableCell className="font-semibold">{submission.score}%</TableCell>
                          <TableCell>
                            <Badge tone={submission.passed ? "success" : "danger"}>
                              {submission.passed ? "Pass" : "Fail"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {submission.submittedAt
                              ? new Date(submission.submittedAt).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAttemptDetail(submission.id)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-500">
                        Page {pagination.page} of {pagination.totalPages} · {pagination.total}{" "}
                        submission{pagination.total === 1 ? "" : "s"}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page <= 1}
                          onClick={() => setPage((current) => Math.max(1, current - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page >= pagination.totalPages}
                          onClick={() =>
                            setPage((current) => Math.min(pagination.totalPages, current + 1))
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
          )}
        </>
      )}

      <Modal
        open={detailOpen}
        onClose={closeAttemptDetail}
        title="Submission Details"
        size="lg"
      >
        {detailLoading ? (
          <PageLoading message="Loading submission details…" className="h-32" />
        ) : detailError ? (
          <Alert tone="error">{detailError}</Alert>
        ) : selectedAttempt ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-slate-500">Student</p>
                <p className="font-medium text-slate-900">{selectedAttempt.studentName}</p>
              </div>
              <div>
                <p className="text-slate-500">Email</p>
                <p className="font-medium text-slate-900">{selectedAttempt.email}</p>
              </div>
              <div>
                <p className="text-slate-500">Paper</p>
                <p className="font-medium text-slate-900">{selectedAttempt.paper}</p>
              </div>
              <div>
                <p className="text-slate-500">Score</p>
                <p className="font-medium text-slate-900">
                  {selectedAttempt.scorePercent}% ·{" "}
                  {selectedAttempt.passed ? "Pass" : "Fail"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Question Review</h3>
              {selectedAttempt.review.map((item, index) => (
                <div
                  key={`${item.questionText}-${index}`}
                  className={`rounded-xl border p-4 ${
                    item.isCorrect ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800">{item.questionText}</p>
                    <Badge tone={item.isCorrect ? "success" : "danger"}>
                      {item.isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.categoryTitle} / {item.subCategoryTitle}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    Your answer: {item.selectedOptionText ?? "Not answered"}
                  </p>
                  {!item.isCorrect && item.correctOptionText && (
                    <p className="mt-1 text-sm text-emerald-700">
                      Correct answer: {item.correctOptionText}
                    </p>
                  )}
                  {item.explanation && (
                    <p className="mt-2 text-sm text-brand-800">{item.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
