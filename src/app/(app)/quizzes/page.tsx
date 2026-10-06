"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStudy } from "@/lib/store";
import { attemptsOf, bestAttempt } from "@/lib/derive";
import { quizTypesLabel } from "@/lib/grading";
import type { Quiz } from "@/lib/types";
import { Bunny } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { Confirm, EmptyState, Menu, buttonClass, cx } from "@/components/ui/primitives";
import { PageHeader } from "@/components/shell/Shell";

export default function QuizzesPage() {
  const s = useStudy();
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [deleting, setDeleting] = useState<Quiz | null>(null);

  const withQuizzes = s.modules.filter((m) => s.quizzes.some((q) => q.moduleId === m.id));
  const quizzes = s.quizzes
    .filter((q) => filter === "all" || q.moduleId === filter)
    .sort((a, b) => {
      const ma = s.modules.findIndex((m) => m.id === a.moduleId);
      const mb = s.modules.findIndex((m) => m.id === b.moduleId);
      return ma - mb || a.createdAt - b.createdAt;
    });

  return (
    <div>
      <PageHeader
        title="Quizzes"
        subtitle="Select a quiz to test your understanding."
        actions={
          <div className="mr-1 hidden gap-2 sm:flex">
            <Link href="/quizzes/new?import=1" className={buttonClass("outline", "sm")}>
              <Icon name="upload" size={14} /> Import CSV
            </Link>
            <Link href="/quizzes/new" className={buttonClass("pink", "sm")}>
              <Icon name="plus" size={14} /> New Quiz
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter by module" className="no-scrollbar -mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
          {[{ id: "all", title: "All" }, ...withQuizzes].map((m) => (
            <button
              key={m.id}
              role="tab"
              type="button"
              aria-selected={filter === m.id}
              onClick={() => setFilter(m.id)}
              className={cx(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                filter === m.id ? "bg-pink-soft text-pink-strong ring-1 ring-pink/60" : "text-ink-soft hover:bg-panel"
              )}
            >
              {m.title}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex h-9 items-center rounded-xl border border-line-strong bg-panel px-3 text-xs font-bold text-ink">
            <span className="sr-only">Module</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-transparent focus:outline-none">
              <option value="all">All Modules</option>
              {s.modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <Link href="/quizzes/new?import=1" className={cx(buttonClass("outline", "sm"), "sm:hidden")}>
            <Icon name="upload" size={14} /> CSV
          </Link>
          <Link href="/quizzes/new" className={cx(buttonClass("pink", "sm"), "sm:hidden")}>
            <Icon name="plus" size={14} /> New
          </Link>
        </div>
      </div>

      {s.quizzes.length === 0 ? (
        <EmptyState
          art={<Bunny className="h-28 w-24" />}
          title="No quizzes yet"
          body={s.modules.length ? "Build a quiz with multiple choice, multi-answer and fill-in-the-blank questions." : "Create a module first, then add quizzes to it."}
          action={
            <Link href={s.modules.length ? "/quizzes/new" : "/modules"} className={buttonClass()}>
              {s.modules.length ? "Create a quiz" : "Go to Modules"}
            </Link>
          }
        />
      ) : quizzes.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-soft">This module has no quizzes yet.</p>
      ) : (
        <ul className="card divide-y divide-line px-2">
          {quizzes.map((q) => {
            const mod = s.modules.find((m) => m.id === q.moduleId);
            const best = bestAttempt(s, q.id);
            const last = attemptsOf(s, q.id)[0];
            const inProgress = !!s.active[q.id];
            return (
              <li key={q.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 py-4 sm:flex-nowrap">
                <span className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-lav/50 bg-lav-soft text-lav">
                  <Icon name="quiz" size={20} />
                </span>
                <div className="min-w-0 flex-1 max-sm:w-[calc(100%-3.5rem)] max-sm:flex-none">
                  <Link href={`/quizzes/${q.id}`} className="block truncate text-[0.9375rem] font-extrabold text-ink hover:underline">
                    {q.title}
                  </Link>
                  <p className="truncate text-xs font-semibold text-ink-soft">{mod?.title}</p>
                  <p className="truncate text-xs text-ink-faint">
                    {q.questions.length} Questions · {quizTypesLabel(q)}
                  </p>
                </div>
                <div className="w-24 shrink-0 text-center max-sm:ml-14 max-sm:w-auto max-sm:flex-1 max-sm:text-left">
                  {best ? (
                    <>
                      <p className="text-[0.6875rem] font-semibold text-ink-faint">Best Score</p>
                      <p className="text-sm font-extrabold tabular-nums text-ink">{best.score}%</p>
                    </>
                  ) : (
                    <p className="text-xs font-semibold text-ink-faint">Not Attempted</p>
                  )}
                </div>
                <Link
                  href={`/quizzes/${q.id}`}
                  aria-disabled={q.questions.length === 0}
                  className={cx(buttonClass(inProgress ? "outline" : "pink", "sm"), "w-28", q.questions.length === 0 && "pointer-events-none opacity-50")}
                >
                  {inProgress ? "Resume" : best ? "Retake Quiz" : "Start Quiz"}
                </Link>
                <Menu
                  label={`Options for ${q.title}`}
                  items={[
                    { label: "Edit quiz", icon: "pencil", onSelect: () => router.push(`/quizzes/${q.id}/edit`) },
                    { label: "Latest result", icon: "progress", disabled: !last, onSelect: () => last && router.push(`/quizzes/${q.id}/results/${last.id}`) },
                    { label: "Delete quiz", icon: "trash", danger: true, onSelect: () => setDeleting(q) },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete quiz?"
        body={`“${deleting?.title}” and all of its attempts will be removed.`}
        onConfirm={() => deleting && s.deleteQuiz(deleting.id)}
      />
    </div>
  );
}
