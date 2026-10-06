"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { gradeQuiz } from "./grading";
import { buildEmptyState, buildSeedState, dayKey, defaultPrefs, defaultProfile, uid } from "./seed";
import { clearFiles, deleteFile } from "./files";
import { lessonsOf } from "./derive";
import type {
  ActiveAttempt,
  AnswerValue,
  QuestionResult,
  CoverArt,
  Lesson,
  LessonSource,
  Module,
  Preferences,
  Profile,
  Quiz,
  RecentItem,
  StudyState,
} from "./types";

import { STORAGE_KEY } from "./constants";
import { themeMode } from "./themes";
import { applyRevision, mistakesFromHistory, noteResults, type AnsweredItem, type RevisionSession } from "./revision";

// defaults earlier versions shipped; saves still holding one of these were never personalised
const SHIPPED_DEFAULTS: [string, string][] = [
  ["Khant Hein", "khant@example.com"],
  ["Student", "student@example.com"],
];

/** An untouched profile follows the current default in seed.ts; a personalised one is kept. */
function migrateProfile(p: StudyState["profile"]): StudyState["profile"] {
  const untouched = p.customized === false || (p.customized === undefined && SHIPPED_DEFAULTS.some(([n, e]) => p.name === n && p.email === e));
  if (!untouched) return { ...p, customized: true };
  return { ...p, name: defaultProfile.name, email: defaultProfile.email, customized: false };
}

function loadState(): StudyState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeedState();
    const parsed = JSON.parse(raw) as StudyState;
    if (parsed.version !== 1) return buildSeedState();
    return {
      ...buildEmptyState(defaultProfile, defaultPrefs),
      ...parsed,
      profile: migrateProfile({ ...defaultProfile, ...parsed.profile }),
      prefs: { ...defaultPrefs, ...parsed.prefs },
      // saves from before the Revision notebook: start it from the quiz history
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : mistakesFromHistory(parsed),
    };
  } catch {
    return buildSeedState();
  }
}

type SetState = (fn: (s: StudyState) => StudyState) => void;

function noteQuiz(s: StudyState, quiz: Quiz, answers: Record<string, AnswerValue>, results: QuestionResult[]) {
  const items: AnsweredItem[] = quiz.questions.map((q) => ({
    question: q,
    answer: answers[q.id],
    correct: !!results.find((r) => r.questionId === q.id)?.correct,
  }));
  return noteResults(s.mistakes, { kind: "quiz", quizId: quiz.id, quizTitle: quiz.title, moduleId: quiz.moduleId, lessonId: quiz.lessonId }, items);
}

