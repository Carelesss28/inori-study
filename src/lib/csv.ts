import { uid } from "./seed";
import type { Question, QuestionType } from "./types";

/*
 * CSV → quiz questions.
 *
 * Columns (header row required, any order, case-insensitive):
 *   type         mcq | mcma | blank   (optional — see `fallback`)
 *   question     the prompt; inline $math$ allowed
 *   option_a …   choices for mcq / mcma (option_a … option_h, or a … h, or option_1 …)
 *   correct      mcq:   one letter / number / option text      e.g.  B
 *                mcma:  several, separated by ; or |            e.g.  A;C
 *                blank: accepted answers separated by |         e.g.  H2O|h2o
 *   marks        optional, defaults to 1 (2 for mcma)
 *   explanation  optional
 */

export type FallbackType = "auto" | QuestionType;

export interface ParsedRow {
  line: number;
  prompt: string;
  type: QuestionType | null;
  question?: Question;
  error?: string;
}

const MAX_OPTIONS = 8;
const LETTERS = "ABCDEFGH";

/** RFC-4180-ish parser: quoted fields, "" escapes, newlines inside quotes, BOM, , ; or tab delimiters. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const counts = { ",": 0, ";": 0, "\t": 0 } as Record<string, number>;
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  const [best, hits] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const delim = hits > 0 ? best : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === "") quoted = true;
    else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function norm(h: string) {
  return h.trim().toLowerCase().replace(/[\s\-.]+/g, "_");
}

interface Columns {
  type: number;
  question: number;
  correct: number;
  marks: number;
  explanation: number;
  options: number[]; // column index per option slot, in order
}

function mapColumns(header: string[]): Columns | string {
  const h = header.map(norm);
  const find = (...names: string[]) => h.findIndex((x) => names.includes(x));
  const cols: Columns = {
    type: find("type", "question_type", "kind"),
    question: find("question", "prompt", "questions", "question_text"),
    correct: find("correct", "answer", "answers", "correct_answer", "correct_answers", "accepted", "accepted_answers"),
    marks: find("marks", "mark", "points", "score"),
    explanation: find("explanation", "explain", "feedback", "reason"),
    options: [],
  };
  const slots: { order: number; col: number }[] = [];
  h.forEach((name, col) => {
    const m = name.match(/^(?:option|choice|opt)?_?([a-h])$/) ?? null;
    const n = name.match(/^(?:option|choice|opt)_?([1-8])$/);
    if (m) slots.push({ order: LETTERS.indexOf(m[1].toUpperCase()), col });
    else if (n) slots.push({ order: Number(n[1]) - 1, col });
  });
  cols.options = slots.sort((a, b) => a.order - b.order).map((s) => s.col).slice(0, MAX_OPTIONS);
  if (cols.question < 0) return 'No "question" column found. Download a template to see the expected headers.';
  if (cols.correct < 0) return 'No "correct" column found. Download a template to see the expected headers.';
  return cols;
}

function toType(raw: string): QuestionType | null {
  const t = raw.trim().toLowerCase().replace(/[\s_-]/g, "");
  if (["mcq", "single", "singlechoice", "multiplechoice"].includes(t)) return "mcq";
  if (["mcma", "mcmq", "multi", "multiple", "multianswer", "multipleanswer", "multipleanswers", "checkbox"].includes(t)) return "mcma";
  if (["blank", "fill", "fillblank", "fillintheblank", "fillin", "short", "shortanswer", "text"].includes(t)) return "blank";
  return null;
}

/** Turn one "correct" token into an option index, or null. */
function optionIndex(token: string, options: string[]): number | null {
  const t = token.trim();
  if (!t) return null;
  if (/^[A-Ha-h]$/.test(t)) return LETTERS.indexOf(t.toUpperCase());
  if (/^[1-8]$/.test(t)) return Number(t) - 1;
  const byText = options.findIndex((o) => o.trim().toLowerCase() === t.toLowerCase());
  return byText >= 0 ? byText : null;
}

