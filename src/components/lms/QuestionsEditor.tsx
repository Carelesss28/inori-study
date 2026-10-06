"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { typeLabel } from "@/lib/grading";
import { uid } from "@/lib/seed";
import type { Question, QuestionType } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Button, Field, IconButton, cx, inputClass } from "@/components/ui/primitives";
import { Rich } from "@/components/ui/Rich";
import { CsvImportModal, type ImportMode } from "./CsvImport";

export function blankQuestion(type: QuestionType): Question {
  return {
    id: uid("q"),
    type,
    prompt: "",
    options: type === "blank" ? [] : ["", "", "", ""],
    correct: [],
    accepted: type === "blank" ? [""] : [],
    marks: type === "mcma" ? 2 : 1,
    explanation: "",
  };
}

export function problemsWith(q: Question): string | null {
  if (!q.prompt.trim()) return "Write the question.";
  if (q.type === "blank") return q.accepted.some((a) => a.trim()) ? null : "Add at least one accepted answer.";
  const filled = q.options.filter((o) => o.trim()).length;
  if (filled < 2) return "Add at least two options.";
  if (q.options.some((o, i) => !o.trim() && q.correct.includes(i))) return "A correct option is empty.";
  if (q.type === "mcq" && q.correct.length !== 1) return "Pick exactly one correct option.";
  if (q.type === "mcma" && q.correct.length < 1) return "Pick at least one correct option.";
  return null;
}

/** Remove empty options and remap the correct indexes to match. */
export function tidy(q: Question): Question {
  if (q.type === "blank") return { ...q, options: [], correct: [], accepted: q.accepted.map((a) => a.trim()).filter(Boolean) };
  const keep = q.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
  return {
    ...q,
    accepted: [],
    options: keep.map((x) => x.o),
    correct: keep.flatMap((x, newIdx) => (q.correct.includes(x.i) ? [newIdx] : [])),
  };
}

