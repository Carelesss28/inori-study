"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useStudy } from "@/lib/store";
import { bestAttempt, lessonPercent, lessonsOf, modulePercent, pageCount, quizzesOf } from "@/lib/derive";
import type { Lesson } from "@/lib/types";
import { BlossomBranch, Bear, LessonThumb } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { Button, Confirm, EmptyState, Menu, ProgressBar, buttonClass } from "@/components/ui/primitives";
import { PageHeader } from "@/components/shell/Shell";
import { LessonFormModal } from "@/components/lms/LessonForm";
import { ModuleFormModal } from "@/components/lms/ModuleForm";
import { NotFound } from "@/components/lms/NotFound";

export default function ModuleDetailPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = use(params);
  const s = useStudy();
  const [editing, setEditing] = useState<Lesson | "new" | null>(null);
  const [deleting, setDeleting] = useState<Lesson | null>(null);
  const [editingModule, setEditingModule] = useState(false);

  const mod = s.modules.find((m) => m.id === moduleId);
  if (!mod) return <NotFound what="module" back={{ href: "/modules", label: "Back to Modules" }} />;

  const lessons = lessonsOf(s, mod.id);
  const quizzes = quizzesOf(s, mod.id);
  const pct = modulePercent(s, mod.id);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -top-6 right-24 hidden md:block" aria-hidden="true">
        <BlossomBranch className="absolute -right-24 -top-2 w-64 opacity-80" />
        <Bear pose="read" className="float relative mt-6 w-28" />
      </div>
      <PageHeader back={{ href: "/modules", label: "Back to Modules" }} title={mod.title} subtitle={mod.description || undefined} />

      <div className="relative mb-6 flex max-w-xl items-center gap-3">
        <ProgressBar value={pct} tone="rose" className="h-2.5" label={`${mod.title} progress`} />
        <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums text-ink-soft">{pct}%</span>
      </div>

      <div className="relative mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[0.9375rem] font-extrabold text-ink">
          Lessons <span className="font-semibold text-ink-faint">· {lessons.length}</span>
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon="pencil" onClick={() => setEditingModule(true)}>
            Edit module
          </Button>
          <Button size="sm" icon="plus" onClick={() => setEditing("new")}>
            Add lesson
          </Button>
        </div>
      </div>

      {lessons.length === 0 ? (
        <EmptyState
          art={<Bear pose="wave" className="h-28 w-24" />}
          title="No lessons yet"
          body="Upload a PDF or write notes to create the first lesson in this module."
          action={
            <Button icon="plus" onClick={() => setEditing("new")}>
              Add lesson
            </Button>
          }
        />
      ) : (
        <ol className="space-y-3">
          {lessons.map((lesson, i) => {
            const prog = s.lessonProgress[lesson.id];
            const lp = lessonPercent(lesson, prog);
            const isPdf = lesson.source.kind === "pdf";
            const href = `/modules/${mod.id}/lessons/${lesson.id}`;
            return (
              <li key={lesson.id} className="card flex items-center gap-4 p-3 sm:p-4">
                <Link href={href} tabIndex={-1} aria-hidden="true" className="hidden shrink-0 sm:block">
                  <LessonThumb seed={i} className="h-20 w-16 rounded-lg" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-soft text-xs font-extrabold text-pink-strong">{i + 1}</span>
                    <Link href={href} className="truncate text-[0.9375rem] font-extrabold text-ink hover:underline">
                      {lesson.title}
                    </Link>
                    {prog?.completed && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 text-[0.6875rem] font-bold text-teal">
                        <Icon name="check" size={11} strokeWidth={3} /> Done
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-ink-soft">
                    {isPdf ? "PDF" : "Notes"} · {pageCount(lesson)} page{pageCount(lesson) === 1 ? "" : "s"}
                    {lp > 0 && lp < 100 && ` · ${lp}% read`}
                  </p>
                  {lesson.summary && <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{lesson.summary}</p>}
                </div>
                <Link href={href} className={buttonClass("pink", "sm")}>
                  {isPdf ? "Open PDF" : "Open"}
                </Link>
                <Menu
                  label={`Options for ${lesson.title}`}
                  items={[
                    { label: "Edit lesson", icon: "pencil", onSelect: () => setEditing(lesson) },
                    {
                      label: prog?.completed ? "Mark as not done" : "Mark as done",
                      icon: "check",
                      onSelect: () => s.setLessonComplete(lesson.id, !prog?.completed),
                    },
                    { label: "Move up", icon: "arrowUp", disabled: i === 0, onSelect: () => s.moveLesson(lesson.id, -1) },
                    { label: "Move down", icon: "arrowDown", disabled: i === lessons.length - 1, onSelect: () => s.moveLesson(lesson.id, 1) },
                    { label: "Delete lesson", icon: "trash", danger: true, onSelect: () => setDeleting(lesson) },
                  ]}
                />
              </li>
            );
          })}
        </ol>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[0.9375rem] font-extrabold text-ink">
            Quizzes <span className="font-semibold text-ink-faint">· {quizzes.length}</span>
          </h2>
          <div className="flex gap-2">
          <Link href={`/quizzes/new?module=${mod.id}&import=1`} className={buttonClass("outline", "sm")}>
            <Icon name="upload" size={14} /> Import CSV
          </Link>
          <Link href={`/quizzes/new?module=${mod.id}`} className={buttonClass("outline", "sm")}>
            <Icon name="plus" size={14} /> New quiz
          </Link>
          </div>
        </div>
        {quizzes.length === 0 ? (
          <p className="card p-5 text-sm text-ink-soft">No quizzes for this module yet — create one to test yourself.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {quizzes.map((q) => {
              const best = bestAttempt(s, q.id);
              return (
                <Link key={q.id} href={`/quizzes/${q.id}`} className="card flex items-center gap-3 p-4 hover:border-line-strong">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lav-soft text-lav">
                    <Icon name="quiz" size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-ink">{q.title}</span>
                    <span className="block text-xs text-ink-soft">
                      {q.questions.length} questions · {best ? `best ${best.score}%` : "not attempted"}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={16} className="text-ink-faint" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {editing && (
        <LessonFormModal key={editing === "new" ? "new" : editing.id} open onClose={() => setEditing(null)} moduleId={mod.id} lesson={editing === "new" ? undefined : editing} />
      )}
      {editingModule && <ModuleFormModal key={mod.id} open module={mod} onClose={() => setEditingModule(false)} />}
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete lesson?"
        body={`“${deleting?.title}” and its reading progress will be removed. Quizzes linked to it will be kept.`}
        onConfirm={() => deleting && s.deleteLesson(deleting.id)}
      />
    </div>
  );
}
