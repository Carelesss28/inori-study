import { gradeQuiz } from "./grading";
import { mistakesFromHistory } from "./revision";
import { seedLessons, seedModules, seedQuizzes } from "./seed-content";
import type { AnswerValue, Attempt, LessonProgress, Preferences, Profile, Quiz, StudyState } from "./types";

export const DAY = 24 * 60 * 60 * 1000;

export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const defaultProfile: Profile = {
  name: "Meow",
  email: "student@example.com",
  role: "Student",
  avatar: null,
  bio: "",
  customized: false,
};

export const defaultPrefs: Preferences = {
  theme: "blossom",
  fontScale: 1,
  customBg: null,
  customMascot: null,
  ambience: true,
  hints: true,
  reduceMotion: false,
  notifyPlan: true,
  notifyQuizzes: true,
  notifyMilestones: true,
  trackRecent: true,
};

/** Build a past attempt that gets exactly the listed question indexes wrong. */
function pastAttempt(quiz: Quiz, wrong: number[], daysAgo: number, seconds: number, now: number): Attempt {
  const answers: Record<string, AnswerValue> = {};
  quiz.questions.forEach((q, i) => {
    const miss = wrong.includes(i);
    if (q.type === "blank") answers[q.id] = miss ? "3" : q.accepted[0];
    else if (q.type === "mcq") answers[q.id] = miss ? [(q.correct[0] + 1) % q.options.length] : [...q.correct];
    else answers[q.id] = miss ? [q.correct[0]] : [...q.correct];
  });
  const finishedAt = now - daysAgo * DAY - 3 * 60 * 60 * 1000;
  const { results, score } = gradeQuiz(quiz, answers);
  return {
    id: `att-seed-${quiz.id}`,
    quizId: quiz.id,
    startedAt: finishedAt - seconds * 1000,
    finishedAt,
    answers,
    results,
    score,
  };
}

function progressFor(pages: number, viewedCount: number): LessonProgress {
  const viewed = Array.from({ length: Math.min(viewedCount, pages) }, (_, i) => i + 1);
  return { viewed, lastPage: Math.max(1, viewed.length), completed: viewed.length >= pages };
}

export function buildSeedState(now = Date.now()): StudyState {
  // how many pages have been read per lesson (-1 = all)
  const read: Record<string, number> = {
    "l-am-1": -1, "l-am-2": -1, "l-am-3": -1,
    "l-ph-1": -1, "l-ph-2": 1,
    "l-be-1": 2, "l-be-2": 1,
    "l-pf-1": -1, "l-pf-2": -1, "l-pf-3": -1,
    "l-st-1": -1, "l-st-2": 1,
    "l-cs-1": -1,
  };
  const lessonProgress: Record<string, LessonProgress> = {};
  for (const lesson of seedLessons) {
    if (!(lesson.id in read) || lesson.source.kind !== "notes") continue;
    const total = lesson.source.pages.length;
    lessonProgress[lesson.id] = progressFor(total, read[lesson.id] === -1 ? total : read[lesson.id]);
  }

  const q = (id: string) => seedQuizzes.find((x) => x.id === id)!;
  const attempts = [
    pastAttempt(q("q-am-1"), [2, 9, 16], 0, 18 * 60 + 12, now),
    pastAttempt(q("q-am-2"), [3, 8, 9], 2, 16 * 60 + 40, now),
    pastAttempt(q("q-be-1"), [3, 4], 5, 14 * 60 + 5, now),
    pastAttempt(q("q-pf-1"), [4], 6, 9 * 60 + 30, now),
    pastAttempt(q("q-ph-1"), [3], 8, 11 * 60 + 2, now),
  ];

  const today = dayKey(new Date(now));
  return {
    version: 1,
    modules: seedModules,
    lessons: seedLessons,
    quizzes: seedQuizzes,
    attempts,
    active: {},
    lessonProgress,
    plan: [
      { id: "plan-1", date: today, title: "Applied Mathematics - Lesson 2", minutes: 45, done: true, href: "/modules/m-am/lessons/l-am-2" },
      { id: "plan-2", date: today, title: "Battery Electrochemistry Quiz 1", minutes: 30, done: false, href: "/quizzes/q-be-1" },
      { id: "plan-3", date: today, title: "C++ Practice", minutes: 45, done: false, href: "/modules/m-pf/lessons/l-pf-3" },
    ],
    recent: [
      { kind: "lesson", id: "l-am-2", at: now - 60 * 60 * 1000 },
      { kind: "quiz", id: "q-be-1", at: now - 3 * 60 * 60 * 1000 },
      { kind: "lesson", id: "l-pf-1", at: now - DAY },
    ],
    profile: defaultProfile,
    prefs: defaultPrefs,
    readNotifications: [],
    mistakes: mistakesFromHistory({ quizzes: seedQuizzes, attempts }),
  };
}

export function buildEmptyState(profile: Profile, prefs: Preferences): StudyState {
  return {
    version: 1,
    modules: [],
    lessons: [],
    quizzes: [],
    attempts: [],
    active: {},
    lessonProgress: {},
    plan: [],
    recent: [],
    profile,
    prefs,
    readNotifications: [],
    mistakes: [],
  };
}
