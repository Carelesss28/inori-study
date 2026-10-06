import type { Attempt, Lesson, LessonProgress, Module, Quiz, StudyState } from "./types";

export function pageCount(lesson: Lesson) {
  return lesson.source.kind === "notes" ? lesson.source.pages.length : lesson.source.pageCount;
}

export function lessonPercent(lesson: Lesson, progress: LessonProgress | undefined) {
  if (!progress) return 0;
  if (progress.completed) return 100;
  const total = pageCount(lesson);
  if (total === 0) return 0;
  return Math.round((progress.viewed.length / total) * 100);
}

export function lessonsOf(state: StudyState, moduleId: string) {
  return state.lessons.filter((l) => l.moduleId === moduleId).sort((a, b) => a.order - b.order);
}

export function quizzesOf(state: StudyState, moduleId: string) {
  return state.quizzes.filter((q) => q.moduleId === moduleId).sort((a, b) => a.createdAt - b.createdAt);
}

export function modulePercent(state: StudyState, moduleId: string) {
  const lessons = lessonsOf(state, moduleId);
  if (lessons.length === 0) return 0;
  const sum = lessons.reduce((s, l) => s + lessonPercent(l, state.lessonProgress[l.id]), 0);
  return Math.round(sum / lessons.length);
}

export function attemptsOf(state: StudyState, quizId: string) {
  return state.attempts.filter((a) => a.quizId === quizId).sort((a, b) => b.finishedAt - a.finishedAt);
}

export function bestAttempt(state: StudyState, quizId: string): Attempt | null {
  return attemptsOf(state, quizId).reduce<Attempt | null>((best, a) => (!best || a.score > best.score ? a : best), null);
}

export function isLessonDone(state: StudyState, lessonId: string) {
  return !!state.lessonProgress[lessonId]?.completed;
}

export function overview(state: StudyState) {
  const lessonsDone = state.lessons.filter((l) => isLessonDone(state, l.id)).length;
  const quizzesDone = state.quizzes.filter((q) => state.attempts.some((a) => a.quizId === q.id)).length;
  const modulePcts = state.modules.map((m) => modulePercent(state, m.id));
  const modulesDone = modulePcts.filter((p) => p === 100).length;
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

  const lessonFractions = state.lessons.map((l) => lessonPercent(l, state.lessonProgress[l.id]) / 100);
  const quizFractions = state.quizzes.map((q) => (state.attempts.some((a) => a.quizId === q.id) ? 1 : 0));
  const all = [...lessonFractions, ...quizFractions];
  const overall = all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 100) : 0;

  return {
    overall,
    modules: { done: modulesDone, total: state.modules.length, pct: avg(modulePcts) },
    lessons: {
      done: lessonsDone,
      total: state.lessons.length,
      pct: state.lessons.length ? Math.round((lessonsDone / state.lessons.length) * 100) : 0,
    },
    quizzes: {
      done: quizzesDone,
      total: state.quizzes.length,
      pct: state.quizzes.length ? Math.round((quizzesDone / state.quizzes.length) * 100) : 0,
    },
  };
}

export function moduleById(state: StudyState, id: string): Module | undefined {
  return state.modules.find((m) => m.id === id);
}

export function quizTotalMarks(quiz: Quiz) {
  return quiz.questions.reduce((s, q) => s + q.marks, 0);
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m} min ${s} sec`;
}

export function formatShortDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