/** The question list shared by personal quizzes and classroom sets: cards, add bar and CSV import. */
export function QuestionsEditor({
  questions,
  setQuestions,
  showErrors,
  onImported,
  openImport = false,
}: {
  questions: Question[];
  setQuestions: Dispatch<SetStateAction<Question[]>>;
  showErrors: boolean;
  /** called after a CSV import, e.g. to fill an empty title from the file name */
  onImported?: (fileName: string) => void;
  openImport?: boolean;
}) {
  const [csvOpen, setCsvOpen] = useState(openImport);
  const [notice, setNotice] = useState<string | null>(null);
  const issues = questions.map(problemsWith);

  const patch = (id: string, p: Partial<Question>) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...p } : q)));
  const move = (i: number, d: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs];
      const j = i + d;
      if (j < 0 || j >= next.length) return qs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // an untouched starter question shouldn't survive an import
  const isPristine = (q: Question) => !q.prompt.trim() && q.options.every((o) => !o.trim()) && q.accepted.every((a) => !a.trim()) && !q.explanation.trim();

  const importQuestions = (imported: Question[], mode: ImportMode, fileName: string) => {
    const kept = mode === "replace" ? [] : questions.filter((q) => !isPristine(q));
    setQuestions([...kept, ...imported]);
    onImported?.(fileName);
    setNotice(`Imported ${imported.length} question${imported.length === 1 ? "" : "s"} from ${fileName || "CSV"}. Review them below, then save.`);
    const firstId = imported[0]?.id;
    if (firstId) setTimeout(() => document.getElementById(`qe-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  return (
    <>
      <section className="card flex flex-wrap items-center gap-4 border-dashed p-4 sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lav-soft text-lav">
          <Icon name="upload" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-ink">Have your questions in a spreadsheet?</p>
          <p className="text-xs text-ink-soft">Import MCQ, MCMA and fill-in-the-blank questions from a CSV file — templates included.</p>
        </div>
        <Button icon="upload" onClick={() => setCsvOpen(true)}>
          Import CSV
        </Button>
        {notice && (
          <p className="flex w-full items-center gap-2 rounded-lg bg-teal-soft px-3 py-2 text-sm font-semibold text-teal" role="status">
            <Icon name="check" size={15} strokeWidth={2.6} />
            <span className="flex-1">{notice}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
              <Icon name="x" size={14} />
            </button>
          </p>
        )}
      </section>

      <p className="-mb-2 px-1 text-xs font-bold text-ink-soft">
        {questions.length} question{questions.length === 1 ? "" : "s"} · {questions.reduce((n, q) => n + q.marks, 0)} marks
      </p>

      {questions.map((q, i) => (
        <section key={q.id} id={`qe-${q.id}`} className={cx("card p-5", showErrors && issues[i] && "border-danger/60")}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-soft text-xs font-extrabold text-pink-strong">{i + 1}</span>
            <div className="flex rounded-lg bg-panel-2 p-0.5" role="radiogroup" aria-label="Question type">
              {(["mcq", "mcma", "blank"] as QuestionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={q.type === t}
                  onClick={() => {
                    if (t === q.type) return;
                    const opts = t === "blank" ? [] : q.options.length ? q.options : ["", "", "", ""];
                    patch(q.id, {
                      type: t,
                      options: opts,
                      correct: t === "mcq" ? q.correct.slice(0, 1) : t === "blank" ? [] : q.correct,
                      accepted: t === "blank" ? (q.accepted.length ? q.accepted : [""]) : [],
                    });
                  }}
                  className={cx("rounded-md px-2.5 py-1 text-xs font-extrabold", q.type === t ? "bg-panel text-ink shadow-sm" : "text-ink-soft")}
                >
                  {typeLabel[t]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
              Marks
              <input type="number" min={1} value={q.marks} onChange={(e) => patch(q.id, { marks: Math.max(1, Number(e.target.value)) })} className={cx(inputClass, "h-8 w-16 py-1")} />
            </label>
            <div className="ml-auto flex">
              <IconButton icon="arrowUp" label="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30" />
              <IconButton icon="arrowDown" label="Move down" onClick={() => move(i, 1)} disabled={i === questions.length - 1} className="disabled:opacity-30" />
              <IconButton
                icon="plus"
                label="Duplicate"
                onClick={() => setQuestions((qs) => [...qs.slice(0, i + 1), { ...q, id: uid("q") }, ...qs.slice(i + 1)])}
              />
              <IconButton icon="trash" label="Delete question" onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))} className="hover:text-danger" />
            </div>
          </div>

          <Field label="Question" hint="Use $...$ for maths, e.g. $\frac{1}{s}$">
            <textarea className={cx(inputClass, "min-h-16 resize-y")} value={q.prompt} onChange={(e) => patch(q.id, { prompt: e.target.value })} placeholder="What is…?" />
          </Field>
          {q.prompt.includes("$") && (
            <p className="mt-2 rounded-lg bg-panel-2 px-3 py-2 text-sm text-ink">
              <Rich text={q.prompt} />
            </p>
          )}

          {q.type === "blank" ? (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-bold text-ink-soft">Accepted answers <span className="font-semibold text-ink-faint">(not case or space sensitive)</span></p>
              <div className="space-y-2">
                {q.accepted.map((a, j) => (
                  <div key={j} className="flex gap-2">
                    <input className={inputClass} value={a} onChange={(e) => patch(q.id, { accepted: q.accepted.map((x, k) => (k === j ? e.target.value : x)) })} placeholder="Answer" />
                    <IconButton icon="x" label="Remove answer" onClick={() => patch(q.id, { accepted: q.accepted.filter((_, k) => k !== j) })} disabled={q.accepted.length === 1} className="disabled:opacity-30" />
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" icon="plus" className="mt-2" onClick={() => patch(q.id, { accepted: [...q.accepted, ""] })}>
                Another accepted answer
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-bold text-ink-soft">
                Options <span className="font-semibold text-ink-faint">— tick the correct {q.type === "mcq" ? "one" : "ones"}</span>
              </p>
              <div className="space-y-2">
                {q.options.map((o, j) => {
                  const on = q.correct.includes(j);
                  return (
                    <div key={j} className="flex items-center gap-2">
                      <button
                        type="button"
                        role={q.type === "mcq" ? "radio" : "checkbox"}
                        aria-checked={on}
                        aria-label={`Option ${String.fromCharCode(65 + j)} is correct`}
                        onClick={() => patch(q.id, { correct: q.type === "mcq" ? [j] : on ? q.correct.filter((x) => x !== j) : [...q.correct, j].sort() })}
                        className={cx(
                          "flex h-6 w-6 shrink-0 items-center justify-center border-2",
                          q.type === "mcq" ? "rounded-full" : "rounded-md",
                          on ? "border-teal bg-teal text-white" : "border-line-strong bg-panel"
                        )}
                      >
                        {on && <Icon name="check" size={13} strokeWidth={3} />}
                      </button>
                      <span className="w-4 text-xs font-extrabold text-ink-faint">{String.fromCharCode(65 + j)}</span>
                      <input className={inputClass} value={o} onChange={(e) => patch(q.id, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })} placeholder={`Option ${String.fromCharCode(65 + j)}`} />
                      <IconButton
                        icon="x"
                        label="Remove option"
                        disabled={q.options.length <= 2}
                        className="disabled:opacity-30"
                        onClick={() =>
                          patch(q.id, {
                            options: q.options.filter((_, k) => k !== j),
                            correct: q.correct.filter((x) => x !== j).map((x) => (x > j ? x - 1 : x)),
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
              {q.options.length < 8 && (
                <Button variant="ghost" size="sm" icon="plus" className="mt-2" onClick={() => patch(q.id, { options: [...q.options, ""] })}>
                  Add option
                </Button>
              )}
            </div>
          )}

          <div className="mt-4">
            <Field label="Explanation (shown on the results page)">
              <textarea className={cx(inputClass, "min-h-14 resize-y")} value={q.explanation} onChange={(e) => patch(q.id, { explanation: e.target.value })} placeholder="Why is this the answer?" />
            </Field>
          </div>
          {showErrors && issues[i] && <p className="mt-3 text-sm font-semibold text-danger">{issues[i]}</p>}
        </section>
      ))}

      <div className="card flex flex-wrap items-center gap-2 p-4">
        <span className="mr-1 text-sm font-bold text-ink-soft">Add question:</span>
        {(["mcq", "mcma", "blank"] as QuestionType[]).map((t) => (
          <Button key={t} variant="soft" size="sm" icon="plus" onClick={() => setQuestions((qs) => [...qs, blankQuestion(t)])}>
            {typeLabel[t]}
          </Button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-line-strong sm:block" aria-hidden="true" />
        <Button variant="outline" size="sm" icon="upload" onClick={() => setCsvOpen(true)}>
          Import CSV
        </Button>
      </div>

      <CsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} onImport={importQuestions} hasQuestions={questions.some((q) => !isPristine(q))} />
    </>
  );
}
