"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/classroom/api";
import { Button, Confirm, Field, Toggle, cx, inputClass } from "@/components/ui/primitives";
import { useClassroom } from "@/components/classroom/context";

export default function SettingsPage() {
  const { me, classId, data, refresh } = useClassroom();
  const router = useRouter();
  const c = data.classroom;
  const [name, setName] = useState(c.name);
  const [description, setDescription] = useState(c.description);
  const [joinOpen, setJoinOpen] = useState(c.join_open);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<"code" | "delete" | null>(null);

  if (data.role !== "teacher") return <p className="card p-6 text-sm text-ink-soft">Only the teacher can change settings.</p>;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      refresh();
      setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
    }
  };

  return (
    <div className="max-w-2xl space-y-5 pb-8">
      <section className="card space-y-4 p-5">
        <h2 className="text-[0.9375rem] font-extrabold text-ink">Class details</h2>
        <Field label="Class name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <Field label="About">
          <textarea className={cx(inputClass, "min-h-20 resize-y")} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        </Field>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-panel-2/60 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-ink">Open for joining</p>
            <p className="text-xs text-ink-soft">Turn off to stop new students joining with the code. Current students stay.</p>
          </div>
          <Toggle checked={joinOpen} onChange={setJoinOpen} label="Open for joining" />
        </div>
        <div className="flex justify-end">
          <Button icon="check" disabled={!name.trim()} onClick={() => run(() => api.update(me, classId, name.trim(), description.trim(), joinOpen), "Saved.")}>
            Save changes
          </Button>
        </div>
        {msg && <p className={cx("text-sm font-semibold", msg.ok ? "text-teal" : "text-danger")}>{msg.text}</p>}
      </section>

      <section className="card divide-y divide-line p-0">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-ink">
              Class code <span className="ml-1 font-mono tracking-widest">{c.code}</span>
            </p>
            <p className="text-xs text-ink-soft">Make a new code if the old one was shared too widely. Current students stay.</p>
          </div>
          <Button variant="outline" size="sm" icon="refresh" onClick={() => setConfirm("code")}>
            New code
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-ink">Delete class</p>
            <p className="text-xs text-ink-soft">Removes the feed, every question set, all students and all grades.</p>
          </div>
          <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirm("delete")}>
            Delete
          </Button>
        </div>
      </section>

      <Confirm
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "code" ? "Make a new class code?" : `Delete “${c.name}”?`}
        body={confirm === "code" ? "The old code stops working immediately." : "This can't be undone. Everything in this class will be deleted for everyone."}
        confirmLabel={confirm === "code" ? "New code" : "Delete class"}
        onConfirm={async () => {
          if (confirm === "code") await run(() => api.regenerateCode(me, classId), "New code ready.");
          else {
            await api.remove(me, classId);
            router.push("/classrooms");
          }
        }}
      />
    </div>
  );
}
