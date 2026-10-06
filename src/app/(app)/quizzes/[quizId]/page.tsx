"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useStudy } from "@/lib/store";
import { attemptsOf, bestAttempt, formatShortDate, quizTotalMarks } from "@/lib/derive";
import { isAnswered, quizTypesLabel, typeLabel } from "@/lib/grading";
import type { ActiveAttempt, AnswerValue, Question, Quiz } from "@/lib/types";
import { Bunny, Bear } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { Button, Modal, buttonClass, cx, inputClass } from "@/components/ui/primitives";
import { Rich } from "@/components/ui/Rich";
import { PageHeader } from "@/components/shell/Shell";
import { NotFound } from "@/components/lms/NotFound";
import { HintBuddy } from "@/components/learn/HintBuddy";

export default function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const s = useStudy();
  const quiz = s.quizzes.find((q) => q.id === quizId);
  const { touchRecent } = s;

  useEffect(() => {
    if (quiz) touchRecent("quiz", quiz.id);
  }, [quiz, touchRecent]);

  if (!quiz) return <NotFound what="quiz" back={{ href: "/quizzes", label: "Back to Quizzes" }} />;
  const active = s.active[quiz.id];
  return active ? <Runner key={active.startedAt} quiz={quiz} active={active} /> : <Intro quiz={quiz} />;
}

function fullTitle(quiz: Quiz, moduleTitle?: string) {
  return moduleTitle ? `${quiz.title} - ${moduleTitle}` : quiz.title;
}

