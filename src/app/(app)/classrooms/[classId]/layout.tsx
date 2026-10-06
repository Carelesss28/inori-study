"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { use, useCallback, useState } from "react";
import { api, type Me } from "@/lib/classroom/api";
import { initials, tintFor } from "@/lib/classroom/format";
import { useRemote } from "@/lib/classroom/useRemote";
import { Icon, type IconName } from "@/components/ui/Icon";
import { BackLink, Confirm, EmptyState, buttonClass, cx } from "@/components/ui/primitives";
import { Bear } from "@/components/art/Illustrations";
import { TopActions } from "@/components/shell/Shell";
import { ClassroomGate } from "@/components/classroom/Gate";
import { ClassroomContext } from "@/components/classroom/context";

export default function ClassroomLayout({ children, params }: { children: React.ReactNode; params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  return <ClassroomGate>{(me) => <Loaded me={me} classId={classId}>{children}</Loaded>}</ClassroomGate>;
}

function Loaded({ me, classId, children }: { me: Me; classId: string; children: React.ReactNode }) {
  const load = useCallback(() => api.detail(me, classId), [me, classId]);
  const { data, error, refresh } = useRemote(load, 6_000);
  const pathname = usePathname();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (!data) {
    if (error) {
      return (
        <div className="space-y-4">
          <BackLink href="/classrooms">Back to Classrooms</BackLink>
          <EmptyState art={<Bear pose="peek" className="w-28" />} title="Can't open this class" body={error.message} action={<Link href="/classrooms" className={buttonClass()}>Back to Classrooms</Link>} />
        </div>
      );
    }
    return <div className="card h-64 animate-pulse" />;
  }

  const c = data.classroom;
  const teacher = data.role === "teacher";
  const base = `/classrooms/${classId}`;
  const tabs: { href: string; label: string; icon: IconName }[] = teacher
    ? [
        { href: base, label: "Feed", icon: "chat" },
        { href: `${base}/grades`, label: "Grades", icon: "progress" },
        { href: `${base}/students`, label: `Students · ${data.member_count}`, icon: "users" },
        { href: `${base}/settings`, label: "Settings", icon: "pencil" },
      ]
    : [];
  // play / edit screens keep the header slim
  const focused = /\/sets\//.test(pathname);
  const tint = tintFor(c.id);

  return (
    <ClassroomContext.Provider value={{ me, classId, data, refresh }}>
      <header className="relative z-10 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2">
              <BackLink href={focused ? base : "/classrooms"}>{focused ? `Back to ${c.name}` : "Back to Classrooms"}</BackLink>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold" style={{ background: tint.bg, color: tint.fg }}>
                {initials(c.name)}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{c.name}</h1>
                <p className="truncate text-xs text-ink-soft">
                  {teacher ? "You teach this class" : `Teacher: ${c.teacher_name}`} · {data.member_count} student{data.member_count === 1 ? "" : "s"}
                  {error && <span className="ml-2 text-danger">· offline, retrying…</span>}
                </p>
              </div>
            </div>
          </div>
          <TopActions>
            {teacher && c.code && (
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(c.code!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="mr-1 hidden items-center gap-2 rounded-xl border border-line bg-panel px-3 py-1.5 sm:flex"
                title="Copy the class code"
              >
                <span className="text-[0.6875rem] font-bold text-ink-faint">Class code</span>
                <span className="font-mono text-base font-extrabold tracking-widest text-ink">{c.code}</span>
                <Icon name={copied ? "check" : "copy"} size={14} className={copied ? "text-teal" : "text-ink-faint"} />
              </button>
            )}
            {!teacher && (
              <button type="button" onClick={() => setLeaving(true)} className={cx(buttonClass("ghost", "sm"), "mr-1")}>
                <Icon name="logout" size={14} /> Leave
              </button>
            )}
          </TopActions>
        </div>

        {teacher && !focused && (
          <nav aria-label="Classroom sections" className="no-scrollbar -mx-1 mt-4 flex gap-1 overflow-x-auto border-b border-line px-1">
            {tabs.map((t) => {
              const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-bold transition-colors",
                    active ? "border-pink-strong text-ink" : "border-transparent text-ink-soft hover:text-ink"
                  )}
                >
                  <Icon name={t.icon} size={15} />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {children}

      <Confirm
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Leave this class?"
        body="You'll stop seeing its feed. Your past answers stay with the teacher unless they remove you. You can rejoin with the class code."
        confirmLabel="Leave class"
        onConfirm={async () => {
          await api.leave(me, classId);
          router.push("/classrooms");
        }}
      />
    </ClassroomContext.Provider>
  );
}
