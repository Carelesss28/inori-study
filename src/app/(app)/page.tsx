"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStudy } from "@/lib/store";
import { lessonsOf, overview } from "@/lib/derive";
import { dayKey } from "@/lib/seed";
import { HeroScene } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { Button, Field, Modal, Ring, cx, inputClass } from "@/components/ui/primitives";
import { TopActions } from "@/components/shell/Shell";

function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function greeting(h: number) {
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { profile } = useStudy();
  const now = useNow();
  const firstName = profile.name.trim().split(/\s+/)[0] || "friend";

  return (
    <div className="flex flex-1 flex-col gap-5">
      <section className="card relative overflow-hidden bg-linear-to-br from-hero-1 to-hero-2 p-0">
        <HeroScene className="absolute right-0 top-0 h-full w-auto max-w-none dark:brightness-[0.72] dark:saturate-[0.85]" />
        <div className="absolute inset-0 bg-linear-to-r from-hero-1 via-hero-1/85 via-35% to-transparent to-65%" />
        <div className="relative flex min-h-[15.5rem] flex-col p-5 sm:p-6 xl:min-h-[17rem]">
          <div className="flex items-center justify-between gap-3">
            <GlobalSearch />
            <div className="rounded-2xl bg-panel/75 p-1 pl-1.5 shadow-sm backdrop-blur">
              <TopActions />
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-8">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                {greeting(now.getHours())}, {firstName}
              </h1>
              <p className="mt-1 text-sm font-semibold text-ink-soft">Keep going, you&apos;re doing great!</p>
            </div>
            <ClockCard now={now} />
          </div>
        </div>
      </section>

      <div className="grid flex-1 gap-5 lg:grid-cols-[1.25fr_1fr]">
        <TodaysPlan />
        <ProgressOverview />
      </div>

      <RecentlyAccessed />
    </div>
  );
}

function ClockCard({ now }: { now: Date }) {
  const date = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="relative mr-1 hidden w-48 rotate-2 rounded-lg bg-[#fffaf6] px-4 pb-4 pt-5 text-center text-[#4a4060] shadow-[0_10px_24px_-12px_rgb(74_64_96/0.55)] sm:block">
      <span className="absolute left-1/2 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full bg-[#e98ea1] shadow-inner" aria-hidden="true" />
      <p className="text-xs font-semibold text-[#776d8c]">{date}</p>
      <p className="mt-0.5 text-4xl font-extrabold tabular-nums tracking-tight">{time}</p>
      <p className="mt-2 text-[0.6875rem] leading-snug text-[#776d8c]">
        Consistent effort
        <br />
        builds a brighter tomorrow.
      </p>
    </div>
  );
}

