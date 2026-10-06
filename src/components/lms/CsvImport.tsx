"use client";

import { useState } from "react";
import { csvTemplates, csvToQuestions, downloadTemplate, type FallbackType, type ParsedRow, type TemplateKind } from "@/lib/csv";
import { typeLabel } from "@/lib/grading";
import type { Question } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Button, Modal, cx } from "@/components/ui/primitives";
import { Rich } from "@/components/ui/Rich";

export type ImportMode = "append" | "replace";

export function CsvImportModal({
  open,
  onClose,
  onImport,
  hasQuestions,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (questions: Question[], mode: ImportMode, fileName: string) => void;
  hasQuestions: boolean;
}) {
  const [fallback, setFallback] = useState<FallbackType>("auto");
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<ImportMode>("append");
  const [dragging, setDragging] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const parsed = text === null ? null : csvToQuestions(text, fallback);
  const good = parsed?.rows.filter((r): r is ParsedRow & { question: Question } => !!r.question) ?? [];
  const bad = parsed?.rows.filter((r) => r.error) ?? [];

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
  };

  const reset = () => {
    setText(null);
    setFileName("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import questions from CSV"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon="upload"
            disabled={good.length === 0}
            onClick={() => {
              onImport(
                good.map((r) => r.question),
                mode,
                fileName
              );
              reset();
              onClose();
            }}
          >
            {good.length ? `Import ${good.length} question${good.length === 1 ? "" : "s"}` : "Import"}
          </Button>
        </>
      }
    >
      {/* templates */}
      <section>
        <p className="text-sm font-bold text-ink">1. Start from a template</p>
        <p className="mt-0.5 text-xs text-ink-soft">Open it in Excel or Google Sheets, replace the example rows, then save as CSV.</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(csvTemplates) as TemplateKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => downloadTemplate(k)}
              title={csvTemplates[k].hint}
              className="flex flex-col items-start gap-0.5 rounded-xl border border-line bg-panel-2/60 px-3 py-2.5 text-left hover:border-pink hover:bg-pink-soft/40"
            >
              <span className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                <Icon name="download" size={14} /> {csvTemplates[k].label}
              </span>
              <span className="text-[0.6875rem] leading-snug text-ink-soft">{csvTemplates[k].hint}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowHelp((v) => !v)} className="mt-2 text-xs font-bold text-pink-strong hover:underline" aria-expanded={showHelp}>
          {showHelp ? "Hide" : "Show"} column guide
        </button>
        {showHelp && <ColumnGuide />}
      </section>

      {/* file */}
      <section className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-ink">2. Upload your CSV</p>
          <label className="flex items-center gap-2 text-xs font-bold text-ink-soft">
            Rows without a type are
            <select value={fallback} onChange={(e) => setFallback(e.target.value as FallbackType)} className="rounded-lg border border-line-strong bg-panel px-2 py-1 text-ink focus:outline-none">
              <option value="auto">auto-detected</option>
              <option value="mcq">MCQ</option>
              <option value="mcma">MCMA</option>
              <option value="blank">Blank</option>
            </select>
          </label>
        </div>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            readFile(e.dataTransfer.files[0]);
          }}
          className={cx(
            "mt-2 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition-colors",
            dragging ? "border-pink bg-pink-soft/50" : "border-line-strong bg-panel-2/50 hover:border-pink"
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-soft text-pink-strong">
            <Icon name="upload" size={18} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-ink">{fileName || "Choose a .csv file or drop it here"}</span>
            <span className="block text-xs text-ink-soft">{fileName ? "Pick another file to replace it" : "Comma, semicolon or tab separated · UTF-8"}</span>
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              readFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      {/* preview */}
      {parsed && (
        <section className="mt-5">
          <p className="text-sm font-bold text-ink">3. Check the preview</p>
          {parsed.error ? (
            <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{parsed.error}</p>
          ) : (
            <>
              <p className="mt-1 text-xs text-ink-soft">
                <b className="text-teal">{good.length} ready</b>
                {bad.length > 0 && (
                  <>
                    {" · "}
                    <b className="text-danger">
                      {bad.length} row{bad.length === 1 ? "" : "s"} skipped
                    </b>{" "}
                    — fix them in the file and upload again
                  </>
                )}
              </p>
              <ul className="mt-2 max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line">
                {parsed.rows.map((r) => (
                  <li key={r.line} className="flex items-start gap-2.5 px-3 py-2 text-sm">
                    <span className="mt-0.5 w-10 shrink-0 text-[0.6875rem] font-bold text-ink-faint">Row {r.line}</span>
                    <span
                      className={cx(
                        "mt-0.5 w-12 shrink-0 rounded-md px-1.5 py-0.5 text-center text-[0.625rem] font-extrabold",
                        r.error ? "bg-danger/10 text-danger" : "bg-lav-soft text-lav"
                      )}
                    >
                      {r.type ? typeLabel[r.type] : "?"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-ink">{r.prompt ? <Rich text={r.prompt} /> : <i className="text-ink-faint">no question</i>}</span>
                      {r.error ? (
                        <span className="block text-xs font-semibold text-danger">{r.error}</span>
                      ) : (
                        <span className="block truncate text-xs text-ink-soft">
                          {r.question!.type === "blank"
                            ? `Answer: ${r.question!.accepted.join(" or ")}`
                            : `${r.question!.options.length} options · correct: ${r.question!.correct.map((i) => "ABCDEFGH"[i]).join(", ")}`}
                          {` · ${r.question!.marks} mark${r.question!.marks === 1 ? "" : "s"}`}
                        </span>
                      )}
                    </span>
                    <Icon name={r.error ? "x" : "check"} size={15} className={cx("mt-0.5 shrink-0", r.error ? "text-danger" : "text-teal")} strokeWidth={2.6} />
                  </li>
                ))}
              </ul>
              {hasQuestions && (
                <div role="radiogroup" aria-label="Import mode" className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-panel-2 p-1">
                  {(
                    [
                      ["append", "Add to current questions"],
                      ["replace", "Replace current questions"],
                    ] as [ImportMode, string][]
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mode === m}
                      onClick={() => setMode(m)}
                      className={cx("rounded-lg py-2 text-xs font-bold", mode === m ? "bg-panel text-ink shadow-sm" : "text-ink-soft")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </Modal>
  );
}

function ColumnGuide() {
  const rows: [string, string][] = [
    ["type", "mcq, mcma or blank. Optional — see “Rows without a type”."],
    ["question", "The question text. Inline maths like $\\frac{1}{s}$ works."],
    ["option_a … option_h", "Choices for MCQ / MCMA (at least two). Leave empty for blanks."],
    ["correct", "MCQ: one letter (B). MCMA: letters split by ; (A;C). Blank: answers split by | (H2O|h2o). Option numbers or exact option text also work."],
    ["marks", "Optional whole number. Defaults to 1 (MCMA: 2)."],
    ["explanation", "Optional. Shown on the results page."],
  ];
  return (
    <dl className="mt-2 divide-y divide-line rounded-xl border border-line text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-2 px-3 py-2">
          <dt className="font-mono font-bold text-ink">{k}</dt>
          <dd className="text-ink-soft">
            <Rich text={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
