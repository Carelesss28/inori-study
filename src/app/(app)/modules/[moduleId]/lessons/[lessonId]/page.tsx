"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useStudy } from "@/lib/store";
import { lessonsOf, pageCount } from "@/lib/derive";
import { loadFile } from "@/lib/files";
import { openPdf } from "@/lib/pdf";
import type { Lesson, Module } from "@/lib/types";
import { Bear } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { IconButton, buttonClass, cx } from "@/components/ui/primitives";
import { PageHeader } from "@/components/shell/Shell";
import { NotFound } from "@/components/lms/NotFound";
import { NotesPageView, PdfPageView } from "@/components/lms/PageViews";

const ZOOMS = [75, 100, 125, 150];

export default function LessonPage({ params }: { params: Promise<{ moduleId: string; lessonId: string }> }) {
  const { moduleId, lessonId } = use(params);
  const s = useStudy();
  const mod = s.modules.find((m) => m.id === moduleId);
  const lesson = s.lessons.find((l) => l.id === lessonId && l.moduleId === moduleId);
  if (!mod || !lesson) return <NotFound what="lesson" back={{ href: mod ? `/modules/${mod.id}` : "/modules", label: mod ? `Back to ${mod.title}` : "Back to Modules" }} />;
  return <Viewer key={lesson.id} mod={mod} lesson={lesson} />;
}

function usePdf(lesson: Lesson) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileId = lesson.source.kind === "pdf" ? lesson.source.fileId : null;

  useEffect(() => {
    if (!fileId) return;
    let cancelled = false;
    let opened: PDFDocumentProxy | null = null;
    loadFile(fileId)
      .then(async (b) => {
        if (!b) throw new Error("missing");
        opened = await openPdf(b);
        if (cancelled) return opened.loadingTask.destroy();
        setBlob(b);
        setDoc(opened);
      })
      .catch(() => !cancelled && setError("This PDF isn't stored in this browser anymore. Edit the lesson to upload it again."));
    return () => {
      cancelled = true;
      opened?.loadingTask.destroy();
    };
  }, [fileId]);

  return { doc, blob, error };
}