function rowToQuestion(cells: string[], cols: Columns, line: number, fallback: FallbackType): ParsedRow {
  const get = (i: number) => (i >= 0 ? (cells[i] ?? "").trim() : "");
  const prompt = get(cols.question);
  const correctRaw = get(cols.correct);
  // keep option positions (so letters still line up), then drop trailing empties
  const optionCells = cols.options.map(get);
  while (optionCells.length && !optionCells[optionCells.length - 1]) optionCells.pop();

  let type: QuestionType | null = null;
  const typeRaw = get(cols.type);
  if (typeRaw) {
    type = toType(typeRaw);
    if (!type) return { line, prompt, type: null, error: `Unknown type "${typeRaw}" — use mcq, mcma or blank.` };
  } else if (fallback !== "auto") {
    type = fallback;
  } else {
    const parts = correctRaw.split(/[;|]/).filter((x) => x.trim());
    type = optionCells.length === 0 ? "blank" : parts.length > 1 ? "mcma" : "mcq";
  }

  if (!prompt) return { line, prompt, type, error: "The question is empty." };
  if (!correctRaw) return { line, prompt, type, error: "The correct answer is empty." };

  const marksRaw = get(cols.marks);
  const marks = marksRaw ? Math.round(Number(marksRaw)) : type === "mcma" ? 2 : 1;
  if (!Number.isFinite(marks) || marks < 1) return { line, prompt, type, error: `Marks "${marksRaw}" must be a whole number of 1 or more.` };
  const explanation = get(cols.explanation);

  if (type === "blank") {
    const accepted = correctRaw.split("|").map((a) => a.trim()).filter(Boolean);
    return { line, prompt, type, question: { id: uid("q"), type, prompt, options: [], correct: [], accepted, marks, explanation } };
  }

  if (optionCells.filter(Boolean).length < 2) return { line, prompt, type, error: "Needs at least two options." };
  if (optionCells.some((o) => !o)) return { line, prompt, type, error: "There is an empty option between filled ones." };

  const tokens = type === "mcq" ? [correctRaw] : correctRaw.split(/[;|]/);
  const correct: number[] = [];
  for (const tok of tokens) {
    if (!tok.trim()) continue;
    const idx = optionIndex(tok, optionCells);
    if (idx === null || idx >= optionCells.length) {
      return { line, prompt, type, error: `Correct answer "${tok.trim()}" doesn't match an option (use a letter like B${type === "mcma" ? ", or A;C" : ""}).` };
    }
    if (!correct.includes(idx)) correct.push(idx);
  }
  if (type === "mcq" && correct.length !== 1) return { line, prompt, type, error: "MCQ needs exactly one correct option." };
  if (correct.length === 0) return { line, prompt, type, error: "Pick at least one correct option." };

  return {
    line,
    prompt,
    type,
    question: { id: uid("q"), type, prompt, options: optionCells, correct: correct.sort((a, b) => a - b), accepted: [], marks, explanation },
  };
}

export function csvToQuestions(text: string, fallback: FallbackType = "auto"): { rows: ParsedRow[]; error?: string } {
  const table = parseCsv(text).filter((r) => r.some((c) => c.trim()));
  if (table.length === 0) return { rows: [], error: "The file is empty." };
  const cols = mapColumns(table[0]);
  if (typeof cols === "string") return { rows: [], error: cols };
  if (table.length === 1) return { rows: [], error: "The file only has a header row — add some questions under it." };
  if (table.length > 501) return { rows: [], error: "That's more than 500 questions. Split the file into smaller quizzes." };
  return { rows: table.slice(1).map((cells, i) => rowToQuestion(cells, cols, i + 2, fallback)) };
}

/* ---------------------------------------------------------------- templates */

function toCsv(rows: (string | number)[][]) {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\r\n");
}

const choiceHeader = ["type", "question", "option_a", "option_b", "option_c", "option_d", "correct", "marks", "explanation"];
const blankHeader = ["type", "question", "correct", "marks", "explanation"];

export const csvTemplates = {
  mcq: {
    label: "MCQ",
    file: "quiz-template-mcq.csv",
    hint: "One correct answer — put its letter in correct.",
    rows: [
      choiceHeader,
      ["mcq", "What is 2 + 2?", "3", "4", "5", "6", "B", 1, "2 + 2 = 4."],
      ["mcq", "Which planet is known as the Red Planet?", "Venus", "Mars", "Jupiter", "Saturn", "B", 1, "Iron oxide makes Mars look red."],
      ["mcq", "What is the Laplace transform of $1$?", "$\\frac{1}{s}$", "$s$", "$1$", "$0$", "A", 1, ""],
    ],
  },
  mcma: {
    label: "MCMA",
    file: "quiz-template-mcma.csv",
    hint: "Several correct answers — separate letters with ; like A;C.",
    rows: [
      choiceHeader,
      ["mcma", "Which of these are prime numbers?", "2", "3", "4", "9", "A;B", 2, "4 and 9 have other factors."],
      ["mcma", "Which are programming languages?", "Python", "HTML", "C++", "Excel", "A;C", 2, "HTML is markup; Excel is an app."],
    ],
  },
  blank: {
    label: "Blank",
    file: "quiz-template-blank.csv",
    hint: "Type the answer — separate alternatives with | like H2O|h2o.",
    rows: [
      blankHeader,
      ["blank", "The chemical formula for water is ___.", "H2O", 1, ""],
      ["blank", "Integer division: 7 / 2 in C++ gives ___.", "3", 1, "The remainder is discarded."],
      ["blank", "The colour of a clear daytime sky is ___.", "blue|light blue", 1, "Any listed answer is accepted."],
    ],
  },
  mixed: {
    label: "Mixed",
    file: "quiz-template-mixed.csv",
    hint: "All three types in one file — leave option cells empty for blanks.",
    rows: [
      choiceHeader,
      ["mcq", "What is 2 + 2?", "3", "4", "5", "6", "B", 1, "2 + 2 = 4."],
      ["mcma", "Which of these are prime numbers?", "2", "3", "4", "9", "A;B", 2, "4 and 9 have other factors."],
      ["blank", "The chemical formula for water is ___.", "", "", "", "", "H2O", 1, ""],
    ],
  },
} as const;

export type TemplateKind = keyof typeof csvTemplates;

export function downloadTemplate(kind: TemplateKind) {
  const t = csvTemplates[kind];
  // BOM so Excel opens it as UTF-8 (keeps maths symbols intact)
  const blob = new Blob(["﻿" + toCsv(t.rows as unknown as (string | number)[][])], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: t.file }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
