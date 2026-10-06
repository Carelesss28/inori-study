"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SetEditor } from "@/components/classroom/SetEditor";

function Editor() {
  return <SetEditor openImport={useSearchParams().has("import")} />;
}

export default function NewSetPage() {
  return (
    <div>
      <h2 className="mb-1 text-lg font-extrabold text-ink">New question set</h2>
      <p className="mb-4 text-sm text-ink-soft">Write questions or import a CSV, then post it to the class feed — or keep it as a draft.</p>
      <Suspense>
        <Editor />
      </Suspense>
    </div>
  );
}
