"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shell/Shell";
import { QuizEditor } from "@/components/lms/QuizEditor";

// This route is prerendered, so ?module= must be read on the client (inside Suspense).
function EditorForModule() {
  const params = useSearchParams();
  const moduleId = params.get("module") ?? undefined;
  return <QuizEditor key={moduleId ?? "any"} defaultModuleId={moduleId} openImport={params.has("import")} />;
}

export default function NewQuizPage() {
  return (
    <div>
      <PageHeader back={{ href: "/quizzes", label: "Back to Quizzes" }} title="New Quiz" subtitle="Mix multiple choice, multi-answer and fill-in-the-blank questions." />
      <Suspense>
        <EditorForModule />
      </Suspense>
    </div>
  );
}