function GlobalSearch() {
  const s = useStudy();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const modName = (id: string) => s.modules.find((m) => m.id === id)?.title ?? "";
    const hits: { key: string; label: string; meta: string; href: string; kind: string }[] = [];
    s.modules.forEach((m) => {
      if (m.title.toLowerCase().includes(term)) hits.push({ key: m.id, label: m.title, meta: `${lessonsOf(s, m.id).length} lessons`, href: `/modules/${m.id}`, kind: "Module" });
    });
    s.lessons.forEach((l) => {
      if (l.title.toLowerCase().includes(term) || l.summary.toLowerCase().includes(term))
        hits.push({ key: l.id, label: l.title, meta: modName(l.moduleId), href: `/modules/${l.moduleId}/lessons/${l.id}`, kind: "Lesson" });
    });
    s.quizzes.forEach((qz) => {
      if (qz.title.toLowerCase().includes(term) || modName(qz.moduleId).toLowerCase().includes(term))
        hits.push({ key: qz.id, label: qz.title, meta: modName(qz.moduleId), href: `/quizzes/${qz.id}`, kind: "Quiz" });
    });
    return hits.slice(0, 8);
  }, [q, s]);

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <label className="flex h-10 items-center gap-2 rounded-xl border border-white/60 bg-white/70 px-3 text-ink-soft backdrop-blur focus-within:ring-2 focus-within:ring-lav/40 dark:border-line dark:bg-panel/80">
        <Icon name="search" size={16} />
        <span className="sr-only">Search</span>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search modules, lessons, or quizzes..."
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </label>
      {open && q.trim() && (
        <div className="card pop-in absolute left-0 right-0 top-12 z-30 p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-soft">Nothing found for “{q}”.</p>
          ) : (
            results.map((r) => (
              <Link key={r.key} href={r.href} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-panel-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">{r.label}</span>
                  <span className="block truncate text-xs text-ink-soft">{r.meta}</span>
                </span>
                <span className="shrink-0 rounded-md bg-lav-soft px-2 py-0.5 text-[0.6875rem] font-bold text-ink-soft">{r.kind}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PlanRow({ id }: { id: string }) {
  const { plan, togglePlanItem, deletePlanItem } = useStudy();
  const item = plan.find((p) => p.id === id);
  if (!item) return null;
  return (
    <li className="group flex items-center gap-3 py-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={`Mark "${item.title}" ${item.done ? "not done" : "done"}`}
        onClick={() => togglePlanItem(item.id)}
        className={cx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
          item.done ? "border-pink-strong bg-pink-strong text-white" : "border-line-strong bg-panel hover:border-pink"
        )}
      >
        {item.done && <Icon name="check" size={13} strokeWidth={3} />}
      </button>
      {item.href ? (
        <Link href={item.href} className={cx("min-w-0 flex-1 truncate text-sm font-semibold hover:underline", item.done ? "text-ink-faint line-through" : "text-ink")}>
          {item.title}
        </Link>
      ) : (
        <span className={cx("min-w-0 flex-1 truncate text-sm font-semibold", item.done ? "text-ink-faint line-through" : "text-ink")}>{item.title}</span>
      )}
      <span className="shrink-0 text-xs font-semibold text-ink-soft">{item.minutes} min</span>
      <button
        type="button"
        aria-label={`Remove "${item.title}"`}
        onClick={() => deletePlanItem(item.id)}
        className="shrink-0 rounded-md p-1 text-ink-faint opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100"
      >
        <Icon name="x" size={14} />
      </button>
    </li>
  );
}

function TodaysPlan() {
  const { plan, addPlanItem, planMyDay } = useStudy();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(30);
  const today = plan.filter((p) => p.date === dayKey());
  const done = today.filter((p) => p.done).length;
  const minutesLeft = today.filter((p) => !p.done).reduce((s, p) => s + p.minutes, 0);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addPlanItem(title.trim(), Math.max(5, minutes));
    setTitle("");
  };

  return (
    <section className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[0.9375rem] font-extrabold text-ink">Today&apos;s Plan</h2>
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-pink-strong hover:underline">
          View all
        </button>
      </div>
      {today.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-ink-soft">No plan for today yet.</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button size="sm" icon="sparkle" onClick={planMyDay}>
              Plan my day
            </Button>
            <Button size="sm" variant="outline" icon="plus" onClick={() => setOpen(true)}>
              Add task
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {today.slice(0, 4).map((p) => (
              <PlanRow key={p.id} id={p.id} />
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-faint">
            {done}/{today.length} done{minutesLeft > 0 ? ` · about ${minutesLeft} min to go` : " · all finished, lovely work!"}
            {today.length > 4 && ` · ${today.length - 4} more`}
          </p>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Today's Plan">
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1">
            <Field label="Task">
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Revise Laplace table" />
            </Field>
          </div>
          <div className="w-24">
            <Field label="Minutes">
              <input className={inputClass} type="number" min={5} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            </Field>
          </div>
          <Button type="submit" icon="plus">
            Add
          </Button>
        </form>
        <Button variant="soft" size="sm" icon="sparkle" className="mt-3" onClick={planMyDay}>
          Suggest from my modules
        </Button>
        <ul className="mt-3 divide-y divide-line">
          {today.map((p) => (
            <PlanRow key={p.id} id={p.id} />
          ))}
        </ul>
        {today.length === 0 && <p className="py-3 text-sm text-ink-soft">Nothing planned yet.</p>}
      </Modal>
    </section>
  );
}

function ProgressOverview() {
  const s = useStudy();
  const o = overview(s);
  const rows = [
    { label: "Modules", v: o.modules, icon: "modules" as const },
    { label: "Lessons", v: o.lessons, icon: "file" as const },
    { label: "Quizzes", v: o.quizzes, icon: "quiz" as const },
  ];
  return (
    <section className="card flex flex-col p-5">
      <h2 className="mb-3 text-[0.9375rem] font-extrabold text-ink">Progress Overview</h2>
      <div className="my-auto flex items-center justify-center gap-8 py-2">
        <Ring value={o.overall} size={150} thickness={15} label="Overall progress">
          <span className="text-3xl font-extrabold text-ink">{o.overall}%</span>
        </Ring>
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-2.5 text-sm text-ink">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-lav-soft text-lav" aria-hidden="true">
                <Icon name={r.icon} size={14} />
              </span>
              <span className="font-bold tabular-nums">
                {r.v.done} / {r.v.total}
              </span>
              <span className="text-ink-soft">{r.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link href="/progress" className="mt-3 inline-block text-xs font-bold text-pink-strong hover:underline">
        See detailed progress →
      </Link>
    </section>
  );
}

function RecentlyAccessed() {
  const s = useStudy();
  const items = s.recent
    .map((r) => {
      if (r.kind === "lesson") {
        const lesson = s.lessons.find((l) => l.id === r.id);
        if (!lesson) return null;
        const mod = s.modules.find((m) => m.id === lesson.moduleId);
        return { key: r.id, title: mod?.title ?? "", sub: `Lesson ${lesson.order}`, full: lesson.title, href: `/modules/${lesson.moduleId}/lessons/${lesson.id}`, tone: "pink" as const, tag: "PDF" };
      }
      const quiz = s.quizzes.find((q) => q.id === r.id);
      if (!quiz) return null;
      const mod = s.modules.find((m) => m.id === quiz.moduleId);
      return { key: r.id, title: mod?.title ?? "", sub: quiz.title, full: quiz.title, href: `/quizzes/${quiz.id}`, tone: "lav" as const, tag: "QZ" };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 4);

  return (
    <section className="card p-5">
      <h2 className="mb-3 text-[0.9375rem] font-extrabold text-ink">Recently Accessed</h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Open a lesson or quiz and it will show up here. <Link href="/modules" className="font-bold text-pink-strong hover:underline">Browse modules →</Link>
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((it) => (
            <Link key={it.key} href={it.href} title={it.full} className="flex items-center gap-3 rounded-xl border border-line bg-panel-2/60 p-3 transition-colors hover:border-line-strong hover:bg-panel-2">
              <span
                className={cx(
                  "flex h-11 w-10 shrink-0 items-center justify-center rounded-lg border-2 text-[0.625rem] font-extrabold",
                  it.tone === "pink" ? "border-pink bg-pink-soft text-pink-strong" : "border-lav bg-lav-soft text-lav"
                )}
              >
                {it.tag}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.8125rem] font-bold text-ink">{it.title}</span>
                <span className="block truncate text-xs text-ink-soft">{it.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
