"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStudy } from "@/lib/store";
import { MASTERY_STREAK, scopeToParam, type Scope } from "@/lib/revision";
import { formatShortDate } from "@/lib/derive";
import { typeLabel } from "@/lib/grading";
import type { AnswerValue, Mistake, Question } from "@/lib/types";
import { Bear, ModuleCover } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { Confirm, EmptyState, Menu, buttonClass, cx } from "@/components/ui/primitives";
import { Rich } from "@/components/ui/Rich";
import { PageHeader } from "@/components/shell/Shell";

const LETTERS = "ABCDEFGH";

function answerLabel(q: Question, a: AnswerValue | null | undefined) {
  if (a === null || a === undefined || (Array.isArray(a) && a.length === 0) || a === "") return "no answer";
  if (q.type === "blank") return String(a);
  return (a as number[]).map((i) => `${LETTERS[i]}. ${q.options[i]}`).join("  ·  ");
}

function correctLabel(q: Question) {
  if (q.type === "blank") return q.accepted.join(" or ");
  return q.correct.map((i) => `${LETTERS[i]}. ${q.options[i]}`).join("  ·  ");
}

interface Group {
  key: string;
  title: string;
  subtitle: string;
  scope: Scope;
  cover?: React.ReactNode;
  rows: { key: string; title: string; scope: Scope; items: Mistake[] }[];
}