function Intro({ quiz }: { quiz: Quiz }) {
  const s = useStudy();
  const mod = s.modules.find((m) => m.id === quiz.moduleId);
  const best = bestAttempt(s, quiz.id);
  const history = attemptsOf(s, quiz.id);
  const facts = [
    { k: "Questions", v: String(quiz.questions.length) },
    { k: "Total marks", v: String(quizTotalMarks(quiz)) },
    { k: "Time limit", v: quiz.timeLimitMin ? `${quiz.timeLimitMin} min` : "None" },
    { k: "Best score", v: best ? `${best.score}%` : "—" },
  ];
  return (
    <div>
      <PageHeader back={{ href: "/quizzes", label: "Back to Quizzes" }} title={fullTitle(quiz, mod?.title)} />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="card relative overflow-hidden p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{quizTypesLabel(quiz)}</p>
          <h2 className="mt-1 text-xl font-extrabold text-ink">Ready when you are</h2>
          <p className="mt-1 max-w-md text-sm text-ink-soft">
            Your answers are saved as you go, so it&apos;s fine to refresh or come back later.
            {quiz.timeLimitMin > 0 && " The quiz submits itself when the timer runs out."}
          </p>
          <dl className="mt-5 grid max-w-md grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.k} className="rounded-xl bg-panel-2 px-3 py-2.5">
                <dt className="text-[0.6875rem] font-semibold text-ink-faint">{f.k}</dt>
                <dd className="text-base font-extrabold tabular-nums text-ink">{f.v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex gap-2">
            <Button icon="play" disabled={quiz.questions.length === 0} onClick={() => s.startAttempt(quiz.id)}>
              {history.length ? "Retake quiz" : "Start quiz"}
            </Button>
            <Link href={`/quizzes/${quiz.id}/practice`} className={cx(buttonClass("soft"), quiz.questions.length === 0 && "pointer-events-none opacity-50")} title="One question at a time with instant feedback">
              <Icon name="sparkle" size={15} /> Practice mode
            </Link>
            <Link href={`/quizzes/${quiz.id}/edit`} className={buttonClass("outline")}>
              <Icon name="pencil" size={15} /> Edit
            </Link>
          </div>
          <Bunny className="float pointer-events-none absolute -bottom-3 right-4 hidden w-28 sm:block" />
        </section>
        <section className="card p-5">
          <h2 className="mb-2 text-[0.9375rem] font-extrabold text-ink">Past attempts</h2>
          {history.length === 0 ? (
            <p className="text-sm text-ink-soft">No attempts yet — good luck!</p>
          ) : (
            <ul className="divide-y divide-line">
              {history.map((a) => (
                <li key={a.id}>
                  <Link href={`/quizzes/${quiz.id}/results/${a.id}`} className="flex items-center justify-between py-2.5 text-sm hover:underline">
                    <span className="text-ink-soft">{formatShortDate(a.finishedAt)}</span>
                    <span className="font-extrabold tabular-nums text-ink">{a.score}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function useRemaining(active: ActiveAttempt, limitMin: number) {
  const calc = useCallback(() => {
    const elapsed = Math.floor((Date.now() - active.startedAt) / 1000);
    return limitMin > 0 ? limitMin * 60 - elapsed : elapsed;
  }, [active.startedAt, limitMin]);
  const [value, setValue] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setValue(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);
  return value;
}

function clock(sec: number) {
  const v = Math.max(0, sec);
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  const s = v % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function Runner({ quiz, active }: { quiz: Quiz; active: ActiveAttempt }) {
  const s = useStudy();
  const router = useRouter();
  const mod = s.modules.find((m) => m.id === quiz.moduleId);
  const [confirming, setConfirming] = useState(false);
  const submitted = useRef(false);
  const timed = quiz.timeLimitMin > 0;
  const remaining = useRemaining(active, quiz.timeLimitMin);

  const current = Math.min(active.current, quiz.questions.length - 1);
  const q = quiz.questions[current];
  const answeredCount = quiz.questions.filter((x) => isAnswered(x, active.answers[x.id])).length;

  const setAnswer = (value: AnswerValue) => s.updateActive(quiz.id, { answers: { ...active.answers, [q.id]: value } });
  const goTo = (i: number) => s.updateActive(quiz.id, { current: Math.max(0, Math.min(quiz.questions.length - 1, i)) });

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    const id = s.submitAttempt(quiz.id);
    if (id) router.replace(`/quizzes/${quiz.id}/results/${id}`);
  }, [s, quiz.id, router]);

  useEffect(() => {
    if (timed && remaining <= 0) submit();
  }, [timed, remaining, submit]);

  const lowTime = timed && remaining <= 60;

  return (
    <div>
      <PageHeader
        back={{ href: "/quizzes", label: "Back to Quizzes" }}
        title={fullTitle(quiz, mod?.title)}
        actions={
          <div className="mr-1 hidden items-center gap-2 sm:flex">
            <span
              className={cx("flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold tabular-nums", lowTime ? "bg-danger/15 text-danger" : "bg-pink-soft text-pink-strong")}
              aria-label={timed ? "Time remaining" : "Time elapsed"}
              title={timed ? "Time remaining" : "Time elapsed"}
            >
              <Icon name="clock" size={16} />
              {clock(remaining)}
            </span>
            <Button size="sm" className="h-9" onClick={() => setConfirming(true)}>
              Submit Quiz
            </Button>
          </div>
        }
      />
      {/* compact timer bar for phones */}
      <div className="mb-3 flex items-center justify-between gap-2 sm:hidden">
        <span className={cx("flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold tabular-nums", lowTime ? "bg-danger/15 text-danger" : "bg-pink-soft text-pink-strong")}>
          <Icon name="clock" size={16} />
          {clock(remaining)}
        </span>
        <Button size="sm" onClick={() => setConfirming(true)}>
          Submit Quiz
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[16.25rem_1fr]">
        <aside className="card p-5">
          <p className="text-sm font-extrabold text-ink">
            Question {current + 1} / {quiz.questions.length}
          </p>
          <div className="mt-4 grid grid-cols-5 gap-2.5">
            {quiz.questions.map((x, i) => {
              const answered = isAnswered(x, active.answers[x.id]);
              const isCur = i === current;
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Question ${i + 1}${answered ? ", answered" : ""}${isCur ? ", current" : ""}`}
                  aria-current={isCur ? "step" : undefined}
                  className={cx(
                    "flex aspect-square items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isCur ? "bg-pink-strong text-white shadow-md" : answered ? "bg-lav text-white" : "border border-line-strong bg-panel text-ink-soft hover:border-lav"
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <ul className="mt-6 space-y-2 text-xs font-semibold text-ink-soft">
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full bg-lav" /> Answered · {answeredCount}
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full bg-pink-strong" /> Current
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border border-line-strong bg-panel" /> Not answered · {quiz.questions.length - answeredCount}
            </li>
          </ul>
        </aside>

        <section className="card relative flex min-h-[26.25rem] flex-col p-5 sm:p-6">
          <div className="flex gap-2">
            <span className="rounded-lg bg-lav-soft px-2.5 py-1 text-[0.6875rem] font-extrabold text-lav">{typeLabel[q.type]}</span>
            <span className="rounded-lg bg-panel-2 px-2.5 py-1 text-[0.6875rem] font-bold text-ink-soft">
              {q.marks} mark{q.marks === 1 ? "" : "s"}
            </span>
            {q.type === "mcma" && <span className="rounded-lg bg-pink-soft px-2.5 py-1 text-[0.6875rem] font-bold text-pink-strong">Select all that apply</span>}
            {s.prefs.hints && (
              <div className="ml-auto">
                <HintBuddy key={q.id} question={q} topic={fullTitle(quiz, mod?.title)} />
              </div>
            )}
          </div>
          <h2 className="mt-4 text-base font-bold leading-relaxed text-ink sm:text-[1.0625rem]">
            <Rich text={q.prompt} />
          </h2>
          <div className="mt-5 flex-1">
            <AnswerInput key={q.id} q={q} value={active.answers[q.id]} onChange={setAnswer} />
          </div>
          <Bear pose="wave" className="pointer-events-none absolute bottom-16 right-5 hidden w-24 opacity-95 md:block" />
          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => goTo(current - 1)} disabled={current === 0}>
              Previous
            </Button>
            {current < quiz.questions.length - 1 ? (
              <Button onClick={() => goTo(current + 1)} className="min-w-28">
                Next
              </Button>
            ) : (
              <Button onClick={() => setConfirming(true)} className="min-w-28">
                Finish
              </Button>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Submit quiz?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep going
            </Button>
            <Button onClick={submit}>Submit</Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          You&apos;ve answered <b className="text-ink">{answeredCount}</b> of {quiz.questions.length} questions.
          {answeredCount < quiz.questions.length && " Unanswered questions will be marked incorrect."}
        </p>
        <button type="button" onClick={() => { s.discardActive(quiz.id); setConfirming(false); }} className="mt-4 text-xs font-bold text-danger hover:underline">
          Discard this attempt instead
        </button>
      </Modal>
    </div>
  );
}

function AnswerInput({ q, value, onChange }: { q: Question; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void }) {
  if (q.type === "blank") {
    return (
      <label className="block max-w-sm">
        <span className="mb-1.5 block text-xs font-bold text-ink-soft">Your answer</span>
        <input autoFocus className={inputClass} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder="Type your answer…" />
      </label>
    );
  }
  const selected = Array.isArray(value) ? value : [];
  const multi = q.type === "mcma";
  const toggle = (i: number) => {
    if (!multi) return onChange([i]);
    onChange(selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i].sort());
  };
  return (
    <div role={multi ? "group" : "radiogroup"} aria-label="Options" className="space-y-2.5 md:pr-28">
      {q.options.map((opt, i) => {
        const on = selected.includes(i);
        return (
          <button
            key={i}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={on}
            onClick={() => toggle(i)}
            className={cx(
              "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors",
              on ? "border-pink bg-pink-soft/70 text-ink" : "border-line bg-panel hover:border-line-strong hover:bg-panel-2"
            )}
          >
            <span
              className={cx(
                "flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors",
                multi ? "rounded-md" : "rounded-full",
                on ? "border-pink-strong bg-pink-strong text-white" : "border-line-strong bg-panel"
              )}
            >
              {on && (multi ? <Icon name="check" size={12} strokeWidth={3.2} /> : <span className="h-2 w-2 rounded-full bg-white" />)}
            </span>
            <span className="w-4 shrink-0 text-xs font-extrabold text-ink-faint">{String.fromCharCode(65 + i)}</span>
            <Rich text={opt} className="min-w-0 flex-1" />
          </button>
        );
      })}
    </div>
  );
}
