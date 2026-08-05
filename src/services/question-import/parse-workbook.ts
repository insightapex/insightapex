/**
 * Parse FA-style question bank workbooks (.xlsx) with exceljs.
 * Resolves formula cells to cached display values; builds Topic/Sub-Topic maps.
 */

import ExcelJS from "exceljs";
import { cellToDisplayString, looksLikeFormulaText } from "./resolve-cell";
import { IMPORT_LIMITS, type RawImportRow } from "./types";

const HEADER_ALIASES: Record<string, keyof RawImportRow | "skip"> = {
  no: "no",
  id: "externalQuestionId",
  subject: "subject",
  chapter: "chapter",
  "topic id": "topicId",
  "topicid": "topicId",
  "sub-topic id": "subTopicId",
  "sub topic id": "subTopicId",
  "subtopic id": "subTopicId",
  "topic name": "topicName",
  "topicname": "topicName",
  "sub-topic name": "subTopicName",
  "sub topic name": "subTopicName",
  "subtopic name": "subTopicName",
  type: "typeRaw",
  difficulty: "difficultyRaw",
  "learning outcome": "learningOutcome",
  question: "questionText",
  "option a": "optionA",
  "option b": "optionB",
  "option c": "optionC",
  "option d": "optionD",
  "correct answer": "correctAnswerRaw",
  "english explanation": "explanationEn",
  "burmese explanation": "explanationMy",
  "last updated": "lastUpdated",
  "review status": "reviewStatusRaw",
  "access level": "accessLevelRaw",
};

export type TopicMapEntry = { topicId: string; topicName: string };
export type SubTopicMapEntry = {
  topicId: string;
  subTopicId: string;
  subTopicName: string;
};

export type ParsedWorkbook = {
  sheetsDetected: string[];
  questionSheetNames: string[];
  rows: RawImportRow[];
  topicById: Map<string, string>;
  subTopicByKey: Map<string, string>; // `${topicId}::${subTopicId}` → name
};

function normalizeHeader(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().toLowerCase();
}

function emptyRaw(sheetName: string, rowNumber: number): RawImportRow {
  return {
    sheetName,
    rowNumber,
    no: "",
    externalQuestionId: "",
    subject: "",
    chapter: "",
    topicId: "",
    subTopicId: "",
    topicName: "",
    subTopicName: "",
    typeRaw: "",
    difficultyRaw: "",
    learningOutcome: "",
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswerRaw: "",
    explanationEn: "",
    explanationMy: "",
    lastUpdated: "",
    reviewStatusRaw: "",
    accessLevelRaw: "",
  };
}

function readRowCells(
  row: ExcelJS.Row,
  colCount: number
): string[] {
  const cells: string[] = [];
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cells.push(cellToDisplayString(cell));
  }
  return cells;
}

function isQuestionHeaderRow(cells: string[]): boolean {
  const normalized = cells.map(normalizeHeader);
  const hasId = normalized.includes("id");
  const hasQuestion = normalized.includes("question");
  const hasSubject = normalized.includes("subject");
  return hasId && hasQuestion && hasSubject;
}

function isMappingSheetName(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("chapter") ||
    n.includes("mapping") ||
    n.includes("topic") ||
    n.includes("lookup") ||
    n.includes("reference")
  );
}

function buildHeaderMap(cells: string[]): Map<number, keyof RawImportRow> {
  const map = new Map<number, keyof RawImportRow>();
  cells.forEach((cell, idx) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)];
    if (key && key !== "skip") map.set(idx, key);
  });
  return map;
}

function ingestMappingSheet(
  sheet: ExcelJS.Worksheet,
  topicById: Map<string, string>,
  subTopicByKey: Map<string, string>
) {
  let headerRow = 0;
  let topicIdCol = -1;
  let topicNameCol = -1;
  let subIdCol = -1;
  let subNameCol = -1;

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (headerRow) return;
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = normalizeHeader(cellToDisplayString(cell));
    });
    const tid = values.findIndex((v) => v === "topic id" || v === "topicid");
    const tname = values.findIndex((v) => v === "topic name" || v === "topicname");
    const sid = values.findIndex(
      (v) => v === "sub-topic id" || v === "sub topic id" || v === "subtopic id"
    );
    const sname = values.findIndex(
      (v) => v === "sub-topic name" || v === "sub topic name" || v === "subtopic name"
    );
    if (tid >= 0 && (tname >= 0 || sid >= 0)) {
      headerRow = rowNumber;
      topicIdCol = tid;
      topicNameCol = tname;
      subIdCol = sid;
      subNameCol = sname;
    }
  });

  if (!headerRow || topicIdCol < 0) return;

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const topicId = cellToDisplayString(row.getCell(topicIdCol + 1)).trim();
    if (!topicId) return;
    const topicName =
      topicNameCol >= 0 ? cellToDisplayString(row.getCell(topicNameCol + 1)).trim() : "";
    if (topicName && !looksLikeFormulaText(topicName)) {
      topicById.set(topicId, topicName);
    }
    const subId =
      subIdCol >= 0 ? cellToDisplayString(row.getCell(subIdCol + 1)).trim() : "";
    const subName =
      subNameCol >= 0 ? cellToDisplayString(row.getCell(subNameCol + 1)).trim() : "";
    if (subId && subName && !looksLikeFormulaText(subName)) {
      subTopicByKey.set(`${topicId}::${subId}`, subName);
    }
  });
}

