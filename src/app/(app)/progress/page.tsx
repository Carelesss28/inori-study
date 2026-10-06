"use client";

import Link from "next/link";
import { useState } from "react";
import { useStudy } from "@/lib/store";
import { formatShortDate, modulePercent, overview } from "@/lib/derive";
import { Bear, BlossomBranch } from "@/components/art/Illustrations";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Modal, ProgressBar, cx } from "@/components/ui/primitives";
import { PageHeader } from "@/components/shell/Shell";

export default function ProgressPage() {
  const s = useStudy();
  const o = overview(s);
  const [showAll, setShowAll] = useState(false);

  const stats: { label: string; icon: IconName; v: { done: number; total: number; pct: number }; tile: string; tone: "lav" | "rose" | "teal"; note: string }[] = [
    { label: "Modules", icon: "modules", v: o.modules, tile: "bg-teal-soft text-teal", tone: "lav", note: "completed · bar shows average progress" },
    { label: "Lessons", icon: "file", v: o.lessons, tile: "bg-pink-soft text-pink-strong", tone: "rose", note: "completed" },
    { label: "Quizzes", icon: "quiz", v: o.quizzes, tile: "bg-lav-soft text-lav", tone: "lav", note: "attempted" },
  ];

  const attempts = [...s.attempts].sort((a, b) => b.finishedAt - a.finishedAt);
  const quizName = (id: string) => s.quizzes.find((q) => q.id === id)?.title ?? "Deleted quiz";
  const moduleOf = (quizId: string) => s.modules.find((m) => m.id === s.quizzes.find((q) => q.id === quizId)?.moduleId)?.title ?? "";

  // quizzes never attempted still appear, like "Final Quiz — Not Attempted" in the mockup
  const untried = s.quizzes.filter((q) => !s.attempts.some((a) => a.quizId === q.id)).slice(0, 1);

  return (
    <div className="relative">
      <BlossomBranch className="pointer-events-none absolute -top-7 right-28 hidden w-56 opacity-70 md:block" />
      <PageHeader title="My Progress" subtitle="Everything you've read, practised and completed." />

      <div className="relative grid gap-4 sm:grid-cols-3">
        {stats.map((st) => (
          <section key={st.label} className="card p-5">
            <div className="flex items-center gap-3">
              <span className={cx("flex h-10 w-10 items-center justify-center rounded-xl", st.tile)}>
                <Icon name={st.icon} size={19} />
              </span>
              <div>
                <p className="text-xs font-bold text-ink-soft">{st.label}</p>
                <p className="text-xl font-extrabold tabular-nums text-ink">
                  {st.v.done} / {st.v.total}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <ProgressBar value={st.v.pct} tone={st.tone} label={st.label} />
              <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums text-ink-soft">{st.v.pct}%</span>
            </div>
            <p className="mt-1.5 text-[0.6875rem] text-ink-faint">{st.note}</p>
          </section>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="card relative overflow-hidden p-5">
          <h2 className="mb-4 text-[0.9375rem] font-extrabold text-ink">Module Progress</h2>
          {s.modules.length === 0 ? (
            <p className="text-sm text-ink-soft">No modules yet.</p>
          ) : (
            <ul className="space-y-3.5">
              {s.modules.map((m) => {
                const pct = modulePercent(s, m.id);
                return (
                  <li key={m.id}>
                    <Link href={`/modules/${m.id}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_40px] items-center gap-3 rounded-lg hover:bg-panel-2/60">
                      <span className="truncate text-[0.8125rem] font-semibold text-ink">{m.title}</span>
                      <ProgressBar value={pct} tone="rose" label={m.title} />
                      <span className="text-right text-xs font-bold tabular-nums text-ink-soft">{pct}%</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card relative overflow-hidden p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[0.9375rem] font-extrabold text-ink">Recent Quiz Scores</h2>
            {attempts.length > 4 && (
              <button type="button" onClick={() => setShowAll(true)} className="text-xs font-bold text-pink-strong hover:underline">
                View all
              </button>
            )}
          </div>
          {attempts.length === 0 && untried.length === 0 ? (
            <p className="text-sm text-ink-soft">Take a quiz and your scores will appear here.</p>
          ) : (
            <ul className="divide-y divide-line pb-20">
              {attempts.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <Link href={`/quizzes/${a.quizId}/results/${a.id}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2.5 hover:bg-panel-2/60">
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8125rem] font-semibold text-ink">{quizName(a.quizId)}</span>
                      <span className="block truncate text-[0.6875rem] text-ink-faint">{moduleOf(a.quizId)}</span>
                    </span>
                    <span className="text-sm font-extrabold tabular-nums text-ink">{a.score}%</span>
                    <span className="w-24 text-right text-xs text-ink-faint">{formatShortDate(a.finishedAt)}</span>
                  </Link>
                </li>
              ))}
              {untried.map((q) => (
                <li key={q.id}>
                  <Link href={`/quizzes/${q.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2.5 hover:bg-panel-2/60">
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8125rem] font-semibold text-ink">{q.title}</span>
                      <span className="block truncate text-[0.6875rem] text-ink-faint">{moduleOf(q.id)}</span>
                    </span>
                    <span className="text-xs font-semibold italic text-ink-faint">Not attempted</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Bear pose="sleep" className="pointer-events-none absolute -bottom-2 right-2 w-40" />
        </section>
      </div>

      <Modal open={showAll} onClose={() => setShowAll(false)} title="All quiz attempts">
        <ul className="divide-y divide-line">
          {attempts.map((a) => (
            <li key={a.id}>
              <Link href={`/quizzes/${a.quizId}/results/${a.id}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2.5 text-sm hover:underline">
                <span className="truncate font-semibold text-ink">{quizName(a.quizId)}</span>
                <span className="font-extrabold tabular-nums text-ink">{a.score}%</span>
                <span className="w-24 text-right text-xs text-ink-faint">{formatShortDate(a.finishedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
