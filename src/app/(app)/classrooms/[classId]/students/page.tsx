"use client";

import { useState } from "react";
import { api, type Member } from "@/lib/classroom/api";
import { initials, timeAgo, tintFor } from "@/lib/classroom/format";
import { Icon } from "@/components/ui/Icon";
import { Button, Confirm, ProgressBar } from "@/components/ui/primitives";
import { useClassroom } from "@/components/classroom/context";

export default function StudentsPage() {
  const { me, classId, data, refresh } = useClassroom();
  const [removing, setRemoving] = useState<Member | null>(null);
  const [copied, setCopied] = useState<"code" | "invite" | null>(null);

  if (data.role !== "teacher") return <p className="card p-6 text-sm text-ink-soft">Only the teacher can manage students.</p>;

  const posted = data.sets.filter((s) => s.published);
  const code = data.classroom.code ?? "";
  const invite = `Join my class "${data.classroom.name}" on Inori Study: open Classrooms → Join a class, and enter code ${code}`;
  const copy = async (what: "code" | "invite") => {
    await navigator.clipboard.writeText(what === "code" ? code : invite);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="grid gap-5 pb-8 lg:grid-cols-[1fr_20rem]">
      <section className="card overflow-hidden p-0">
        <h2 className="px-5 pb-2 pt-4 text-[0.9375rem] font-extrabold text-ink">
          Students <span className="font-semibold text-ink-faint">· {data.members.length}</span>
        </h2>
        {data.members.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-ink-soft">Nobody has joined yet. Share the class code — students join from Classrooms → Learn.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.members.map((m) => {
              const mine = data.attempts.filter((a) => a.person_id === m.person_id);
              const done = new Set(mine.filter((a) => posted.some((s) => s.id === a.set_id)).map((a) => a.set_id)).size;
              const firsts = posted.map((s) => mine.find((a) => a.set_id === s.id)?.score).filter((x): x is number => x !== undefined);
              const average = firsts.length ? Math.round(firsts.reduce((a, b) => a + b, 0) / firsts.length) : null;
              const tint = tintFor(m.person_id);
              const last = mine[mine.length - 1];
              return (
                <li key={m.person_id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold" style={{ background: tint.bg, color: tint.fg }}>
                    {initials(m.display_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-ink">{m.display_name}</p>
                    <p className="text-[0.6875rem] text-ink-faint">
                      Joined {timeAgo(m.joined_at)} ago{last ? ` · active ${timeAgo(last.finished_at)} ago` : ""}
                    </p>
                  </div>
                  <div className="w-40">
                    <div className="flex justify-between text-[0.6875rem] font-semibold text-ink-soft">
                      <span>
                        {done}/{posted.length} sets
                      </span>
                      <span>{average === null ? "—" : `avg ${average}%`}</span>
                    </div>
                    <ProgressBar value={posted.length ? (done / posted.length) * 100 : 0} className="mt-1" label={`${m.display_name} sets done`} />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setRemoving(m)} aria-label={`Remove ${m.display_name}`}>
                    <Icon name="x" size={14} />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="card h-fit p-5">
        <h2 className="text-[0.9375rem] font-extrabold text-ink">Invite students</h2>
        <p className="mt-1 text-xs text-ink-soft">Students open Classrooms → Learn → Join a class, and type this code.</p>
        <button
          type="button"
          onClick={() => copy("code")}
          className="mt-4 w-full rounded-2xl border-2 border-dashed border-lav/50 bg-lav-soft/40 py-4 text-center font-mono text-3xl font-extrabold tracking-[0.3em] text-ink hover:border-lav"
          title="Copy code"
        >
          {code}
        </button>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" icon={copied === "code" ? "check" : "copy"} onClick={() => copy("code")} className="flex-1">
            {copied === "code" ? "Copied" : "Copy code"}
          </Button>
          <Button size="sm" icon={copied === "invite" ? "check" : "send"} onClick={() => copy("invite")} className="flex-1">
            {copied === "invite" ? "Copied" : "Copy invite"}
          </Button>
        </div>
        {!data.classroom.join_open && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">Joining is closed — reopen it in Settings.</p>}
      </aside>

      <Confirm
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.display_name}?`}
        body="They'll leave the class and their answers will be deleted from your grades. They can rejoin with the code if joining is open."
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing) return;
          await api.removeMember(me, classId, removing.person_id);
          refresh();
        }}
      />
    </div>
  );
}
