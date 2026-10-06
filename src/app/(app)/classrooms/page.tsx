"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api, type ClassroomSummary, type Me, type Role } from "@/lib/classroom/api";
import { deviceCode, forgetIdentity, renameIdentity } from "@/lib/classroom/identity";
import { initials, timeAgo, tintFor } from "@/lib/classroom/format";
import { useRemote } from "@/lib/classroom/useRemote";
import { Bear, Bunny } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { Button, Field, Modal, cx, inputClass } from "@/components/ui/primitives";
import { PageHeader } from "@/components/shell/Shell";
import { ClassroomGate } from "@/components/classroom/Gate";

export default function ClassroomsPage() {
  return (
    <div>
      <PageHeader title="Classrooms" subtitle="Teach a class or learn with one — question sets arrive in a class feed." />
      <ClassroomGate>{(me) => <Home me={me} />}</ClassroomGate>
    </div>
  );
}

function Home({ me }: { me: Me }) {
  const load = useCallback(() => api.myClassrooms(me), [me]);
  const { data, error, loading, refresh } = useRemote(load, 15_000);
  const [door, setDoor] = useState<Role>("student");
  const [dialog, setDialog] = useState<"create" | "join" | "device" | "rename" | null>(null);

  const teaching = (data ?? []).filter((c) => c.role === "teacher");
  const learning = (data ?? []).filter((c) => c.role === "student");
  const list = door === "teacher" ? teaching : learning;

  return (
    <div className="space-y-5">
      {/* the two doors */}
      <div role="tablist" aria-label="Classroom role" className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["student", "Learn", "Join a class with the code from your teacher, then answer the sets they post.", "Join a class", learning.length],
            ["teacher", "Teach", "Create a class, share its code, post question sets and follow everyone's grades.", "Create a class", teaching.length],
          ] as [Role, string, string, string, number][]
        ).map(([role, title, body, cta, count]) => {
          const active = door === role;
          return (
            <div
              key={role}
              role="tab"
              tabIndex={0}
              aria-selected={active}
              onClick={() => setDoor(role)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setDoor(role)}
              className={cx(
                "card relative flex cursor-pointer items-center gap-4 overflow-hidden p-5 transition-all",
                active ? "ring-2 ring-pink-strong/70" : "opacity-85 hover:opacity-100"
              )}
            >
              {role === "student" ? <Bunny className="h-24 w-20 shrink-0" /> : <Bear pose="read" className="h-24 w-24 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-lg font-extrabold text-ink">
                  {title}
                  {count > 0 && <span className="rounded-full bg-pink-soft px-2 py-0.5 text-[0.6875rem] text-pink-strong">{count}</span>}
                </p>
                <p className="mt-0.5 text-sm text-ink-soft">{body}</p>
                <Button
                  size="sm"
                  className="mt-3"
                  icon={role === "student" ? "users" : "plus"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDoor(role);
                    setDialog(role === "student" ? "join" : "create");
                  }}
                >
                  {cta}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* chat-list of classes */}
      <section className="card p-2 sm:p-3">
        <div className="flex items-center justify-between px-3 pb-2 pt-2">
          <h2 className="text-[0.9375rem] font-extrabold text-ink">{door === "teacher" ? "Classes you teach" : "Classes you've joined"}</h2>
          <button type="button" onClick={refresh} className="flex items-center gap-1 text-xs font-bold text-ink-faint hover:text-ink" aria-label="Refresh">
            <Icon name="refresh" size={13} /> Refresh
          </button>
        </div>
        {error && !data ? (
          <p className="m-2 rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error.message}</p>
        ) : loading && !data ? (
          <div className="space-y-2 p-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-panel-2" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-ink-soft">{door === "teacher" ? "You don't teach any classes yet." : "You haven't joined a class yet."}</p>
            <Button className="mt-3" size="sm" icon={door === "teacher" ? "plus" : "users"} onClick={() => setDialog(door === "teacher" ? "create" : "join")}>
              {door === "teacher" ? "Create your first class" : "Join with a code"}
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((c) => (
              <ClassRow key={c.id} c={c} />
            ))}
          </ul>
        )}
      </section>

      {/* identity */}
      <section className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-ink-soft">
        <span>
          In classrooms you appear as <b className="text-ink">{me.name}</b>
        </span>
        <button type="button" className="font-bold text-pink-strong hover:underline" onClick={() => setDialog("rename")}>
          Change name
        </button>
        <button type="button" className="font-bold text-pink-strong hover:underline" onClick={() => setDialog("device")}>
          Use on another device
        </button>
      </section>

      {dialog === "create" && <CreateDialog me={me} onClose={() => setDialog(null)} />}
      {dialog === "join" && <JoinDialog me={me} onClose={() => setDialog(null)} />}
      {dialog === "device" && <DeviceDialog me={me} onClose={() => setDialog(null)} />}
      {dialog === "rename" && <RenameDialog me={me} onClose={() => setDialog(null)} onDone={refresh} />}
    </div>
  );
}