export default function RevisionPage() {
  const s = useStudy();
  const [tab, setTab] = useState<"todo" | "mastered">("todo");
  const [open, setOpen] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const todo = s.mistakes.filter((m) => !m.masteredAt);
  const mastered = s.mistakes.filter((m) => m.masteredAt);
  const list = tab === "todo" ? todo : mastered;

  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    // personal modules → lessons
    for (const mod of s.modules) {
      const inMod = list.filter((m) => m.source.kind === "quiz" && m.source.moduleId === mod.id);
      if (!inMod.length) continue;
      const lessonIds = Array.from(new Set(inMod.map((m) => (m.source.kind === "quiz" ? m.source.lessonId : null))));
      out.push({
        key: mod.id,
        title: mod.title,
        subtitle: "Module",
        scope: { kind: "module", id: mod.id },
        cover: <ModuleCover art={mod.cover} className="h-12 w-16 shrink-0 rounded-lg" />,
        rows: lessonIds.map((lid) => {
          const lesson = s.lessons.find((l) => l.id === lid);
          return {
            key: `${mod.id}:${lid ?? "none"}`,
            title: lesson ? `Lesson ${lesson.order} · ${lesson.title}` : "Module-wide quizzes",
            scope: { kind: "lesson", moduleId: mod.id, lessonId: lid } as Scope,
            items: inMod.filter((m) => m.source.kind === "quiz" && m.source.lessonId === lid),
          };
        }),
      });
    }
    // classrooms → sets
    const classIds = Array.from(new Set(list.flatMap((m) => (m.source.kind === "class" ? [m.source.classId] : []))));
    for (const cid of classIds) {
      const inClass = list.filter((m) => m.source.kind === "class" && m.source.classId === cid);
      const first = inClass[0].source as Extract<Mistake["source"], { kind: "class" }>;
      const setIds = Array.from(new Set(inClass.map((m) => (m.source.kind === "class" ? m.source.setId : ""))));
      out.push({
        key: cid,
        title: first.className,
        subtitle: "Classroom",
        scope: { kind: "class", id: cid },
        cover: (
          <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-lav-soft text-lav">
            <Icon name="users" size={20} />
          </span>
        ),
        rows: setIds.map((sid) => {
          const items = inClass.filter((m) => m.source.kind === "class" && m.source.setId === sid);
          const src = items[0].source as Extract<Mistake["source"], { kind: "class" }>;
          return { key: sid, title: `🧩 ${src.setTitle}`, scope: { kind: "set", id: sid } as Scope, items };
        }),
      });
    }
    // mistakes whose module was deleted but still exist (e.g. imported data)
    const orphans = list.filter((m) => m.source.kind === "quiz" && !s.modules.some((mod) => m.source.kind === "quiz" && mod.id === m.source.moduleId));
    if (orphans.length) {
      out.push({ key: "orphans", title: "Other", subtitle: "From deleted modules", scope: { kind: "all" }, rows: [{ key: "orphans", title: "Older quizzes", scope: { kind: "all" }, items: orphans }] });
    }
    return out.sort((a, b) => b.rows.reduce((n, r) => n + r.items.length, 0) - a.rows.reduce((n, r) => n + r.items.length, 0));
  }, [list, s.modules, s.lessons]);

  const topics = groups.reduce((n, g) => n + g.rows.length, 0);
  const tiles = [
    { k: "To revise", v: todo.length, sub: todo.length ? "questions you missed" : "all clear!" },
    { k: "Mastered", v: mastered.length, sub: `right in ${MASTERY_STREAK} sessions in a row` },
    { k: "Topics", v: topics, sub: tab === "todo" ? "lessons & sets with mistakes" : "with mastered questions" },
  ];

  return (
    <div className="space-y-5 pb-8">
      <PageHeader title="Revision" subtitle="Every question you got wrong, collected by module and lesson — so you can turn mistakes into mastery." />

      <section className="card relative flex flex-wrap items-center gap-5 overflow-hidden p-5">
        <div className="grid flex-1 grid-cols-3 gap-3">
          {tiles.map((t) => (
            <div key={t.k} className="rounded-xl bg-panel-2/70 p-3">
              <p className="text-xs font-bold text-ink-soft">{t.k}</p>
              <p className="text-2xl font-extrabold tabular-nums text-ink">{t.v}</p>
              <p className="truncate text-[0.6875rem] text-ink-faint">{t.sub}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <Link href="/revision/play?scope=all" aria-disabled={!todo.length} className={cx(buttonClass("pink"), !todo.length && "pointer-events-none opacity-50")}>
            <Icon name="sparkle" size={15} /> Smart revision
          </Link>
          <p className="max-w-56 text-[0.6875rem] text-ink-faint">Your most-missed questions first, each asked twice: once as it was, once as a new variation.</p>
        </div>
      </section>

      <div role="tablist" aria-label="Notebook" className="flex gap-1 border-b border-line">
        {(
          [
            ["todo", `To revise · ${todo.length}`],
            ["mastered", `Mastered · ${mastered.length}`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cx("-mb-px border-b-2 px-4 py-2.5 text-sm font-bold", tab === k ? "border-pink-strong text-ink" : "border-transparent text-ink-soft hover:text-ink")}
          >
            {label}
          </button>
        ))}
        {tab === "mastered" && mastered.length > 0 && (
          <button type="button" onClick={() => setClearing(true)} className="ml-auto self-center text-xs font-bold text-ink-faint hover:text-danger">
            Clear mastered
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          art={<Bear pose={tab === "todo" ? "sign" : "sleep"} label="All clear!" className={tab === "todo" ? "w-32" : "w-40"} />}
          title={tab === "todo" ? "Nothing to revise" : "Nothing mastered yet"}
          body={
            tab === "todo"
              ? "When you miss a question in a quiz, practice or class set, it's saved here so you can revise it."
              : "Revise your mistakes — get one right in two sessions in a row and it moves here."
          }
          action={
            tab === "todo" ? (
              <Link href="/quizzes" className={buttonClass()}>
                Take a quiz
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const count = g.rows.reduce((n, r) => n + r.items.length, 0);
            return (
              <section key={g.key} className="card overflow-hidden p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  {g.cover}
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-ink-faint">{g.subtitle}</p>
                    <h2 className="truncate text-base font-extrabold text-ink">{g.title}</h2>
                  </div>
                  <span className="rounded-full bg-pink-soft px-2.5 py-0.5 text-xs font-extrabold text-pink-strong">{count}</span>
                  {tab === "todo" && g.key !== "orphans" && (
                    <Link href={`/revision/play?scope=${scopeToParam(g.scope)}`} className={buttonClass("soft", "sm")}>
                      <Icon name="play" size={12} /> Revise all
                    </Link>
                  )}
                </div>
                <ul className="divide-y divide-line border-t border-line">
                  {g.rows.map((r) => {
                    const isOpen = open === r.key;
                    return (
                      <li key={r.key}>
                        <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                          <button type="button" onClick={() => setOpen(isOpen ? null : r.key)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            <Icon name="chevronRight" size={14} className={cx("shrink-0 text-ink-faint transition-transform", isOpen && "rotate-90")} />
                            <span className="truncate text-sm font-bold text-ink">{r.title}</span>
                            <span className="shrink-0 text-xs text-ink-faint">
                              · {r.items.length} question{r.items.length === 1 ? "" : "s"}
                            </span>
                          </button>
                          {tab === "todo" && (
                            <Link href={`/revision/play?scope=${scopeToParam(r.scope)}`} className={buttonClass("pink", "sm")}>
                              Revise
                            </Link>
                          )}
                        </div>
                        {isOpen && (
                          <ol className="space-y-2 bg-panel-2/40 px-4 pb-4 pt-1 sm:px-5">
                            {r.items
                              .slice()
                              .sort((a, b) => b.wrongCount - a.wrongCount)
                              .map((m) => (
                                <MistakeCard key={m.id} m={m} />
                              ))}
                          </ol>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Confirm
        open={clearing}
        onClose={() => setClearing(false)}
        title="Clear mastered questions?"
        body="They'll be removed from your notebook. If you miss them again later, they'll come back."
        confirmLabel="Clear"
        onConfirm={s.clearMastered}
      />
    </div>
  );
}

function MistakeCard({ m }: { m: Mistake }) {
  const { setMistakeMastered, removeMistake } = useStudy();
  const q = m.question;
  return (
    <li className="rounded-xl border border-line bg-panel p-3.5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 rounded-md bg-lav-soft px-1.5 py-0.5 text-[0.625rem] font-extrabold text-lav">{typeLabel[q.type]}</span>
        <p className="min-w-0 flex-1 text-sm font-bold text-ink">
          <Rich text={q.prompt} />
        </p>
        <Menu
          label="Options"
          className="-mr-1 -mt-1"
          items={[
            m.masteredAt
              ? { label: "Revise again", icon: "refresh", onSelect: () => setMistakeMastered(m.id, false) }
              : { label: "I've got it", icon: "check", onSelect: () => setMistakeMastered(m.id, true) },
            { label: "Remove", icon: "trash", danger: true, onSelect: () => removeMistake(m.id) },
          ]}
        />
      </div>
      <div className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
        <p className="rounded-lg bg-danger/10 px-2.5 py-1.5 text-ink">
          <span className="font-bold text-danger">Your answer: </span>
          <Rich text={answerLabel(q, m.lastAnswer)} />
        </p>
        <p className="rounded-lg bg-teal-soft px-2.5 py-1.5 text-ink">
          <span className="font-bold text-teal">Correct: </span>
          <Rich text={correctLabel(q)} />
        </p>
      </div>
      {q.explanation && (
        <p className="mt-1.5 text-xs text-ink-soft">
          <Rich text={q.explanation} />
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] text-ink-faint">
        <span>
          Missed <b className="text-ink-soft">×{m.wrongCount}</b>
        </span>
        <span className="flex items-center gap-1" title={`${m.streak} of ${MASTERY_STREAK} revision sessions right`}>
          Mastery
          {Array.from({ length: MASTERY_STREAK }, (_, i) => (
            <span key={i} className={cx("h-2 w-2 rounded-full", i < m.streak ? "bg-teal" : "bg-track")} />
          ))}
        </span>
        <span>{m.source.kind === "quiz" ? m.source.quizTitle : m.source.setTitle}</span>
        <span>last missed {formatShortDate(m.lastWrongAt)}</span>
      </div>
    </li>
  );
}
