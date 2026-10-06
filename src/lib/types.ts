export type CoverArt =
  | "book"
  | "flask"
  | "battery"
  | "laptop"
  | "chart"
  | "bear"
  | "globe"
  | "palette"
  | "notebook";

export interface Module {
  id: string;
  title: string;
  description: string;
  cover: CoverArt;
  createdAt: number;
}

/** Inline text may contain $...$ math (KaTeX). */
export type Block =
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "math"; tex: string }
  | { t: "list"; items: string[] }
  | { t: "note"; text: string };

export interface NotePage {
  blocks: Block[];
}

export type LessonSource =
  | { kind: "notes"; pages: NotePage[] }
  | { kind: "pdf"; fileId: string; fileName: string; pageCount: number };

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  order: number;
  source: LessonSource;
}

export type QuestionType = "mcq" | "mcma" | "blank";

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  /** mcq / mcma choices */
  options: string[];
  /** indexes into options (mcq: exactly one) */
  correct: number[];
  /** accepted answers for blank questions */
  accepted: string[];
  marks: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  moduleId: string;
  lessonId: string | null;
  title: string;
  timeLimitMin: number;
  questions: Question[];
  createdAt: number;
}

export type AnswerValue = number[] | string;

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  earned: number;
}

export interface Attempt {
  id: string;
  quizId: string;
  startedAt: number;
  finishedAt: number;
  answers: Record<string, AnswerValue>;
  results: QuestionResult[];
  score: number; // 0-100
}

export interface ActiveAttempt {
  quizId: string;
  startedAt: number;
  answers: Record<string, AnswerValue>;
  current: number;
}

export interface LessonProgress {
  viewed: number[]; // 1-based page numbers
  lastPage: number;
  completed: boolean;
}

export interface PlanItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  minutes: number;
  done: boolean;
  href?: string;
}

export interface RecentItem {
  kind: "lesson" | "quiz";
  id: string;
  at: number;
}

export type ThemeName = "blossom" | "dusk" | "kitty" | "cinnamoroll" | "evergarden" | "sakura" | "cyberpunk";

export interface Profile {
  name: string;
  email: string;
  role: string;
  avatar: string | null; // data URL
  bio: string;
  /** true once the user typed their own name/email; until then they follow the default in seed.ts */
  customized?: boolean;
}

export interface Preferences {
  theme: ThemeName;
  /** text size multiplier, e.g. 1.125 = Large */
  fontScale: number;
  /** the person's own pictures, stored in IndexedDB (v bumps on re-upload) */
  customBg: { id: string; v: number; strength: number } | null;
  customMascot: { id: string; v: number } | null;
  /** falling petals, neon lights… per theme */
  ambience: boolean;
  /** Mochi the hint cat on questions */
  hints: boolean;
  reduceMotion: boolean;
  notifyPlan: boolean;
  notifyQuizzes: boolean;
  notifyMilestones: boolean;
  trackRecent: boolean;
}

/** Where a wrong answer came from — decides its group in the Revision notebook. */
export type MistakeSource =
  | { kind: "quiz"; quizId: string; quizTitle: string; moduleId: string; lessonId: string | null }
  | { kind: "class"; classId: string; className: string; setId: string; setTitle: string };

export interface Mistake {
  /** `${quizId|setId}:${questionId}` — one entry per question, however often it's missed */
  id: string;
  source: MistakeSource;
  /** copy of the question as it was answered, so later quiz edits don't change the record */
  question: Question;
  lastAnswer: AnswerValue | null;
  wrongCount: number;
  firstWrongAt: number;
  lastWrongAt: number;
  /** revision sessions in a row got right; 2 = mastered */
  streak: number;
  masteredAt: number | null;
}

export interface StudyState {
  version: 1;
  modules: Module[];
  lessons: Lesson[];
  quizzes: Quiz[];
  attempts: Attempt[];
  active: Record<string, ActiveAttempt>;
  lessonProgress: Record<string, LessonProgress>;
  plan: PlanItem[];
  recent: RecentItem[];
  profile: Profile;
  prefs: Preferences;
  readNotifications: string[];
  mistakes: Mistake[];
}