function ClassRow({ c }: { c: ClassroomSummary }) {
  const tint = tintFor(c.id);
  const sub =
    c.role === "teacher"
      ? `${c.member_count} student${c.member_count === 1 ? "" : "s"} · ${c.set_count} set${c.set_count === 1 ? "" : "s"}`
      : `${c.teacher_name} · ${c.done_count}/${c.set_count} sets done`;
  const todo = c.role === "student" ? c.set_count - c.done_count : 0;
  return (
    <li>
      <Link href={`/classrooms/${c.id}`} className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-panel-2">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold" style={{ background: tint.bg, color: tint.fg }}>
          {initials(c.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[0.9375rem] font-extrabold text-ink">{c.name}</span>
            {c.role === "teacher" && c.code && <span className="shrink-0 rounded-md bg-lav-soft px-1.5 py-0.5 font-mono text-[0.625rem] font-bold text-lav">{c.code}</span>}
          </span>
          <span className="block truncate text-xs text-ink-soft">{c.last_post ?? sub}</span>
          {c.last_post && <span className="block truncate text-[0.6875rem] text-ink-faint">{sub}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[0.6875rem] text-ink-faint">{timeAgo(c.last_post_at ?? c.created_at)}</span>
          {todo > 0 && (
            <span className="min-w-5 rounded-full bg-pink-strong px-1.5 text-center text-[0.6875rem] font-extrabold text-white" title={`${todo} set${todo === 1 ? "" : "s"} to do`}>
              {todo}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

function useAction<T>(fn: () => Promise<T>, onDone: (r: T) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onDone(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function CreateDialog({ me, onClose }: { me: Me; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { busy, error, run } = useAction(
    () => api.create(me, name.trim(), description.trim()),
    (id) => router.push(`/classrooms/${id}`)
  );
  return (
    <Modal open onClose={onClose} title="Create a class">
      <form onSubmit={run} className="space-y-4">
        <Field label="Class name">
          <input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder="e.g. Physics 101 · Section B" />
        </Field>
        <Field label="About (optional)">
          <textarea className={cx(inputClass, "min-h-20 resize-y")} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="What will this class practise?" />
        </Field>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create class"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function JoinDialog({ me, onClose }: { me: Me; onClose: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState(me.name);
  const { busy, error, run } = useAction(
    () => api.join(me, code, name.trim()),
    (id) => router.push(`/classrooms/${id}`)
  );
  return (
    <Modal open onClose={onClose} title="Join a class">
      <form onSubmit={run} className="space-y-4">
        <Field label="Class code" hint="6 letters and numbers, from your teacher.">
          <input
            autoFocus
            className={cx(inputClass, "text-center font-mono text-2xl font-extrabold uppercase tracking-[0.35em]")}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            required
            placeholder="ABC123"
            inputMode="text"
            autoCapitalize="characters"
          />
        </Field>
        <Field label="Your name in this class">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </Field>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || code.length !== 6 || !name.trim()}>
            {busy ? "Joining…" : "Join class"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RenameDialog({ me, onClose, onDone }: { me: Me; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(me.name);
  const { busy, error, run } = useAction(
    () => renameIdentity(me, name),
    () => {
      onDone();
      onClose();
    }
  );
  return (
    <Modal open onClose={onClose} title="Change your name">
      <form onSubmit={run} className="space-y-4">
        <Field label="Name" hint="Updates your name in every class you've joined.">
          <input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </Field>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeviceDialog({ me, onClose }: { me: Me; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const code = deviceCode(me);
  return (
    <Modal open onClose={onClose} title="Use on another device">
      <p className="text-sm text-ink-soft">
        On your other phone or computer, open <b className="text-ink">Classrooms → Already set up on another device?</b> and paste this code. Keep it private — anyone with it can act as you.
      </p>
      <div className="mt-3 flex gap-2">
        <input readOnly value={code} className={cx(inputClass, "font-mono text-xs")} onFocus={(e) => e.target.select()} aria-label="Device code" />
        <Button
          icon={copied ? "check" : "copy"}
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <button
        type="button"
        onClick={() => {
          if (window.confirm("Sign this device out of Classrooms? You can come back with your device code.")) {
            forgetIdentity();
            onClose();
          }
        }}
        className="mt-5 flex items-center gap-1.5 text-xs font-bold text-danger hover:underline"
      >
        <Icon name="logout" size={13} /> Sign this device out
      </button>
    </Modal>
  );
}