export async function parseQuestionWorkbook(buffer: Buffer): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  // exceljs typings accept Buffer via cast
  await workbook.xlsx.load(Uint8Array.from(buffer) as unknown as ExcelJS.Buffer);

  const sheetsDetected = workbook.worksheets.map((ws) => ws.name);
  const topicById = new Map<string, string>();
  const subTopicByKey = new Map<string, string>();
  const rows: RawImportRow[] = [];
  const questionSheetNames: string[] = [];

  // Pass 1 — mapping / lookup sheets
  for (const sheet of workbook.worksheets) {
    if (isMappingSheetName(sheet.name)) {
      ingestMappingSheet(sheet, topicById, subTopicByKey);
    }
  }

  // Pass 2 — question sheets
  for (const sheet of workbook.worksheets) {
    let headerMap: Map<number, keyof RawImportRow> | null = null;
    let headerRowNum = 0;
    let colCount = 0;

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const approxCols = Math.max(row.cellCount, 22);
      const cells = readRowCells(row, approxCols);

      if (!headerMap) {
        if (isQuestionHeaderRow(cells)) {
          headerMap = buildHeaderMap(cells);
          headerRowNum = rowNumber;
          colCount = cells.length;
          questionSheetNames.push(sheet.name);
        }
        return;
      }

      if (rowNumber <= headerRowNum) return;

      const raw = emptyRaw(sheet.name, rowNumber);
      headerMap.forEach((field, colIdx) => {
        const val = cellToDisplayString(row.getCell(colIdx + 1));
        (raw as Record<string, string | number>)[field] = val;
      });

      // Skip completely empty rows
      if (
        !raw.externalQuestionId &&
        !raw.questionText &&
        !raw.subject &&
        !raw.optionA
      ) {
        return;
      }

      // Resolve formula names via ID maps when display value missing
      if (!raw.topicName || looksLikeFormulaText(raw.topicName)) {
        const mapped = topicById.get(raw.topicId.trim());
        raw.topicName = mapped ?? "";
      }
      if (!raw.subTopicName || looksLikeFormulaText(raw.subTopicName)) {
        const mapped = subTopicByKey.get(`${raw.topicId.trim()}::${raw.subTopicId.trim()}`);
        raw.subTopicName = mapped ?? "";
      }

      rows.push(raw);

      if (rows.length > IMPORT_LIMITS.maxRows) {
        throw new Error(
          `Workbook exceeds the maximum of ${IMPORT_LIMITS.maxRows} question rows.`
        );
      }
    });

    void colCount;
  }

  // Also try non-mapping sheets that weren't named as mapping for topic maps
  for (const sheet of workbook.worksheets) {
    if (!isMappingSheetName(sheet.name) && !questionSheetNames.includes(sheet.name)) {
      ingestMappingSheet(sheet, topicById, subTopicByKey);
    }
  }

  // Second-pass name resolution after all maps loaded
  for (const raw of rows) {
    if (!raw.topicName && raw.topicId) {
      raw.topicName = topicById.get(raw.topicId.trim()) ?? "";
    }
    if (!raw.subTopicName && raw.topicId && raw.subTopicId) {
      raw.subTopicName =
        subTopicByKey.get(`${raw.topicId.trim()}::${raw.subTopicId.trim()}`) ?? "";
    }
  }

  return {
    sheetsDetected,
    questionSheetNames,
    rows,
    topicById,
    subTopicByKey,
  };
}

export function assertSafeUpload(file: {
  name: string;
  type: string;
  size: number;
}): void {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(IMPORT_LIMITS.acceptedExt)) {
    throw new Error("Only .xlsx Excel files are accepted.");
  }
  if (file.size <= 0) throw new Error("Uploaded file is empty.");
  if (file.size > IMPORT_LIMITS.maxFileBytes) {
    throw new Error(
      `File is too large. Maximum size is ${Math.round(IMPORT_LIMITS.maxFileBytes / (1024 * 1024))} MB.`
    );
  }
  if (
    file.type &&
    !IMPORT_LIMITS.acceptedMimes.includes(
      file.type as (typeof IMPORT_LIMITS.acceptedMimes)[number]
    ) &&
    file.type !== ""
  ) {
    // Soft check — some browsers send empty or odd MIME for xlsx
    if (!file.type.includes("sheet") && !file.type.includes("excel") && file.type !== "application/octet-stream" && file.type !== "application/zip") {
      throw new Error("Invalid file type. Please upload a valid .xlsx workbook.");
    }
  }
}
