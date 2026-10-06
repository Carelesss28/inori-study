"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import type { QuestionSet, SetAttempt } from "@/lib/classroom/api";
import { timeAgo } from "@/lib/classroom/format";
import { typeLabel } from "@/lib/grading";
import { Icon } from "@/components/ui/Icon";
import { Button, EmptyState, cx } from "@/components/ui/primitives";
import { Rich } from "@/components/ui/Rich";
import { Bear } from "@/components/art/Illustrations";
import { useClassroom } from "@/components/classroom/context";
import { BarChart, LineChart } from "@/components/classroom/Charts";

type Mode = "first" | "best" | "latest";
const modeLabel: Record<Mode, string> = { first: "First try", best: "Best try", latest: "Latest try" };

function pickAttempt(list: SetAttempt[], mode: Mode): SetAttempt | null {
  if (list.length === 0) return null;
  if (mode === "first") return list[0];
  if (mode === "latest") return list[list.length - 1];
  return list.reduce((b, a) => (a.score > b.score ? a : b));
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const short = (s: string, n = 14) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const plain = (s: string) => s.replace(/\$([^$]+)\$/g, "$1");

export default function GradesPage() {
  return (
    <Suspense>
      <Grades />
    </Suspense>
  );
}

function Grades() {
  const { data } = useClassroom();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("first");
  const [student, setStudent] = useState<string | null>(null);

  // sets students can see (or have answered), in the order they were posted
  const sets = useMemo(
    () => data.sets.filter((s) => s.published || data.attempts.some((a) => a.set_id === s.id)).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [data.sets, data.attempts]
  );
  const setId = params.get("set") && sets.some((s) => s.id === params.get("set")) ? params.get("set")! : sets[sets.length - 1]?.id;
  const set = sets.find((s) => s.id === setId);

  // attempts grouped by set → person, oldest first
  const bySet = useMemo(() => {
    const m = new Map<string, Map<string, SetAttempt[]>>();
    for (const a of data.attempts) {
      if (!m.has(a.set_id)) m.set(a.set_id, new Map());
      const pm = m.get(a.set_id)!;
      if (!pm.has(a.person_id)) pm.set(a.person_id, []);
      pm.get(a.person_id)!.push(a);
    }
    return m;
  }, [data.attempts]);

  if (data.role !== "teacher") return <p className="card p-6 text-sm text-ink-soft">Only the teacher can see grades.</p>;
  if (data.members.length === 0 || sets.length === 0) {
    return (
      <EmptyState
        art={<Bear pose="sleep" className="w-40" />}
        title={data.members.length === 0 ? "No students yet" : "No question sets posted yet"}
        body={data.members.length === 0 ? "Share the class code so students can join — their grades will appear here." : "Post a question set in the Feed; results show up here as students answer."}
      />
    );
  }

  const members = data.members;
  const attemptsFor = (sid: string, pid: string) => bySet.get(sid)?.get(pid) ?? [];

  // ---- chart 1: progress across sets (first try, so it reflects understanding, not retries)
  const classLine = sets.map((s) => avg(members.flatMap((m) => attemptsFor(s.id, m.person_id).slice(0, 1).map((a) => a.score))));
  const selected = members.find((m) => m.person_id === student);
  const studentLine = selected ? sets.map((s) => attemptsFor(s.id, selected.person_id)[0]?.score ?? null) : null;

  // ---- set-level numbers for the chosen mode
  const rows = members.map((m) => {
    const list = set ? attemptsFor(set.id, m.person_id) : [];
    return { m, list, att: pickAttempt(list, mode) };
  });
  const finished = rows.filter((r) => r.att);
  const classAvg = avg(finished.map((r) => r.att!.score));
  const qStats = (set?.questions ?? []).map((q) => {
    const answered = finished.map((r) => r.att!.results.find((x) => x.questionId === q.id)).filter(Boolean);
    const ok = answered.filter((x) => x!.correct).length;
    return { q, answered: answered.length, ok, pct: answered.length ? Math.round((ok / answered.length) * 100) : null };
  });
  const toughest = qStats.filter((s) => s.pct !== null).sort((a, b) => a.pct! - b.pct!)[0];
  const toughestIdx = toughest ? qStats.indexOf(toughest) : -1;

  const exportCsv = () => {
    if (!set) return;
    const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const head = ["Student", `Score (${modeLabel[mode]})`, "Tries", ...set.questions.map((_, i) => `Q${i + 1}`), "Finished at"];
    const body = rows.map(({ m, list, att }) => [
      m.display_name,
      att ? att.score : "",
      list.length,
      ...set.questions.map((q) => {
        const r = att?.results.find((x) => x.questionId === q.id);
        return r ? (r.correct ? 1 : 0) : "";
      }),
      att ? new Date(att.finished_at).toISOString() : "",
    ]);
    const csv = "﻿" + [head, ...body].map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `${data.classroom.name} - ${set.title} - grades.csv` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const tiles = [
    { k: "Students", v: String(members.length), sub: "in this class" },
    { k: "Finished", v: `${finished.length}/${members.length}`, sub: set ? short(set.title, 24) : "" },
    { k: "Class average", v: classAvg === null ? "—" : `${classAvg}%`, sub: modeLabel[mode].toLowerCase() },
    { k: "Toughest question", v: toughest ? `Q${toughestIdx + 1}` : "—", sub: toughest ? `${toughest.pct}% got it right` : "no answers yet" },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* filters in one row */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold text-ink-soft">
          Question set
          <select
            value={setId}
            onChange={(e) => router.replace(`?set=${e.target.value}`, { scroll: false })}
            className="max-w-64 rounded-xl border border-line-strong bg-panel px-3 py-2 text-sm text-ink focus:outline-none"
          >
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
                {s.published ? "" : " (hidden)"}
              </option>
            ))}
          </select>
        </label>
        <div role="radiogroup" aria-label="Which attempt counts" className="flex rounded-xl bg-panel-2 p-1">
          {(Object.keys(modeLabel) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cx("rounded-lg px-3 py-1.5 text-xs font-bold", mode === m ? "bg-panel text-ink shadow-sm" : "text-ink-soft")}
            >
              {modeLabel[m]}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" icon="download" className="ml-auto" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.k} className="card p-4">
            <p className="text-xs font-bold text-ink-soft">{t.k}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{t.v}</p>
            <p className="truncate text-[0.6875rem] text-ink-faint">{t.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="card min-w-0 p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[0.9375rem] font-extrabold text-ink">Progress across sets</h2>
              <p className="text-xs text-ink-faint">First-try score per set{selected ? "" : " — click a student below to compare"}</p>
            </div>
            <select
              value={student ?? ""}
              onChange={(e) => setStudent(e.target.value || null)}
              aria-label="Compare a student"
              className="max-w-48 rounded-xl border border-line-strong bg-panel px-2.5 py-1.5 text-xs text-ink focus:outline-none"
            >
              <option value="">Compare a student…</option>
              {members.map((m) => (
                <option key={m.person_id} value={m.person_id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </div>
          <LineChart
            caption={`Class average first-try score across ${sets.length} question sets${selected ? `, compared with ${selected.display_name}` : ""}`}
            labels={sets.map((s) => short(s.title, 12))}
            fullLabels={sets.map((s) => s.title)}
            series={[
              { name: "Class average", color: "var(--c-chart-1)", values: classLine },
              ...(selected && studentLine ? [{ name: selected.display_name, color: "var(--c-chart-2)", values: studentLine }] : []),
            ]}
            extra={(i) => (
              <p className="mt-1 text-[0.6875rem] text-ink-faint">
                {members.filter((m) => attemptsFor(sets[i].id, m.person_id).length).length}/{members.length} finished
              </p>
            )}
          />
        </section>

        <section className="card min-w-0 p-5">
          <h2 className="text-[0.9375rem] font-extrabold text-ink">Questions in “{set ? short(set.title, 28) : ""}”</h2>
          <p className="mb-3 text-xs text-ink-faint">% of students who got each question right ({modeLabel[mode].toLowerCase()}) · hover for details</p>
          <BarChart
            caption={`Percent correct per question for ${set?.title}`}
            labels={qStats.map((_, i) => `Q${i + 1}`)}
            values={qStats.map((s) => s.pct)}
            onSelect={(i) => document.getElementById(`qcol-${i}`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })}
            tooltip={(i) => {
              const s = qStats[i];
              return (
                <>
                  <p className="font-extrabold text-ink">
                    Q{i + 1} · {typeLabel[s.q.type]}
                  </p>
                  <p className="line-clamp-3 text-ink-soft">{plain(s.q.prompt)}</p>
                  <p className="mt-1 font-bold text-ink">{s.pct === null ? "No answers yet" : `${s.ok}/${s.answered} correct · ${s.pct}%`}</p>
                </>
              );
            }}
          />
        </section>
      </div>

      {/* the grade grid doubles as the table view of both charts */}
      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2 pt-4">
          <h2 className="text-[0.9375rem] font-extrabold text-ink">Every student, every question</h2>
          <p className="flex items-center gap-3 text-[0.6875rem] text-ink-faint">
            <span className="flex items-center gap-1">
              <Icon name="check" size={12} strokeWidth={3} className="text-teal" /> correct
            </span>
            <span className="flex items-center gap-1">
              <Icon name="x" size={12} strokeWidth={3} className="text-danger" /> wrong
            </span>
            <span>– not answered</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-y border-line bg-panel-2/60 text-left text-[0.6875rem] font-bold uppercase tracking-wide text-ink-faint">
                <th className="sticky left-0 z-[1] bg-panel-2 px-5 py-2.5">Student</th>
                <th className="px-3 py-2.5 text-right">Score</th>
                {set?.questions.map((q, i) => (
                  <th key={q.id} id={`qcol-${i}`} className="px-1.5 py-2.5 text-center" title={plain(q.prompt)}>
                    Q{i + 1}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right">Tries</th>
                <th className="px-5 py-2.5 text-right">Last</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice()
                .sort((a, b) => (b.att?.score ?? -1) - (a.att?.score ?? -1) || a.m.display_name.localeCompare(b.m.display_name))
                .map(({ m, list, att }) => {
                  const isSel = m.person_id === student;
                  return (
                    <tr
                      key={m.person_id}
                      onClick={() => setStudent(isSel ? null : m.person_id)}
                      className={cx("cursor-pointer border-b border-line transition-colors", isSel ? "bg-pink-soft/50" : "hover:bg-panel-2/60")}
                      aria-selected={isSel}
                    >
                      <td className={cx("sticky left-0 z-[1] px-5 py-2.5 font-bold text-ink", isSel ? "bg-pink-soft" : "bg-panel")}>
                        <span className="flex items-center gap-2">
                          {isSel && <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--c-chart-2)" }} aria-hidden="true" />}
                          {m.display_name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-extrabold tabular-nums text-ink">{att ? `${att.score}%` : <span className="text-xs font-semibold text-ink-faint">not started</span>}</td>
                      {set?.questions.map((q) => {
                        const r = att?.results.find((x) => x.questionId === q.id);
                        return (
                          <td key={q.id} className="px-1.5 py-2.5 text-center">
                            {r ? (
                              <span
                                className={cx("inline-flex h-6 w-6 items-center justify-center rounded-md", r.correct ? "bg-teal-soft text-teal" : "bg-danger/10 text-danger")}
                                title={r.correct ? "Correct" : "Wrong"}
                              >
                                <Icon name={r.correct ? "check" : "x"} size={13} strokeWidth={3} />
                                <span className="sr-only">{r.correct ? "correct" : "wrong"}</span>
                              </span>
                            ) : (
                              <span className="text-ink-faint">–</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{list.length || "–"}</td>
                      <td className="px-5 py-2.5 text-right text-xs text-ink-faint">{list.length ? timeAgo(list[list.length - 1].finished_at) : "–"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {set && <QuestionKey set={set} />}
    </div>
  );
}

function QuestionKey({ set }: { set: QuestionSet }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card p-5">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left" aria-expanded={open}>
        <h2 className="text-[0.9375rem] font-extrabold text-ink">Question key</h2>
        <Icon name="chevronDown" size={16} className={cx("text-ink-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="mt-3 space-y-2 text-sm">
          {set.questions.map((q, i) => (
            <li key={q.id} className="flex gap-2">
              <span className="w-8 shrink-0 font-extrabold text-ink-faint">Q{i + 1}</span>
              <span className="text-ink">
                <Rich text={q.prompt} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
