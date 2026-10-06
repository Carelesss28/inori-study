"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useRef, useState } from "react";
import { useStudy } from "@/lib/store";
import { MicroPlayer } from "@/components/learn/MicroPlayer";
import { Button, buttonClass } from "@/components/ui/primitives";
import { PageHeader } from "@/components/shell/Shell";
import { NotFound } from "@/components/lms/NotFound";

/** Self-study, Brilliant-style: one question at a time with instant feedback. */
export default function PracticePage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const s = useStudy();
  const router = useRouter();
  const [run, setRun] = useState(0);
  const lastAttempt = useRef<string | null>(null);
  const quiz = s.quizzes.find((q) => q.id === quizId);
  if (!quiz) return <NotFound what="quiz" back={{ href: "/quizzes", label: "Back to Quizzes" }} />;
  const mod = s.modules.find((m) => m.id === quiz.moduleId);

  return (
    <div>
      <PageHeader back={{ href: `/quizzes/${quiz.id}`, label: `Back to ${quiz.title}` }} title={`Practice · ${quiz.title}`} subtitle={mod?.title} />
      <MicroPlayer
        key={run}
        title={quiz.title}
        questions={quiz.questions}
        onExit={() => router.push(`/quizzes/${quiz.id}`)}
        note="Saved to your quiz history."
        onFinish={(r) => {
          lastAttempt.current = s.recordAttempt(quiz.id, r.answers, r.startedAt);
        }}
        finishedActions={() => (
          <>
            <Button variant="soft" icon="refresh" onClick={() => setRun((n) => n + 1)}>
              Practice again
            </Button>
            {lastAttempt.current && (
              <Link href={`/quizzes/${quiz.id}/results/${lastAttempt.current}`} className={buttonClass("pink")}>
                Review answers
              </Link>
            )}
          </>
        )}
      />
    </div>
  );
}
