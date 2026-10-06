"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { api } from "@/lib/classroom/api";
import { useClassroom } from "@/components/classroom/context";
import { useStudy } from "@/lib/store";
import { MicroPlayer } from "@/components/learn/MicroPlayer";
import { Button } from "@/components/ui/primitives";

export default function PlaySetPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = use(params);
  const { me, classId, data, refresh } = useClassroom();
  const { noteClassResults } = useStudy();
  const router = useRouter();
  const [run, setRun] = useState(0);
  // freeze the questions for this run so a background refresh can't change them mid-way
  const live = data.sets.find((s) => s.id === setId);
  const [set] = useState(live);
  const teacher = data.role === "teacher";

  if (!set) return <p className="card p-6 text-sm text-ink-soft">This question set isn&apos;t available.</p>;

  return (
    <div>
      {teacher && <p className="mb-3 rounded-xl bg-lav-soft/70 px-4 py-2 text-xs font-semibold text-ink-soft">Preview — this is what students see. Your answers aren&apos;t recorded.</p>}
      <MicroPlayer
        key={run}
        title={set.title}
        questions={set.questions}
        onExit={() => router.push(`/classrooms/${classId}`)}
        note={teacher ? "Preview finished — nothing was recorded." : "Saved — your teacher can see this result."}
        onFinish={async (r) => {
          if (teacher) return;
          await api.submitAttempt(me, set.id, r.answers, r.results, r.score, r.startedAt);
          // personal Revision notebook: keep this set's wrong answers on this device
          noteClassResults(
            { classId, className: data.classroom.name, setId: set.id, setTitle: set.title },
            set.questions.map((q) => ({ question: q, answer: r.answers[q.id], correct: !!r.results.find((x) => x.questionId === q.id)?.correct }))
          );
          refresh();
        }}
        finishedActions={() => (
          <Button variant="soft" icon="refresh" onClick={() => setRun((n) => n + 1)}>
            Practice again
          </Button>
        )}
      />
    </div>
  );
}
