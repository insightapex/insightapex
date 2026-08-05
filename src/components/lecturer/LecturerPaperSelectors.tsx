"use client";

import { useLecturerScope } from "@/components/lecturer/LecturerScope";
import { Select } from "@/components/ui/Select";

export function LecturerPaperSelectors({ className }: { className?: string }) {
  const {
    schoolName,
    parts,
    partId,
    paperId,
    selectedPart,
    selectedPaper,
    assignedPaperCount,
    canChoosePart,
    canChoosePaper,
    setPartId,
    setPaperId,
    loading,
  } = useLecturerScope();

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            School
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {loading ? "Loading…" : schoolName || "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {loading
              ? ""
              : assignedPaperCount === 0
                ? "No papers assigned yet — ask your school admin."
                : canChoosePaper
                  ? "Your school assigned multiple papers. Choose one to view its data."
                  : "Paper assigned by your school (locked)."}
          </p>
        </div>
        <div className="w-full sm:w-52">
          <Select
            label="Part"
            value={partId}
            onChange={(e) => setPartId(e.target.value)}
            disabled={loading || !canChoosePart || parts.length === 0}
            options={parts.map((p) => ({
              value: p.id,
              label: `${p.code} — ${p.title}`,
            }))}
            placeholder={parts.length === 0 ? "No assigned parts" : "Select part"}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            label="Paper"
            value={paperId}
            onChange={(e) => setPaperId(e.target.value)}
            disabled={
              loading ||
              !canChoosePaper ||
              !selectedPart ||
              selectedPart.papers.length === 0
            }
            options={(selectedPart?.papers ?? []).map((p) => ({
              value: p.id,
              label: `${p.code} — ${p.title}`,
            }))}
            placeholder={selectedPaper ? `${selectedPaper.code}` : "Select paper"}
          />
        </div>
      </div>
    </div>
  );
}
