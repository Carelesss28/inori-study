"use client";

import { use } from "react";
import { useClassroom } from "@/components/classroom/context";
import { SetEditor } from "@/components/classroom/SetEditor";

export default function EditSetPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = use(params);
  const { data } = useClassroom();
  const set = data.sets.find((s) => s.id === setId);
  if (!set) return <p className="card p-6 text-sm text-ink-soft">This question set no longer exists.</p>;
  return (
    <div>
      <h2 className="mb-4 text-lg font-extrabold text-ink">Edit “{set.title}”</h2>
      {/* keyed by id only: background refreshes must not wipe unsaved edits */}
      <SetEditor key={set.id} initial={set} />
    </div>
  );
}