function Viewer({ mod, lesson }: { mod: Module; lesson: Lesson }) {
  const s = useStudy();
  const { viewLessonPage, setLessonComplete, touchRecent } = s;
  const total = pageCount(lesson);
  const progress = s.lessonProgress[lesson.id];
  const [page, setPage] = useState(() => Math.min(progress?.lastPage ?? 1, Math.max(total, 1)));
  const [zoom, setZoom] = useState(100);
  const [avail, setAvail] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const pageEls = useRef<(HTMLDivElement | null)[]>([]);
  const thumbEls = useRef<(HTMLButtonElement | null)[]>([]);
  const jumping = useRef(false);
  const { doc, blob, error } = usePdf(lesson);

  const siblings = lessonsOf(s, mod.id);
  const idx = siblings.findIndex((l) => l.id === lesson.id);
  const nextLesson = siblings[idx + 1];
  const quiz = s.quizzes.find((q) => q.lessonId === lesson.id);
  const pageWidth = Math.max(240, Math.round(Math.min((avail || 640) - 32, 1000) * (zoom / 100)));

  useEffect(() => {
    touchRecent("lesson", lesson.id);
  }, [lesson.id, touchRecent]);

  // measure the reading column
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setAvail(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // record progress for the page in view
  useEffect(() => {
    if (total > 0) viewLessonPage(lesson.id, page, total);
    thumbEls.current[page - 1]?.scrollIntoView({ block: "nearest" });
  }, [page, total, lesson.id, viewLessonPage]);

  const goTo = useCallback((n: number, smooth = true) => {
    const target = Math.max(1, Math.min(total, n));
    const el = pageEls.current[target - 1];
    const box = scroller.current;
    if (!el || !box) return;
    jumping.current = true;
    setPage(target);
    box.scrollTo({ top: el.offsetTop - 16, behavior: smooth ? "smooth" : "auto" });
    window.setTimeout(() => (jumping.current = false), smooth ? 600 : 50);
  }, [total]);

  // resume where you left off
  const resumed = useRef(false);
  useEffect(() => {
    // wait until the column is measured (page heights depend on it) and the PDF is open
    if (resumed.current || avail === 0 || (lesson.source.kind === "pdf" && !doc)) return;
    resumed.current = true;
    if (page > 1) requestAnimationFrame(() => goTo(page, false));
  }, [avail, doc, goTo, page, lesson.source.kind]);

  // track which page is most in view
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const onScroll = () => {
      if (jumping.current) return;
      const mid = box.scrollTop + box.clientHeight * 0.35;
      let current = 1;
      pageEls.current.forEach((el, i) => {
        if (el && el.offsetTop <= mid) current = i + 1;
      });
      setPage((p) => (p === current ? p : current));
    };
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, []);

  // keyboard paging
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") goTo(page + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") goTo(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, page]);

  const download = () => {
    if (!blob || lesson.source.kind !== "pdf") return;
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: lesson.source.fileName });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const pages = Array.from({ length: total }, (_, i) => i + 1);
  const renderPage = (n: number, width: number, eager = false) =>
    lesson.source.kind === "notes" ? (
      <NotesPageView page={lesson.source.pages[n - 1]} width={width} />
    ) : doc ? (
      <PdfPageView doc={doc} pageNumber={n} width={width} eager={eager} />
    ) : (
      <div className="paper animate-pulse rounded-md" style={{ width, height: width * 1.414 }} />
    );

  const toolbar = (
    <>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-panel px-1 py-0.5">
          <IconButton icon="chevronLeft" label="Previous page" onClick={() => goTo(page - 1)} disabled={page <= 1} className="h-8 w-8 disabled:opacity-30" />
          <span className="min-w-20 text-center text-xs font-bold tabular-nums text-ink-soft" aria-live="polite">
            Page {page} / {total}
          </span>
          <IconButton icon="chevronRight" label="Next page" onClick={() => goTo(page + 1)} disabled={page >= total} className="h-8 w-8 disabled:opacity-30" />
        </div>
        <label className="flex items-center rounded-xl border border-line bg-panel pl-3 pr-1 text-xs font-bold text-ink-soft">
          <span className="sr-only">Zoom</span>
          <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-10 bg-transparent pr-1 text-ink focus:outline-none">
            {ZOOMS.map((z) => (
              <option key={z} value={z}>
                {z}%
              </option>
            ))}
          </select>
        </label>
        <IconButton
          tone="pink"
          icon="check"
          label={progress?.completed ? "Completed — click to mark not done" : "Mark lesson as done"}
          onClick={() => setLessonComplete(lesson.id, !progress?.completed)}
          className={cx(progress?.completed && "bg-teal-soft! text-teal!")}
        />
        {lesson.source.kind === "pdf" && <IconButton tone="pink" icon="download" label="Download PDF" onClick={download} disabled={!blob} />}
        <IconButton tone="pink" icon="expand" label="Full screen" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : frame.current?.requestFullscreen())} />
    </>
  );

  return (
    <div>
      <PageHeader
        actions={<div className="mr-2 hidden items-center gap-2 lg:flex">{toolbar}</div>}
        back={{ href: `/modules/${mod.id}`, label: `Back to ${mod.title}` }}
        titleIcon={
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-soft text-pink-strong">
            <Icon name="file" size={16} />
          </span>
        }
        title={`Lesson ${idx + 1} - ${lesson.title}`}
      />

      <div className="mb-3 flex flex-wrap items-center justify-end gap-2 lg:hidden">{toolbar}</div>

      <div ref={frame} className="relative flex h-[calc(100vh-150px)] max-lg:h-[calc(100vh-200px)] min-h-[28.75rem] overflow-hidden rounded-[18px] border border-line bg-viewer shadow-inner">
        {/* thumbnails */}
        <nav aria-label="Pages" className="no-scrollbar hidden w-32 shrink-0 flex-col gap-3 overflow-y-auto bg-viewer-rail/70 p-3 md:flex">
          {pages.map((n) => (
            <button
              key={n}
              type="button"
              ref={(el) => {
                thumbEls.current[n - 1] = el;
              }}
              onClick={() => goTo(n)}
              aria-label={`Go to page ${n}`}
              aria-current={page === n ? "page" : undefined}
              className={cx("relative mx-auto block overflow-hidden rounded-md ring-offset-2 ring-offset-viewer-rail transition", page === n ? "ring-2 ring-pink" : "opacity-80 hover:opacity-100")}
            >
              <div className="pointer-events-none">{renderPage(n, 96)}</div>
              <span className="absolute bottom-1 right-1 rounded bg-[#4a4060]/70 px-1 text-[0.625rem] font-bold text-white">{n}</span>
            </button>
          ))}
        </nav>

        {/* reading column */}
        <div ref={scroller} className="relative flex-1 overflow-auto px-4 py-4">
          {error ? (
            <div className="paper mx-auto mt-10 max-w-md rounded-xl p-6 text-center text-sm">{error}</div>
          ) : (
            <div className="flex flex-col items-center gap-5 pb-24">
              {pages.map((n) => (
                <div
                  key={n}
                  ref={(el) => {
                    pageEls.current[n - 1] = el;
                  }}
                  data-page={n}
                >
                  {renderPage(n, pageWidth, Math.abs(n - page) <= 1)}
                </div>
              ))}
              <EndCard
                done={!!progress?.completed}
                onDone={() => setLessonComplete(lesson.id, true)}
                quizHref={quiz ? `/quizzes/${quiz.id}` : null}
                nextHref={nextLesson ? `/modules/${mod.id}/lessons/${nextLesson.id}` : null}
                backHref={`/modules/${mod.id}`}
              />
            </div>
          )}
        </div>
        <Bear pose="peek" className="pointer-events-none absolute -bottom-1 right-5 w-24 sm:w-28" />
      </div>
    </div>
  );
}

function EndCard({ done, onDone, quizHref, nextHref, backHref }: { done: boolean; onDone: () => void; quizHref: string | null; nextHref: string | null; backHref: string }) {
  return (
    <div className="w-full max-w-md rounded-2xl bg-panel p-5 text-center shadow-lg">
      <p className="text-base font-extrabold text-ink">{done ? "Lesson complete ✨" : "You reached the end!"}</p>
      <p className="mt-1 text-sm text-ink-soft">{done ? "Lovely work. What's next?" : "Mark it as done to update your progress."}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {!done && (
          <button type="button" onClick={onDone} className={buttonClass("pink", "sm")}>
            <Icon name="check" size={14} /> Mark as done
          </button>
        )}
        {quizHref && (
          <Link href={quizHref} className={buttonClass(done ? "pink" : "outline", "sm")}>
            Take the quiz
          </Link>
        )}
        {nextHref ? (
          <Link href={nextHref} className={buttonClass("outline", "sm")}>
            Next lesson →
          </Link>
        ) : (
          <Link href={backHref} className={buttonClass("outline", "sm")}>
            Back to module
          </Link>
        )}
      </div>
    </div>
  );
}
