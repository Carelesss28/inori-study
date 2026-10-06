"use client";

import { useState, type ReactNode } from "react";
import { classroomsConfigured, type Me } from "@/lib/classroom/api";
import { createIdentity, restoreFromCode, useMe } from "@/lib/classroom/identity";
import { Bunny } from "@/components/art/Illustrations";
import { Button, Field, inputClass } from "@/components/ui/primitives";
import { useStudy } from "@/lib/store";

/** Classroom pages need a configured backend and a name for this device. */
export function ClassroomGate({ children }: { children: (me: Me) => ReactNode }) {
  const me = useMe();
  if (!classroomsConfigured) {
    return (
      <div className="card p-6 text-sm text-ink-soft">
        <p className="font-extrabold text-ink">Classrooms aren&apos;t configured</p>
        <p className="mt-1">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code> (see <code>.env.example</code>), then
          restart the dev server.
        </p>
      </div>
    );
  }
  if (me === undefined) return <div className="card h-40 animate-pulse" />;
  if (me === null) return <Welcome />;
  return <>{children(me)}</>;
}

function Welcome() {
  const { profile } = useStudy();
  // only prefill a name the person typed themselves — classmates should see a real name
  const [name, setName] = useState(profile.customized ? profile.name : "");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"new" | "restore">("new");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "new") await createIdentity(name);
      else await restoreFromCode(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card relative mx-auto max-w-lg overflow-hidden p-6 sm:p-8">
      <Bunny className="float pointer-events-none absolute -right-2 -top-2 w-24 opacity-90" />
      <h2 className="text-xl font-extrabold text-ink">Welcome to Classrooms</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">Teachers post question sets to a class feed; students answer them bite by bite. No account needed — just your name.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "new" ? (
          <Field label="Your name" hint="Your teacher and classmates will see this.">
            <input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="e.g. Alex Tan" />
          </Field>
        ) : (
          <Field label="Device code" hint="Find it on your other device: Classrooms → “Use on another device”.">
            <input autoFocus className={`${inputClass} font-mono`} value={code} onChange={(e) => setCode(e.target.value)} required placeholder="INORI-…" />
          </Field>
        )}
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy || (mode === "new" ? !name.trim() : !code.trim())}>
            {busy ? "One moment…" : mode === "new" ? "Continue" : "Restore"}
          </Button>
          <button type="button" onClick={() => setMode(mode === "new" ? "restore" : "new")} className="text-xs font-bold text-pink-strong hover:underline">
            {mode === "new" ? "Already set up on another device?" : "I'm new here"}
          </button>
        </div>
      </form>
    </div>
  );
}
