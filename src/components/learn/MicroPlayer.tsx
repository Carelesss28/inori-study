"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gradeQuestion, gradeQuestions, isAnswered, normalizeBlank, typeLabel } from "@/lib/grading";
import type { AnswerValue, Question, QuestionResult } from "@/lib/types";
import { Bear } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { Button, IconButton, Ring, cx, inputClass } from "@/components/ui/primitives";
import { Rich } from "@/components/ui/Rich";
import { useStudy } from "@/lib/store";
import { HintBuddy } from "./HintBuddy";

export interface MicroResult {
  answers: Record<string, AnswerValue>;
  results: QuestionResult[];
  score: number;
  correct: number;
  xp: number;
  bestStreak: number;
  startedAt: number;
}

const LETTERS = "ABCDEFGH";

function xpFor(streak: number) {
  return 10 + Math.min(streak - 1, 5) * 2; // streak bonus caps at +10
}

/**
 * Bite-sized practice: one question at a time, instant feedback with the explanation,
 * a streak counter and XP — then a celebration screen. `onFinish` runs once at the end.
 */
export function MicroPlayer({
  title,
  questions,
  onExit,
  onFinish,
  finishedActions,
  note,
}: {
  title: string;
  questions: Question[];
  onExit: () => void;
  /** save the run; throw to show a retry button */
  onFinish: (r: MicroResult) => Promise<void> | void;
  /** extra buttons on the end screen */
  finishedActions?: (r: MicroResult) => React.ReactNode;
  note?: string;
}) {
  const [startedAt] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [checked, setChecked] = useState<Record<string, QuestionResult>>({});
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xp, setXp] = useState(0);
  // questions where a hint was used earn half XP
  const [hinted, setHinted] = useState<Set<string>>(new Set());
  const { prefs } = useStudy();
  const gain = (s: number, id: string) => (hinted.has(id) ? Math.ceil(xpFor(s) / 2) : xpFor(s));
  const [done, setDone] = useState<MicroResult | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedOnce = useRef(false);

  const q = questions[index];
  const result = q ? checked[q.id] : undefined;
  const answered = q ? isAnswered(q, answers[q.id]) : false;

  const save = useCallback(
    async (r: MicroResult) => {
      setSaving("saving");
      setSaveError(null);
      try {
        await onFinish(r);
        setSaving("saved");
      } catch (e) {
        setSaving("error");
        setSaveError(e instanceof Error ? e.message : "Couldn't save your result.");
      }
    },
    [onFinish]
  );

  const check = () => {
    if (!q || result || !answered) return;
    const r = gradeQuestion(q, answers[q.id]);
    setChecked((c) => ({ ...c, [q.id]: r }));
    if (r.correct) {
      const s = streak + 1;
      setStreak(s);
      setBestStreak((b) => Math.max(b, s));
      setXp((x) => x + gain(s, q.id));
    } else setStreak(0);
  };

  const next = () => {
    if (!result) return;
    if (index < questions.length - 1) return setIndex(index + 1);
    const { results, score } = gradeQuestions(questions, answers);
    const r: MicroResult = { answers, results, score, correct: results.filter((x) => x.correct).length, xp, bestStreak, startedAt };
    setDone(r);
    if (!savedOnce.current) {
      savedOnce.current = true;
      save(r);
    }
  };

  const pick = (i: number) => {
    if (!q || result) return;
    const cur = Array.isArray(answers[q.id]) ? (answers[q.id] as number[]) : [];
    const value = q.type === "mcma" ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort()) : [i];
    setAnswers((a) => ({ ...a, [q.id]: value }));
  };

  // keyboard: Enter checks/continues, 1–8 pick options
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !q) return;
      const typing = (e.target as HTMLElement).closest("input, textarea");
      if (e.key === "Enter") {
        e.preventDefault();
        if (result) next();
        else check();
        return;
      }
      if (typing || result || q.type === "blank") return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) pick(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });


  if (questions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-soft">This set has no questions yet.</p>
        <Button className="mt-4" variant="outline" onClick={onExit}>
          Back
        </Button>
      </div>
    );
  }

  if (done) {
    const cheer = done.score >= 85 ? "Amazing!" : done.score >= 60 ? "Nice work!" : "Keep going!";
    return (
      <div className="card pop-in mx-auto flex max-w-xl flex-col items-center px-6 py-8 text-center">
        <Bear pose="sign" label={cheer} className="float w-36" />
        <h2 className="mt-2 text-2xl font-extrabold text-ink">Set complete</h2>
        <p className="text-sm text-ink-soft">{title}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-6">
          <Ring value={done.score} size={112} thickness={11} tone="teal" label="Score">
            <span className="text-2xl font-extrabold text-ink">{done.score}%</span>
          </Ring>
          <dl className="grid grid-cols-3 gap-2 text-left">
            {[
              ["Correct", `${done.correct}/${questions.length}`],
              ["XP", `+${done.xp}`],
              ["Best streak", `${done.bestStreak} 🔥`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-panel-2 px-3 py-2">
                <dt className="text-[0.6875rem] font-semibold text-ink-faint">{k}</dt>
                <dd className="text-base font-extrabold tabular-nums text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className={cx("mt-4 min-h-5 text-xs font-semibold", saving === "error" ? "text-danger" : "text-ink-faint")} role="status">
          {saving === "saving" ? "Saving your result…" : saving === "saved" ? (note ?? "Result saved.") : saving === "error" ? saveError : ""}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {saving === "error" && (
            <Button icon="refresh" onClick={() => save(done)}>
              Try saving again
            </Button>
          )}
          {finishedActions?.(done)}
          <Button variant="outline" onClick={onExit}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  const correctText =
    q.type === "blank"
      ? q.accepted.filter((a, i, arr) => arr.findIndex((b) => normalizeBlank(b) === normalizeBlank(a)) === i).join(" or ")
      : q.correct.map((i) => `${LETTERS[i]}. ${q.options[i]}`).join("  ·  ");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      {/* top bar */}
      <div className="mb-4 flex items-center gap-3">
        <IconButton icon="x" label="Leave practice" onClick={onExit} />
        <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index + (result ? 1 : 0)} aria-label="Progress">
          {questions.map((x, i) => {
            const r = checked[x.id];
            return (
              <span
                key={x.id}
                className={cx(
                  "h-2.5 flex-1 rounded-full transition-colors",
                  r ? (r.correct ? "bg-teal" : "bg-rose") : i === index ? "bg-lav/60" : "bg-track"
                )}
              />
            );
          })}
        </div>
        <span className={cx("flex min-w-14 items-center justify-end gap-1 text-sm font-extrabold tabular-nums", streak >= 2 ? "text-pink-strong" : "text-ink-faint")} title="Streak">
          🔥 {streak}
        </span>
        <span className="hidden min-w-16 text-right text-sm font-extrabold tabular-nums text-lav sm:block" title="XP this run">
          {xp} XP
        </span>
      </div>

      {/* question */}
      <section key={q.id} className="card pop-in relative z-20 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-lav-soft px-2.5 py-1 text-[0.6875rem] font-extrabold text-lav">{typeLabel[q.type]}</span>
          <span className="text-xs font-bold text-ink-faint">
            Question {index + 1} of {questions.length}
          </span>
          {q.type === "mcma" && <span className="rounded-lg bg-pink-soft px-2.5 py-1 text-[0.6875rem] font-bold text-pink-strong">Select all that apply</span>}
          {prefs.hints && (
            <div className="ml-auto">
              <HintBuddy key={q.id} question={q} topic={title} disabled={!!result} onUse={() => setHinted((h) => new Set(h).add(q.id))} />
            </div>
          )}
        </div>
        <h2 className="mt-4 text-lg font-bold leading-relaxed text-ink sm:text-xl">
          <Rich text={q.prompt} />
        </h2>

        <div className="mt-6">
          {q.type === "blank" ? (
            <input
              autoFocus
              className={cx(
                inputClass,
                "max-w-md text-base",
                result && (result.correct ? "border-teal bg-teal-soft/60" : "border-danger/60 bg-danger/5")
              )}
              value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
              onChange={(e) => !result && setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              readOnly={!!result}
              placeholder="Type your answer…"
              aria-label="Your answer"
            />
          ) : (
            <div role={q.type === "mcma" ? "group" : "radiogroup"} aria-label="Options" className="grid gap-2.5 sm:grid-cols-2">
              {q.options.map((opt, i) => {
                const picked = Array.isArray(answers[q.id]) && (answers[q.id] as number[]).includes(i);
                const isRight = q.correct.includes(i);
                const state = !result ? (picked ? "picked" : "idle") : isRight ? "right" : picked ? "wrong" : "dim";
                return (
                  <button
                    key={i}
                    type="button"
                    role={q.type === "mcma" ? "checkbox" : "radio"}
                    aria-checked={picked}
                    disabled={!!result}
                    onClick={() => pick(i)}
                    className={cx(
                      "flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[0.9375rem] transition-all",
                      state === "idle" && "border-line bg-panel hover:-translate-y-0.5 hover:border-lav/60",
                      state === "picked" && "border-lav bg-lav-soft/70 shadow-[0_3px_0_0_var(--c-lav)]",
                      state === "right" && "border-teal bg-teal-soft/70",
                      state === "wrong" && "border-danger/60 bg-danger/5",
                      state === "dim" && "border-line bg-panel opacity-60"
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-extrabold",
                        state === "picked" ? "border-lav bg-lav text-white" : state === "right" ? "border-teal bg-teal text-white" : state === "wrong" ? "border-danger bg-danger text-white" : "border-line-strong text-ink-faint"
                      )}
                    >
                      {state === "right" ? <Icon name="check" size={14} strokeWidth={3} /> : state === "wrong" ? <Icon name="x" size={14} strokeWidth={3} /> : LETTERS[i]}
                    </span>
                    <Rich text={opt} className="min-w-0 flex-1 text-ink" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* check / feedback bar */}
      <div
        className={cx(
          "sticky bottom-20 z-10 mt-4 rounded-2xl border-2 p-4 transition-colors lg:bottom-4",
          !result ? "border-line bg-panel" : result.correct ? "border-teal/50 bg-teal-soft" : "border-danger/40 bg-danger/10"
        )}
        role="status"
        aria-live="polite"
      >
        {!result ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-faint">{q.type === "blank" ? "Press Enter to check" : `Tip: press 1–${q.options.length} to pick, Enter to check`}</p>
            <Button onClick={check} disabled={!answered} className="min-w-32">
              Check
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className={cx("flex items-center gap-2 text-base font-extrabold", result.correct ? "text-teal" : "text-danger")}>
                <Icon name={result.correct ? "check" : "x"} size={18} strokeWidth={3} />
                {result.correct
                  ? `${streak >= 3 ? `${streak} in a row!` : "Nice!"} +${gain(streak, q.id)} XP${hinted.has(q.id) ? " (hint used)" : ""}`
                  : "Not quite"}
              </p>
              {!result.correct && (
                <p className="mt-1 text-sm text-ink">
                  <span className="font-bold">Answer: </span>
                  <Rich text={correctText} />
                </p>
              )}
              {q.explanation && (
                <p className="mt-1 text-sm text-ink-soft">
                  <Rich text={q.explanation} />
                </p>
              )}
            </div>
            <Button onClick={next} className="min-w-32" autoFocus>
              {index < questions.length - 1 ? "Continue" : "Finish"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
