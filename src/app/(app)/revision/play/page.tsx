"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useStudy } from "@/lib/store";
import { MASTERY_STREAK, buildSession, inScope, parseScope, type Scope } from "@/lib/revision";
import type { StudyState } from "@/lib/types";
import { MicroPlayer } from "@/components/learn/MicroPlayer";
import { Button, EmptyState, buttonClass } from "@/components/ui/primitives";
import { Bear } from "@/components/art/Illustrations";
import { PageHeader } from "@/components/shell/Shell";

export default function RevisionPlayPage() {
  return (
    <Suspense>
      <Play />
    </Suspense>
  );
}

function scopeLabel(s: StudyState, scope: Scope) {
  const quizMistake = (pred: (src: Extract<StudyState["mistakes"][number]["source"], { kind: "quiz" }>) => boolean) =>
    s.mistakes.find((m) => m.source.kind === "quiz" && pred(m.source));
  switch (scope.kind) {
    case "all":
      return "Everything";
    case "module":
      return s.modules.find((m) => m.id === scope.id)?.title ?? "Module";
    case "lesson": {
      const lesson = s.lessons.find((l) => l.id === scope.lessonId);
      const mod = s.modules.find((m) => m.id === scope.moduleId);
      return lesson ? `${mod?.title ?? ""} · ${lesson.title}` : `${mod?.title ?? "Module"} · module-wide quizzes`;
    }
    case "quiz": {
      const src = quizMistake((x) => x.quizId === scope.id)?.source;
      return src && src.kind === "quiz" ? src.quizTitle : "Quiz";
    }
    case "class":
    case "set": {
      const m = s.mistakes.find((x) => x.source.kind === "class" && (scope.kind === "class" ? x.source.classId === scope.id : x.source.setId === scope.id));
      if (!m || m.source.kind !== "class") return "Classroom";
      return scope.kind === "class" ? m.source.className : `${m.source.className} · ${m.source.setTitle}`;
    }
  }
}

function Play() {
  const s = useStudy();
  const router = useRouter();
  const scope = parseScope(useSearchParams().get("scope"));
  const [round, setRound] = useState(0);
  const [mastered, setMastered] = useState<number | null>(null);
  // build the session once per round; a new round reshuffles and picks fresh variations
  const [session, setSession] = useState(() => buildSession(s.mistakes.filter((m) => inScope(m, scope)), Date.now()));
  const label = scopeLabel(s, scope);

  const again = () => {
    setSession(buildSession(s.mistakes.filter((m) => inScope(m, scope)), Date.now()));
    setMastered(null);
    setRound((r) => r + 1);
  };

  return (
    <div>
      <PageHeader back={{ href: "/revision", label: "Back to Revision" }} title={`Revision · ${label}`} subtitle={`Get each question right in ${MASTERY_STREAK} sessions in a row to master it.`} />
      {session.questions.length === 0 ? (
        <EmptyState
          art={<Bear pose="sign" label="All clear!" className="w-32" />}
          title="Nothing left to revise here"
          body="Every mistake in this topic is mastered. Lovely work!"
          action={
            <Link href="/revision" className={buttonClass()}>
              Back to Revision
            </Link>
          }
        />
      ) : (
        <MicroPlayer
          key={round}
          title={`Revision · ${label}`}
          questions={session.questions}
          onExit={() => router.push("/revision")}
          note={
            mastered === null
              ? "Progress saved to your notebook."
              : mastered > 0
                ? `Progress saved — ${mastered} question${mastered === 1 ? "" : "s"} mastered! 🎉`
                : "Progress saved — keep going, mastery takes two sessions in a row."
          }
          onFinish={(r) => {
            const before = new Set(s.mistakes.filter((m) => m.masteredAt).map((m) => m.id));
            s.applyRevisionResults(session, r.results, r.answers);
            // which of this session's mistakes just became mastered (the store update is synchronous)
            const ok = new Map<string, boolean>();
            for (const res of r.results) {
              const mid = session.owner[res.questionId];
              if (mid) ok.set(mid, (ok.get(mid) ?? true) && res.correct);
            }
            setMastered(
              session.mistakeIds.filter((id) => {
                const m = s.mistakes.find((x) => x.id === id);
                return !before.has(id) && ok.get(id) && m && m.streak + 1 >= MASTERY_STREAK;
              }).length
            );
          }}
          finishedActions={() => (
            <>
              <Button variant="soft" icon="refresh" onClick={again}>
                Another round
              </Button>
              <Link href="/revision" className={buttonClass("pink")}>
                My notebook
              </Link>
            </>
          )}
        />
      )}
    </div>
  );
}
