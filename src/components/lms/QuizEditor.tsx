"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStudy } from "@/lib/store";
import { lessonsOf } from "@/lib/derive";
import { uid } from "@/lib/seed";
import type { Question, Quiz } from "@/lib/types";
import { Button, Field, inputClass } from "@/components/ui/primitives";
import { QuestionsEditor, blankQuestion, problemsWith, tidy } from "./QuestionsEditor";

export function QuizEditor({ initial, defaultModuleId, openImport = false }: { initial?: Quiz; defaultModuleId?: string; openImport?: boolean }) {
  const s = useStudy();
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [moduleId, setModuleId] = useState(initial?.moduleId ?? defaultModuleId ?? s.modules[0]?.id ?? "");
  const [lessonId, setLessonId] = useState<string>(initial?.lessonId ?? "");
  const [timeLimit, setTimeLimit] = useState(initial?.timeLimitMin ?? 20);
  const [questions, setQuestions] = useState<Question[]>(initial?.questions ?? [blankQuestion("mcq")]);
  const [showErrors, setShowErrors] = useState(false);
  const [createdAt] = useState(() => initial?.createdAt ?? Date.now());

  const lessons = moduleId ? lessonsOf(s, moduleId) : [];
  const issues = questions.map(problemsWith);
  const headerIssue = !title.trim() ? "Give the quiz a title." : !moduleId ? "Choose a module." : questions.length === 0 ? "Add at least one question." : null;

  const save = () => {
    if (headerIssue || issues.some(Boolean)) {
      setShowErrors(true);
      const first = issues.findIndex(Boolean);
      if (first >= 0) document.getElementById(`qe-${questions[first].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const quiz: Quiz = {
      id: initial?.id ?? uid("quiz"),
      createdAt,
      title: title.trim(),
      moduleId,
      lessonId: lessonId || null,
      timeLimitMin: Math.max(0, Math.round(timeLimit)),
      questions: questions.map(tidy),
    };
    s.saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  if (s.modules.length === 0) {
    return <p className="card p-6 text-sm text-ink-soft">Create a module first — every quiz belongs to a module.</p>;
  }

  return (
    <div className="space-y-5 pb-10">
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Quiz title">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lesson 3 Quiz" />
        </Field>
        <Field label="Module">
          <select
            className={inputClass}
            value={moduleId}
            onChange={(e) => {
              setModuleId(e.target.value);
              setLessonId("");
            }}
          >
            {s.modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Linked lesson (optional)" hint="Shown as “Take the quiz” at the end of that lesson.">
          <select className={inputClass} value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
            <option value="">None</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Time limit (minutes)" hint="0 means no time limit.">
          <input className={inputClass} type="number" min={0} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} />
        </Field>
        {showErrors && headerIssue && <p className="text-sm font-semibold text-danger sm:col-span-2">{headerIssue}</p>}
      </section>


      <QuestionsEditor
        questions={questions}
        setQuestions={setQuestions}
        showErrors={showErrors}
        openImport={openImport}
        onImported={(fileName) => {
          setShowErrors(false);
          if (!title.trim() && fileName) setTitle(fileName.replace(/.csv$/i, "").replace(/[-_]+/g, " ").trim());
        }}
      />


      <div className="sticky bottom-20 z-20 flex justify-end gap-2 lg:bottom-4">
        <div className="card flex gap-2 p-2">
          <Button variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button icon="check" onClick={save}>
            {initial ? "Save quiz" : "Create quiz"}
          </Button>
        </div>
      </div>
    </div>
  );
}
