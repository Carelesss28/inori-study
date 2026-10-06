"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type QuestionSet } from "@/lib/classroom/api";
import type { Question } from "@/lib/types";
import { Button, Field, cx, inputClass } from "@/components/ui/primitives";
import { QuestionsEditor, blankQuestion, problemsWith, tidy } from "@/components/lms/QuestionsEditor";
import { useClassroom } from "./context";

export function SetEditor({ initial, openImport = false }: { initial?: QuestionSet; openImport?: boolean }) {
  const { me, classId, data, refresh } = useClassroom();
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [questions, setQuestions] = useState<Question[]>(initial?.questions?.length ? initial.questions : [blankQuestion("mcq")]);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (data.role !== "teacher") return <p className="card p-6 text-sm text-ink-soft">Only the teacher can edit question sets.</p>;

  const issues = questions.map(problemsWith);
  const headerIssue = !title.trim() ? "Give the set a title." : questions.length === 0 ? "Add at least one question." : null;
  const answered = initial ? data.attempts.some((a) => a.set_id === initial.id) : false;

  const save = async (publish: boolean) => {
    if (headerIssue || issues.some(Boolean)) {
      setShowErrors(true);
      const first = issues.findIndex(Boolean);
      if (first >= 0) document.getElementById(`qe-${questions[first].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.saveSet(me, classId, initial?.id ?? null, title.trim(), description.trim(), questions.map(tidy), publish);
      refresh();
      router.push(`/classrooms/${classId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the set.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <section className="card grid gap-4 p-5">
        <Field label="Set title" hint="Shown on the card in the class feed.">
          <input autoFocus={!initial} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Week 3 · Kinematics warm-up" />
        </Field>
        <Field label="Message to the class (optional)">
          <textarea className={cx(inputClass, "min-h-16 resize-y")} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder="e.g. Try these before Thursday's lab 🧪" />
        </Field>
        {answered && (
          <p className="rounded-lg bg-lav-soft/60 px-3 py-2 text-xs text-ink-soft">
            Students have already answered this set. Their past grades are kept as they were; editing a question changes it for future tries.
          </p>
        )}
        {showErrors && headerIssue && <p className="text-sm font-semibold text-danger">{headerIssue}</p>}
      </section>

      <QuestionsEditor
        questions={questions}
        setQuestions={setQuestions}
        showErrors={showErrors}
        openImport={openImport}
        onImported={(fileName) => {
          setShowErrors(false);
          if (!title.trim() && fileName) setTitle(fileName.replace(/\.csv$/i, "").replace(/[-_]+/g, " ").trim());
        }}
      />

      <div className="sticky bottom-20 z-20 flex justify-end lg:bottom-4">
        <div className="card flex flex-wrap items-center justify-end gap-2 p-2">
          {error && <p className="px-2 text-xs font-semibold text-danger">{error}</p>}
          <Button variant="ghost" onClick={() => router.back()} disabled={busy}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => save(false)} disabled={busy}>
            {initial?.published ? "Save & hide" : "Save as draft"}
          </Button>
          <Button icon="send" onClick={() => save(true)} disabled={busy}>
            {busy ? "Saving…" : initial?.published ? "Save changes" : "Post to class"}
          </Button>
        </div>
      </div>
    </div>
  );
}
