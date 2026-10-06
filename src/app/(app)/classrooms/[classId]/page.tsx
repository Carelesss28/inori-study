"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { api, type Post, type QuestionSet } from "@/lib/classroom/api";
import { clockTime, dayLabel, initials, minutesFor, tintFor } from "@/lib/classroom/format";
import { quizTypesLabel } from "@/lib/grading";
import { Icon } from "@/components/ui/Icon";
import { Button, Confirm, Menu, ProgressBar, buttonClass, cx } from "@/components/ui/primitives";
import { useClassroom } from "@/components/classroom/context";
import { Bunny } from "@/components/art/Illustrations";

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all font-semibold text-chart-1 underline">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export default function FeedPage() {
  const { me, classId, data, refresh } = useClassroom();
  const router = useRouter();
  const teacher = data.role === "teacher";
  const scroller = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  const [deleting, setDeleting] = useState<Post | null>(null);

  const setsById = new Map(data.sets.map((s) => [s.id, s]));
  const posts = data.posts;
  const pinned = posts.filter((p) => p.pinned);
  const drafts = teacher ? data.sets.filter((s) => !s.published && !posts.some((p) => p.set_id === s.id)) : [];

  // stick to the newest post, like a chat — unless the reader scrolled up
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (lastCount.current === 0 || (posts.length > lastCount.current && nearBottom)) el.scrollTop = el.scrollHeight;
    lastCount.current = posts.length;
  }, [posts.length]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } finally {
      refresh();
    }
  };

  return (
    <div className="flex flex-col">
      <div className="card flex h-[calc(100vh-15rem)] min-h-[26rem] flex-col overflow-hidden p-0 max-lg:h-[calc(100vh-17rem)]">
        {pinned.length > 0 && (
          <div className="flex items-center gap-2 border-b border-line bg-pink-soft/50 px-4 py-2 text-xs">
            <Icon name="pin" size={14} className="shrink-0 text-pink-strong" />
            <span className="font-bold text-ink-soft">Pinned:</span>
            <div className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto">
              {pinned.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => document.getElementById(`post-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="max-w-56 shrink-0 truncate rounded-lg bg-panel px-2 py-1 font-semibold text-ink hover:bg-panel-2"
                >
                  {p.kind === "set" ? `🧩 ${setsById.get(p.set_id!)?.title ?? "Question set"}` : p.body}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={scroller} className="flex-1 overflow-y-auto px-3 py-4 sm:px-6">
          {posts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Bunny className="w-20" />
              <p className="mt-2 text-sm font-bold text-ink">Nothing posted yet</p>
              <p className="max-w-xs text-xs text-ink-soft">
                {teacher ? "Say hello to your class, or post your first question set below." : "When your teacher posts announcements or question sets, they'll show up here."}
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {posts.map((p, i) => {
                const day = dayLabel(p.created_at);
                const sep = i === 0 || dayLabel(posts[i - 1].created_at) !== day;
                const set = p.set_id ? setsById.get(p.set_id) : undefined;
                return (
                  <li key={p.id} id={`post-${p.id}`}>
                    {sep && (
                      <div className="my-3 flex items-center gap-3 text-[0.6875rem] font-bold text-ink-faint">
                        <span className="h-px flex-1 bg-line" />
                        {day}
                        <span className="h-px flex-1 bg-line" />
                      </div>
                    )}
                    <PostRow
                      post={p}
                      teacherName={data.classroom.teacher_name}
                      tintSeed={`${classId}-teacher`}
                      actions={
                        teacher ? (
                          <Menu
                            label="Post options"
                            items={[
                              { label: p.pinned ? "Unpin" : "Pin to top", icon: "pin", onSelect: () => act(() => api.pinPost(me, p.id, !p.pinned)) },
                              ...(set
                                ? [
                                    { label: "Edit set", icon: "pencil" as const, onSelect: () => router.push(`/classrooms/${classId}/sets/${set.id}/edit`) },
                                    {
                                      label: set.published ? "Hide from students" : "Show to students",
                                      icon: "flag" as const,
                                      onSelect: () => act(() => api.setPublished(me, set.id, !set.published)),
                                    },
                                  ]
                                : []),
                              { label: set ? "Delete set" : "Delete post", icon: "trash", danger: true, onSelect: () => setDeleting(p) },
                            ]}
                          />
                        ) : null
                      }
                    >
                      {p.kind === "announcement" ? (
                        <div className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-ink">
                          <Linkified text={p.body} />
                        </div>
                      ) : set ? (
                        <SetCard set={set} />
                      ) : null}
                    </PostRow>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {teacher ? <Composer drafts={drafts} /> : <p className="border-t border-line px-4 py-3 text-center text-xs text-ink-faint">Only your teacher can post in this class — tap a question set to start.</p>}
      </div>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={deleting?.kind === "set" ? "Delete this question set?" : "Delete this post?"}
        body={deleting?.kind === "set" ? "The set, its post and every student's answers to it will be removed. To keep the grades, hide it instead." : "It will disappear for everyone in the class."}
        onConfirm={() => deleting && act(() => api.deletePost(me, deleting.id))}
      />
    </div>
  );
}

function PostRow({ post, teacherName, tintSeed, actions, children }: { post: Post; teacherName: string; tintSeed: string; actions: ReactNode; children: ReactNode }) {
  const tint = tintFor(tintSeed);
  return (
    <div className="group flex items-start gap-2.5">
      <span className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold" style={{ background: tint.bg, color: tint.fg }}>
        {initials(teacherName)}
      </span>
      <div className="min-w-0 max-w-[46rem] flex-1">
        <p className="mb-1 flex items-center gap-2 px-1 text-[0.6875rem] text-ink-faint">
          <b className="text-ink-soft">{teacherName}</b>
          <span>{clockTime(post.created_at)}</span>
          {post.pinned && (
            <span className="flex items-center gap-0.5 font-bold text-pink-strong">
              <Icon name="pin" size={11} /> pinned
            </span>
          )}
        </p>
        <div className="flex items-start gap-1">
          <div className={cx("min-w-0 flex-1 rounded-2xl rounded-tl-md", post.kind === "announcement" && "bg-panel-2 px-4 py-3")}>{children}</div>
          <div className="opacity-60 transition-opacity group-hover:opacity-100">{actions}</div>
        </div>
      </div>
    </div>
  );
}

function SetCard({ set }: { set: QuestionSet }) {
  const { me, classId, data } = useClassroom();
  const teacher = data.role === "teacher";
  const n = set.questions.length;
  const done = data.set_progress[set.id] ?? 0;
  const mine = data.attempts.filter((a) => a.set_id === set.id && a.person_id === me.id);
  const best = mine.reduce((b, a) => Math.max(b, a.score), -1);
  const firstTries = teacher
    ? Object.values(
        data.attempts
          .filter((a) => a.set_id === set.id)
          .reduce<Record<string, number>>((acc, a) => (a.person_id in acc ? acc : { ...acc, [a.person_id]: a.score }), {})
      )
    : [];
  const avg = firstTries.length ? Math.round(firstTries.reduce((s, x) => s + x, 0) / firstTries.length) : null;
  const playHref = `/classrooms/${classId}/sets/${set.id}`;

  return (
    <div className={cx("overflow-hidden rounded-2xl border-2 bg-panel", set.published ? "border-lav/40" : "border-dashed border-line-strong")}>
      <div className="flex items-start gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lav-soft text-xl" aria-hidden="true">
          🧩
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-base font-extrabold text-ink">{set.title}</span>
            {!set.published && <span className="rounded-md bg-panel-2 px-1.5 py-0.5 text-[0.625rem] font-extrabold uppercase text-ink-faint">Hidden from students</span>}
          </p>
          {set.description && <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-soft">{set.description}</p>}
          <p className="mt-1 text-xs text-ink-faint">
            {n} question{n === 1 ? "" : "s"} · ~{minutesFor(n)} min · {quizTypesLabel(set)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-panel-2/50 px-4 py-3">
        {teacher ? (
          <>
            <div className="min-w-40 flex-1">
              <div className="flex justify-between text-xs font-semibold text-ink-soft">
                <span>
                  {done}/{data.member_count} finished
                </span>
                {avg !== null && <span>avg first try {avg}%</span>}
              </div>
              <ProgressBar value={data.member_count ? (done / data.member_count) * 100 : 0} tone="lav" className="mt-1" label="Students finished" />
            </div>
            <Link href={`/classrooms/${classId}/grades?set=${set.id}`} className={buttonClass("outline", "sm")}>
              Grades
            </Link>
            <Link href={playHref} className={buttonClass("soft", "sm")}>
              <Icon name="play" size={12} /> Preview
            </Link>
          </>
        ) : (
          <>
            <p className="flex-1 text-xs font-semibold text-ink-soft">
              {best >= 0 ? (
                <>
                  <span className="text-teal">✓ Done</span> · best {best}% · {mine.length} {mine.length === 1 ? "try" : "tries"}
                </>
              ) : (
                `${done} classmate${done === 1 ? "" : "s"} finished`
              )}
            </p>
            <Link href={playHref} className={buttonClass(best >= 0 ? "outline" : "pink", "sm")}>
              <Icon name={best >= 0 ? "refresh" : "play"} size={12} /> {best >= 0 ? "Practice again" : "Start"}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function Composer({ drafts }: { drafts: QuestionSet[] }) {
  const { me, classId, refresh } = useClassroom();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  // grow with the message, up to ~6 lines
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.postAnnouncement(me, classId, text);
      setText("");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-line bg-panel px-3 py-3 sm:px-4">
      {drafts.length > 0 && (
        <div className="no-scrollbar mb-2 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="shrink-0 font-bold text-ink-faint">Drafts:</span>
          {drafts.map((d) => (
            <Link key={d.id} href={`/classrooms/${classId}/sets/${d.id}/edit`} className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-line-strong px-2 py-1 font-semibold text-ink hover:border-pink">
              🧩 {d.title}
            </Link>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex shrink-0 gap-1">
          <Link href={`/classrooms/${classId}/sets/new`} className={cx(buttonClass("soft", "sm"), "h-10")} title="Post a question set">
            <Icon name="plus" size={14} /> <span className="hidden sm:inline">Question set</span>
          </Link>
          <Link href={`/classrooms/${classId}/sets/new?import=1`} className={cx(buttonClass("ghost", "sm"), "h-10")} title="Create a set from a CSV file">
            <Icon name="upload" size={14} /> <span className="hidden md:inline">CSV</span>
          </Link>
        </div>
        <label className="sr-only" htmlFor="composer">
          Announcement
        </label>
        <textarea
          id="composer"
          ref={area}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={4000}
          placeholder="Write an announcement to the class…"
          className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-line-strong bg-panel-2/60 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-lav focus:outline-none focus:ring-2 focus:ring-lav/30"
        />
        <Button onClick={send} disabled={busy || !text.trim()} className="h-10 w-10 shrink-0 px-0" aria-label="Send announcement">
          <Icon name="send" size={17} />
        </Button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
      <p className="mt-1.5 hidden text-[0.6875rem] text-ink-faint sm:block">Enter to send · Shift+Enter for a new line</p>
    </div>
  );
}
