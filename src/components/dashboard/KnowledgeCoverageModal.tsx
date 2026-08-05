"use client";

import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import type { DashboardCategoryCoverage } from "@/types";

export function KnowledgeCoverageModal({
  open,
  onClose,
  coverage,
  paperLabel = "Selected paper",
}: {
  open: boolean;
  onClose: () => void;
  coverage?: DashboardCategoryCoverage;
  paperLabel?: string;
}) {
  const finished = coverage?.finished ?? [];
  const onTheWay = coverage?.onTheWay ?? [];
  const notStarted = coverage?.notStarted ?? [];
  const counts = coverage?.counts;

  return (
    <Modal open={open} onClose={onClose} title="Knowledge coverage">
      <p className="mb-4 text-sm text-slate-500">
        Category progress for <span className="font-medium text-slate-800">{paperLabel}</span>
        {counts ? (
          <>
            {" "}
            · {counts.finished} finished · {counts.onTheWay} in progress · {counts.notStarted}{" "}
            not started
          </>
        ) : null}
      </p>

      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
        <Section
          title="Finished"
          tone="success"
          items={finished.map((c) => ({
            id: c.id,
            label: c.title,
            meta: `${c.attemptedSubCategories}/${c.totalSubCategories} · ${c.percent}%`,
          }))}
        />
        <Section
          title="On the way"
          tone="warning"
          items={onTheWay.map((c) => ({
            id: c.id,
            label: c.title,
            meta: `${c.attemptedSubCategories}/${c.totalSubCategories} · ${c.percent}%`,
          }))}
        />
        <Section
          title="Not started"
          tone="neutral"
          items={notStarted.map((c) => ({
            id: c.id,
            label: c.title,
            meta: `${c.totalSubCategories} sub categories`,
          }))}
        />
      </div>
    </Modal>
  );
}

function Section({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "success" | "warning" | "neutral";
  items: { id: string; label: string; meta: string }[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        <Badge tone={tone}>{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">None</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
            >
              <span className="truncate text-sm font-medium text-slate-800">{item.label}</span>
              <span className="shrink-0 text-xs text-slate-500">{item.meta}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
