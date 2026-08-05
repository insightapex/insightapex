"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Paper = { id: string; code: string; title: string };
type Part = { id: string; code: string; title: string; papers: Paper[] };

type LecturerScopeValue = {
  schoolName: string;
  parts: Part[];
  partId: string;
  paperId: string;
  selectedPart: Part | null;
  selectedPaper: Paper | null;
  /** Total papers assigned by the school (across parts). */
  assignedPaperCount: number;
  /** Lecturer may switch paper only when school assigned 2+. */
  canChoosePaper: boolean;
  /** Lecturer may switch part only when assigned papers span 2+ parts. */
  canChoosePart: boolean;
  loading: boolean;
  error: string | null;
  setPartId: (id: string) => void;
  setPaperId: (id: string) => void;
  filterSubCategoryId: string | null;
  setFilterSubCategoryId: (id: string | null) => void;
};

const LecturerScopeContext = createContext<LecturerScopeValue | null>(null);

const STORAGE_KEY = "insightapex.lecturer.scope";

export function LecturerScopeProvider({ children }: { children: ReactNode }) {
  const [parts, setParts] = useState<Part[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [partId, setPartIdState] = useState("");
  const [paperId, setPaperIdState] = useState("");
  const [filterSubCategoryId, setFilterSubCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lecturer/papers");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load papers");
        if (cancelled) return;

        const loaded: Part[] = json.parts ?? [];
        setParts(loaded);
        setSchoolName(json.school?.name ?? "");

        let saved: { partId?: string; paperId?: string } = {};
        try {
          saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
        } catch {
          saved = {};
        }

        // Only restore saved selection if it is still in the school-assigned set.
        const part =
          loaded.find((p) => p.id === saved.partId) ?? loaded[0] ?? null;
        const paper =
          part?.papers.find((p) => p.id === saved.paperId) ?? part?.papers[0] ?? null;

        setPartIdState(part?.id ?? "");
        setPaperIdState(paper?.id ?? "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((nextPartId: string, nextPaperId: string) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ partId: nextPartId, paperId: nextPaperId })
      );
    } catch {
      /* ignore */
    }
  }, []);

  const setPartId = useCallback(
    (id: string) => {
      const part = parts.find((p) => p.id === id);
      if (!part) return;
      const nextPaperId = part.papers[0]?.id ?? "";
      setPartIdState(id);
      setPaperIdState(nextPaperId);
      setFilterSubCategoryId(null);
      persist(id, nextPaperId);
    },
    [parts, persist]
  );

  const setPaperId = useCallback(
    (id: string) => {
      // Guard: only allow papers that exist in the assigned tree.
      const ownerPart = parts.find((p) => p.papers.some((paper) => paper.id === id));
      if (!ownerPart) return;
      setPartIdState(ownerPart.id);
      setPaperIdState(id);
      setFilterSubCategoryId(null);
      persist(ownerPart.id, id);
    },
    [parts, persist]
  );

  const selectedPart = useMemo(
    () => parts.find((p) => p.id === partId) ?? null,
    [parts, partId]
  );
  const selectedPaper = useMemo(
    () => selectedPart?.papers.find((p) => p.id === paperId) ?? null,
    [selectedPart, paperId]
  );

  const assignedPaperCount = useMemo(
    () => parts.reduce((n, p) => n + p.papers.length, 0),
    [parts]
  );
  const canChoosePaper = assignedPaperCount > 1;
  const canChoosePart = parts.length > 1;

  const value: LecturerScopeValue = {
    schoolName,
    parts,
    partId,
    paperId,
    selectedPart,
    selectedPaper,
    assignedPaperCount,
    canChoosePaper,
    canChoosePart,
    loading,
    error,
    setPartId,
    setPaperId,
    filterSubCategoryId,
    setFilterSubCategoryId,
  };

  return (
    <LecturerScopeContext.Provider value={value}>{children}</LecturerScopeContext.Provider>
  );
}

export function useLecturerScope() {
  const ctx = useContext(LecturerScopeContext);
  if (!ctx) throw new Error("useLecturerScope must be used within LecturerScopeProvider");
  return ctx;
}