function makeActions(set: SetState, get: () => StudyState) {
  const pdfIdsFor = (lessons: Lesson[]) =>
    lessons.flatMap((l) => (l.source.kind === "pdf" ? [l.source.fileId] : []));

  return {
    updateProfile(patch: Partial<Profile>) {
      const personal = patch.name !== undefined || patch.email !== undefined;
      set((s) => ({ ...s, profile: { ...s.profile, ...patch, ...(personal ? { customized: true } : {}) } }));
    },
    updatePrefs(patch: Partial<Preferences>) {
      set((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
    },

    // ---- modules
    addModule(input: { title: string; description: string; cover: CoverArt }) {
      const mod: Module = { id: uid("m"), createdAt: Date.now(), ...input };
      set((s) => ({ ...s, modules: [...s.modules, mod] }));
      return mod.id;
    },
    updateModule(id: string, patch: Partial<Omit<Module, "id">>) {
      set((s) => ({ ...s, modules: s.modules.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
    },
    deleteModule(id: string) {
      const s0 = get();
      pdfIdsFor(s0.lessons.filter((l) => l.moduleId === id)).forEach(deleteFile);
      set((s) => {
        const lessonIds = new Set(s.lessons.filter((l) => l.moduleId === id).map((l) => l.id));
        const quizIds = new Set(s.quizzes.filter((q) => q.moduleId === id).map((q) => q.id));
        const lessonProgress = { ...s.lessonProgress };
        lessonIds.forEach((lid) => delete lessonProgress[lid]);
        const active = { ...s.active };
        quizIds.forEach((qid) => delete active[qid]);
        return {
          ...s,
          modules: s.modules.filter((m) => m.id !== id),
          lessons: s.lessons.filter((l) => !lessonIds.has(l.id)),
          quizzes: s.quizzes.filter((q) => !quizIds.has(q.id)),
          attempts: s.attempts.filter((a) => !quizIds.has(a.quizId)),
          mistakes: s.mistakes.filter((m) => !(m.source.kind === "quiz" && quizIds.has(m.source.quizId))),
          recent: s.recent.filter((r) => !lessonIds.has(r.id) && !quizIds.has(r.id)),
          lessonProgress,
          active,
        };
      });
    },

    // ---- lessons
    addLesson(moduleId: string, input: { title: string; summary: string; source: LessonSource }) {
      const order = lessonsOf(get(), moduleId).reduce((mx, l) => Math.max(mx, l.order), 0) + 1;
      const lesson: Lesson = { id: uid("l"), moduleId, order, ...input };
      set((s) => ({ ...s, lessons: [...s.lessons, lesson] }));
      return lesson.id;
    },
    updateLesson(id: string, patch: Partial<Omit<Lesson, "id" | "moduleId">>) {
      set((s) => ({ ...s, lessons: s.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    },
    deleteLesson(id: string) {
      pdfIdsFor(get().lessons.filter((l) => l.id === id)).forEach(deleteFile);
      set((s) => {
        const lessonProgress = { ...s.lessonProgress };
        delete lessonProgress[id];
        return {
          ...s,
          lessons: s.lessons.filter((l) => l.id !== id),
          quizzes: s.quizzes.map((q) => (q.lessonId === id ? { ...q, lessonId: null } : q)),
          recent: s.recent.filter((r) => r.id !== id),
          lessonProgress,
        };
      });
    },
    moveLesson(id: string, dir: -1 | 1) {
      set((s) => {
        const lesson = s.lessons.find((l) => l.id === id);
        if (!lesson) return s;
        const siblings = lessonsOf(s, lesson.moduleId);
        const i = siblings.findIndex((l) => l.id === id);
        const other = siblings[i + dir];
        if (!other) return s;
        return {
          ...s,
          lessons: s.lessons.map((l) =>
            l.id === lesson.id ? { ...l, order: other.order } : l.id === other.id ? { ...l, order: lesson.order } : l
          ),
        };
      });
    },
    setLessonComplete(id: string, completed: boolean) {
      set((s) => {
        const prev = s.lessonProgress[id] ?? { viewed: [], lastPage: 1, completed: false };
        return { ...s, lessonProgress: { ...s.lessonProgress, [id]: { ...prev, completed } } };
      });
    },
    viewLessonPage(id: string, page: number, totalPages: number) {
      set((s) => {
        const prev = s.lessonProgress[id] ?? { viewed: [], lastPage: 1, completed: false };
        const viewed = prev.viewed.includes(page) ? prev.viewed : [...prev.viewed, page].sort((a, b) => a - b);
        if (viewed === prev.viewed && prev.lastPage === page) return s;
        const completed = prev.completed || (totalPages > 0 && viewed.length >= totalPages);
        return { ...s, lessonProgress: { ...s.lessonProgress, [id]: { viewed, lastPage: page, completed } } };
      });
    },

    // ---- quizzes
    saveQuiz(quiz: Quiz) {
      set((s) => {
        const exists = s.quizzes.some((q) => q.id === quiz.id);
        const active = { ...s.active };
        delete active[quiz.id]; // questions may have changed under an in-progress attempt
        return {
          ...s,
          active,
          quizzes: exists ? s.quizzes.map((q) => (q.id === quiz.id ? quiz : q)) : [...s.quizzes, quiz],
        };
      });
    },
    deleteQuiz(id: string) {
      set((s) => {
        const active = { ...s.active };
        delete active[id];
        return {
          ...s,
          active,
          quizzes: s.quizzes.filter((q) => q.id !== id),
          attempts: s.attempts.filter((a) => a.quizId !== id),
          mistakes: s.mistakes.filter((m) => !(m.source.kind === "quiz" && m.source.quizId === id)),
          recent: s.recent.filter((r) => r.id !== id),
        };
      });
    },
    startAttempt(quizId: string) {
      set((s) => {
        if (s.active[quizId]) return s;
        const fresh: ActiveAttempt = { quizId, startedAt: Date.now(), answers: {}, current: 0 };
        return { ...s, active: { ...s.active, [quizId]: fresh } };
      });
    },
    updateActive(quizId: string, patch: Partial<Omit<ActiveAttempt, "quizId">>) {
      set((s) => {
        const cur = s.active[quizId];
        if (!cur) return s;
        return { ...s, active: { ...s.active, [quizId]: { ...cur, ...patch } } };
      });
    },
    discardActive(quizId: string) {
      set((s) => {
        const active = { ...s.active };
        delete active[quizId];
        return { ...s, active };
      });
    },
    /** Grades the in-progress attempt and returns the new attempt id. */
    submitAttempt(quizId: string): string | null {
      const s0 = get();
      const quiz = s0.quizzes.find((q) => q.id === quizId);
      const act = s0.active[quizId];
      if (!quiz || !act) return null;
      const { results, score } = gradeQuiz(quiz, act.answers);
      const attempt = {
        id: uid("att"),
        quizId,
        startedAt: act.startedAt,
        finishedAt: Date.now(),
        answers: act.answers,
        results,
        score,
      };
      set((s) => {
        const active = { ...s.active };
        delete active[quizId];
        return { ...s, active, attempts: [...s.attempts, attempt], mistakes: noteQuiz(s, quiz, act.answers, results) };
      });
      return attempt.id;
    },

    /** Records a finished practice-mode run (no in-progress state involved). */
    recordAttempt(quizId: string, answers: Record<string, AnswerValue>, startedAt: number): string | null {
      const quiz = get().quizzes.find((q) => q.id === quizId);
      if (!quiz) return null;
      const { results, score } = gradeQuiz(quiz, answers);
      const attempt = { id: uid("att"), quizId, startedAt, finishedAt: Date.now(), answers, results, score };
      set((s) => ({ ...s, attempts: [...s.attempts, attempt], mistakes: noteQuiz(s, quiz, answers, results) }));
      return attempt.id;
    },

    // ---- revision notebook
    /** Wrong answers from a classroom set (the class lives online; the notebook is personal). */
    noteClassResults(source: { classId: string; className: string; setId: string; setTitle: string }, items: AnsweredItem[]) {
      set((s) => ({ ...s, mistakes: noteResults(s.mistakes, { kind: "class", ...source }, items) }));
    },
    applyRevisionResults(session: RevisionSession, results: QuestionResult[], answers: Record<string, AnswerValue>) {
      set((s) => ({ ...s, mistakes: applyRevision(s.mistakes, session, results, answers) }));
    },
    /** "I've got it" — mark as mastered without revising, or bring it back. */
    setMistakeMastered(id: string, mastered: boolean) {
      set((s) => ({
        ...s,
        mistakes: s.mistakes.map((m) => (m.id === id ? { ...m, masteredAt: mastered ? Date.now() : null, streak: mastered ? Math.max(m.streak, 2) : 0 } : m)),
      }));
    },
    removeMistake(id: string) {
      set((s) => ({ ...s, mistakes: s.mistakes.filter((m) => m.id !== id) }));
    },
    clearMastered() {
      set((s) => ({ ...s, mistakes: s.mistakes.filter((m) => !m.masteredAt) }));
    },

    // ---- plan
    addPlanItem(title: string, minutes: number, href?: string) {
      set((s) => ({
        ...s,
        plan: [...s.plan, { id: uid("plan"), date: dayKey(), title, minutes, done: false, href }],
      }));
    },
    togglePlanItem(id: string) {
      set((s) => ({ ...s, plan: s.plan.map((p) => (p.id === id ? { ...p, done: !p.done } : p)) }));
    },
    deletePlanItem(id: string) {
      set((s) => ({ ...s, plan: s.plan.filter((p) => p.id !== id) }));
    },
    /** Suggests today's plan: the next unfinished lessons and quizzes you haven't tried. */
    planMyDay() {
      set((s) => {
        const today = dayKey();
        const titles = new Set(s.plan.filter((p) => p.date === today).map((p) => p.title));
        const items: StudyState["plan"] = [];
        for (const mod of s.modules) {
          const next = lessonsOf(s, mod.id).find((l) => !s.lessonProgress[l.id]?.completed);
          if (next && items.length < 2) {
            const title = `${mod.title} - ${next.title}`;
            if (!titles.has(title))
              items.push({ id: uid("plan"), date: today, title, minutes: 45, done: false, href: `/modules/${mod.id}/lessons/${next.id}` });
          }
        }
        const untried = s.quizzes.find((q) => !s.attempts.some((a) => a.quizId === q.id));
        if (untried) {
          const mod = s.modules.find((m) => m.id === untried.moduleId);
          const title = `${mod?.title ?? ""} ${untried.title}`.trim();
          if (!titles.has(title))
            items.push({ id: uid("plan"), date: today, title, minutes: untried.timeLimitMin, done: false, href: `/quizzes/${untried.id}` });
        }
        return { ...s, plan: [...s.plan, ...items] };
      });
    },

    // ---- misc
    touchRecent(kind: RecentItem["kind"], id: string) {
      set((s) => {
        if (!s.prefs.trackRecent) return s;
        if (s.recent[0]?.id === id && Date.now() - s.recent[0].at < 60_000) return s;
        const recent = [{ kind, id, at: Date.now() }, ...s.recent.filter((r) => r.id !== id)].slice(0, 8);
        return { ...s, recent };
      });
    },
    clearRecent() {
      set((s) => ({ ...s, recent: [] }));
    },
    markNotificationsRead(ids: string[]) {
      set((s) => ({ ...s, readNotifications: Array.from(new Set([...s.readNotifications, ...ids])).slice(-200) }));
    },
    resetDemo() {
      clearFiles();
      set((s) => ({ ...buildSeedState(), profile: s.profile, prefs: s.prefs }));
    },
    startFresh() {
      clearFiles();
      set((s) => buildEmptyState(s.profile, s.prefs));
    },
    importState(json: string) {
      const parsed = JSON.parse(json) as StudyState;
      if (parsed.version !== 1 || !Array.isArray(parsed.modules)) throw new Error("Not an Inori Study backup file.");
      set(() => ({ ...buildEmptyState(defaultProfile, defaultPrefs), ...parsed }));
    },
  };
}

export type StudyActions = ReturnType<typeof makeActions>;
type StudyContextValue = StudyState & StudyActions;

/* A tiny external store: React reads it with useSyncExternalStore, so there is no
   hydration setState and actions can read the latest state without refs. */
let current: StudyState | null = null;
const listeners = new Set<() => void>();

function applyToDocument(state: StudyState) {
  document.documentElement.dataset.theme = state.prefs.theme;
  document.documentElement.dataset.mode = themeMode(state.prefs.theme);
  document.documentElement.style.setProperty("--fs", String(state.prefs.fontScale || 1));
  if (state.prefs.customBg) document.documentElement.dataset.wallpaper = "on";
  else delete document.documentElement.dataset.wallpaper;
  document.documentElement.dataset.motion = state.prefs.reduceMotion ? "reduce" : "full";
}

function getSnapshot(): StudyState | null {
  if (current === null && typeof window !== "undefined") {
    current = loadState();
    applyToDocument(current);
    // pin the demo data on first visit so its dates don't shift on every reload
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // storage blocked — fine, we stay in memory
    }
  }
  return current;
}

function setStore(fn: (s: StudyState) => StudyState) {
  const prev = getSnapshot();
  if (!prev) return;
  const next = fn(prev);
  if (next === prev) return;
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked — keep working in memory
  }
  applyToDocument(next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // keep tabs in sync when another tab saves
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    current = loadState();
    applyToDocument(current);
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const actions = makeActions(setStore, () => getSnapshot()!);

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const value = useMemo(() => (state ? { ...state, ...actions } : null), [state]);
  return <StudyContext.Provider value={value}>{value ? children : <Splash />}</StudyContext.Provider>;
}

function Splash() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg">
      <div className="flex animate-pulse items-center gap-3 text-ink-soft">
        <span className="text-2xl">🐰</span>
        <span className="text-lg font-bold tracking-tight">Inori Study</span>
      </div>
    </div>
  );
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error("useStudy must be used within StudyProvider");
  return ctx;
}
