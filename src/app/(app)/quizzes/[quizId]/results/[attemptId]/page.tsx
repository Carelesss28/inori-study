"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useStudy } from "@/lib/store";
import { formatDuration, formatShortDate } from "@/lib/derive";
import { normalizeBlank, typeLabel } from "@/lib/grading";
import type { AnswerValue, Question, QuestionType } from "@/lib/types";
import { Bear } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar, Ring, Toggle, buttonClass, cx } from "@/components/ui/primitives";
import { Rich } from "@/components/ui/Rich";
import { PageHeader } from "@/components/shell/Shell";
import { NotFound } from "@/components/lms/NotFound";

type Filter = "all" | "correct" | "incorrect";

export default function ResultsPage({ params }: { params: Promise<{ quizId: string; attemptId: string }> }) {
  const { quizId, attemptId } = use(params);
  const s = useStudy();
  const [filter, setFilter] = useState<Filter>("all");
  const [explain, setExplain] = useState(true);

  const quiz = s.quizzes.find((q) => q.id === quizId);
  const attempt = s.attempts.find((a) => a.id === attemptId && a.quizId === quizId);
  if (!quiz || !attempt) return <NotFound what="result" back={{ href: "/quizzes", label: "Back to Quizzes" }} />;

  const mod = s.modules.find((m) => m.id === quiz.moduleId);
  const resultFor = new Map(attempt.results.map((r) => [r.questionId, r]));
  // questions may have been edited since; review only the ones this attempt graded
  const reviewed = quiz.questions.filter((q) => resultFor.has(q.id));
  const correctCount = attempt.results.filter((r) => r.correct).length;
  const seconds = Math.round((attempt.finishedAt - attempt.startedAt) / 1000);

  const byType = (["mcq", "mcma", "blank"] as QuestionType[])
    .map((t) => {
      const qs = reviewed.filter((q) => q.type === t);
      const ok = qs.filter((q) => resultFor.get(q.id)?.correct).length;
      return { t, total: qs.length, ok, pct: qs.length ? Math.round((ok / qs.length) * 100) : 0 };
    })
    .filter((x) => x.total > 0);

  const shown = reviewed.filter((q) => {
    const ok = resultFor.get(q.id)?.correct;
    return filter === "all" || (filter === "correct" ? ok : !ok);
  });

  const cheer = attempt.score >= 85 ? "Well Done!" : attempt.score >= 60 ? "Nice Try!" : "Keep Going!";

  return (
    <div>
      <PageHeader
        back={{ href: `/quizzes/${quiz.id}`, label: `Back to ${quiz.title}` }}
        title="Quiz Results"
        subtitle={`${quiz.title}${mod ? ` · ${mod.title}` : ""} · ${formatShortDate(attempt.finishedAt)}`}
      />

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="card flex flex-wrap items-center gap-5 p-5 sm:flex-nowrap">
          <Bear pose="sign" label={cheer} className="float w-32 shrink-0" />
          <Ring value={attempt.score} size={128} thickness={12} tone="teal" label="Score">
            <span className="text-sm font-extrabold text-ink">Score</span>
          </Ring>
          <div>
            <p className="text-xs font-semibold text-ink-faint">Your Score</p>
            <p className="text-4xl font-extrabold tabular-nums text-ink">{attempt.score}%</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              {correctCount} / {attempt.results.length} correct
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">Time taken: {formatDuration(seconds)}</p>
            <div className="mt-3 flex gap-2">
              <Link href={`/quizzes/${quiz.id}`} className={buttonClass("pink", "sm")}>
                <Icon name="refresh" size={14} /> Retake
              </Link>
              {correctCount < attempt.results.length && (
                <Link href={`/revision/play?scope=quiz:${quiz.id}`} className={buttonClass("soft", "sm")}>
                  <Icon name="target" size={14} /> Revise my mistakes
                </Link>
              )}
              <Link href="/quizzes" className={buttonClass("outline", "sm")}>
                All quizzes
              </Link>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-[0.9375rem] font-extrabold text-ink">Performance by Type</h2>
          <ul className="space-y-4">
            {byType.map((b) => (
              <li key={b.t} className="grid grid-cols-[3.25rem_1fr_40px] items-center gap-3">
                <span className="text-xs font-extrabold text-ink-soft">{typeLabel[b.t]}</span>
                <ProgressBar value={b.pct} tone="teal" className="h-2.5" label={`${typeLabel[b.t]} (${b.ok}/${b.total} correct)`} />
                <span className="text-right text-xs font-bold tabular-nums text-ink">{b.pct}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-faint">Share of questions answered fully correctly, per question type.</p>
        </section>
      </div>

      <section className="card mt-5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[0.9375rem] font-extrabold text-ink">Review Answers</h2>
          <label className="flex items-center gap-2 text-xs font-bold text-pink-strong">
            Show explanation
            <Toggle checked={explain} onChange={setExplain} label="Show explanation" />
          </label>
        </div>
        <div role="tablist" aria-label="Filter answers" className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["all", `All (${reviewed.length})`],
              ["correct", `Correct (${correctCount})`],
              ["incorrect", `Incorrect (${reviewed.length - correctCount})`],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cx("rounded-lg px-3 py-1.5 text-xs font-bold", filter === f ? "bg-pink-soft text-pink-strong ring-1 ring-pink/60" : "bg-panel-2 text-ink-soft hover:text-ink")}
            >
              {label}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">{filter === "incorrect" ? "Nothing to review — every answer was correct! 🎉" : "No answers here."}</p>
        ) : (
          <ol className="space-y-3">
            {shown.map((q) => (
              <ReviewItem key={q.id} q={q} n={quiz.questions.indexOf(q) + 1} answer={attempt.answers[q.id]} correct={!!resultFor.get(q.id)?.correct} explain={explain} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function ReviewItem({ q, n, answer, correct, explain }: { q: Question; n: number; answer: AnswerValue | undefined; correct: boolean; explain: boolean }) {
  const picked = Array.isArray(answer) ? answer : [];
  return (
    <li className="grid gap-4 rounded-xl border border-line p-4 md:grid-cols-[1fr_240px]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-soft text-xs font-extrabold text-pink-strong">{n}</span>
          <span className="rounded-md bg-teal-soft px-2 py-0.5 text-[0.6875rem] font-extrabold text-teal">{typeLabel[q.type]}</span>
          <span className={cx("ml-auto rounded-md px-2 py-0.5 text-[0.6875rem] font-extrabold md:hidden", correct ? "bg-teal-soft text-teal" : "bg-danger/10 text-danger")}>{correct ? "Correct" : "Incorrect"}</span>
        </div>
        <p className="mt-2 text-sm font-bold text-ink">
          <Rich text={q.prompt} />
        </p>
        {q.type === "blank" ? (
          <div className="mt-3 space-y-1 text-sm">
            <p className={cx("font-semibold", correct ? "text-teal" : "text-danger")}>
              Your answer: {typeof answer === "string" && answer.trim() ? answer : <i className="text-ink-faint">no answer</i>}
            </p>
            {!correct && <p className="text-ink-soft">Accepted: {q.accepted.filter((a, i, arr) => arr.findIndex((b) => normalizeBlank(b) === normalizeBlank(a)) === i).join(", ")}</p>}
          </div>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              const isRight = q.correct.includes(i);
              const isPicked = picked.includes(i);
              return (
                <li
                  key={i}
                  className={cx(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    isRight ? "border-teal/50 bg-teal-soft/60" : isPicked ? "border-danger/40 bg-danger/5" : "border-line"
                  )}
                >
                  <span className={cx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-extrabold", isPicked ? (isRight ? "bg-teal text-white" : "bg-danger text-white") : "bg-panel-2 text-ink-faint")}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <Rich text={opt} className="min-w-0 flex-1 text-ink" />
                  {isRight && <Icon name="check" size={14} className="shrink-0 text-teal" strokeWidth={3} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="space-y-2">
        <span className={cx("hidden rounded-md px-2 py-0.5 text-[0.6875rem] font-extrabold md:inline-block", correct ? "bg-teal-soft text-teal" : "bg-danger/10 text-danger")}>
          {correct ? `Correct · ${q.marks} mark${q.marks === 1 ? "" : "s"}` : "Incorrect · 0 marks"}
        </span>
        {explain && q.explanation && (
          <div className="rounded-lg bg-panel-2 p-3">
            <p className="text-xs font-extrabold text-ink">Explanation</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              <Rich text={q.explanation} />
            </p>
          </div>
        )}
      </div>
    </li>
  );
}
