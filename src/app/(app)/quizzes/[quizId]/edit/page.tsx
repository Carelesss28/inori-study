"use client";

import { use } from "react";
import { useStudy } from "@/lib/store";
import { PageHeader } from "@/components/shell/Shell";
import { QuizEditor } from "@/components/lms/QuizEditor";
import { NotFound } from "@/components/lms/NotFound";

export default function EditQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const { quizzes } = useStudy();
  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz) return <NotFound what="quiz" back={{ href: "/quizzes", label: "Back to Quizzes" }} />;
  return (
    <div>
      <PageHeader back={{ href: `/quizzes/${quiz.id}`, label: `Back to ${quiz.title}` }} title="Edit Quiz" subtitle="Saving resets any attempt that's in progress. Past results are kept." />
      <QuizEditor key={quiz.id} initial={quiz} />
    </div>
  );
}
