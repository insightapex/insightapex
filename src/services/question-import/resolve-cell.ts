/**
 * Resolve Excel cell display values — never import raw XLOOKUP / formula text.
 */

const FORMULA_TEXT_RE =
  /^=|_xlfn\.|XLOOKUP\s*\(|VLOOKUP\s*\(|INDEX\s*\(|MATCH\s*\(/i;

export function looksLikeFormulaText(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const t = value.trim();
  return FORMULA_TEXT_RE.test(t);
}

/** Normalize exceljs cell value to a display string (cached result preferred). */
export function cellToDisplayString(cell: {
  value?: unknown;
  text?: string;
  result?: unknown;
}): string {
  const text = typeof cell.text === "string" ? cell.text.trim() : "";
  if (text && !looksLikeFormulaText(text)) return text;

  const value = cell.value;

  if (value == null) return "";

  if (typeof value === "string") {
    return looksLikeFormulaText(value) ? "" : value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    const obj = value as {
      formula?: string;
      sharedFormula?: string;
      result?: unknown;
      richText?: Array<{ text?: string }>;
      text?: string;
      hyperlink?: string;
    };

    if (obj.result != null) {
      if (typeof obj.result === "string") {
        const r = obj.result.trim();
        if (r && !looksLikeFormulaText(r)) return r;
      } else if (typeof obj.result === "number" || typeof obj.result === "boolean") {
        return String(obj.result);
      } else if (obj.result instanceof Date) {
        return obj.result.toISOString();
      }
    }
    if (Array.isArray(obj.richText)) {
      const joined = obj.richText.map((r) => r.text ?? "").join("").trim();
      if (joined && !looksLikeFormulaText(joined)) return joined;
    }
    if (typeof obj.text === "string" && !looksLikeFormulaText(obj.text)) {
      return obj.text.trim();
    }
    // Formula without cached result — caller must resolve via ID maps.
    if (obj.formula || obj.sharedFormula) return "";
  }

  return "";
}

export function isEmptyCell(value: string): boolean {
  return !value || !value.trim();
}
