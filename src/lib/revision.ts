import { normalizeBlank } from "./grading";
import type { AnswerValue, Mistake, MistakeSource, Question, QuestionResult, StudyState } from "./types";

/** Two revision sessions in a row answered right = mastered. */
export const MASTERY_STREAK = 2;
const MAX_MISTAKES_PER_SESSION = 8;

/* ------------------------------------------------------------------ recording */

export interface AnsweredItem {
  question: Question;
  answer: AnswerValue | undefined;
  correct: boolean;
}

export function sourceKey(source: MistakeSource) {
  return source.kind === "quiz" ? source.quizId : source.setId;
}

/** Folds a finished quiz/set into the notebook: wrong answers are added, right ones move mastery along. */
export function noteResults(mistakes: Mistake[], source: MistakeSource, items: AnsweredItem[], now = Date.now()): Mistake[] {
  const byId = new Map(mistakes.map((m) => [m.id, m]));
  for (const it of items) {
    const id = `${sourceKey(source)}:${it.question.id}`;
    const prev = byId.get(id);
    if (!it.correct) {
      byId.set(id, {
        id,
        source,
        question: it.question,
        lastAnswer: it.answer ?? null,
        wrongCount: (prev?.wrongCount ?? 0) + 1,
        firstWrongAt: prev?.firstWrongAt ?? now,
        lastWrongAt: now,
        streak: 0,
        masteredAt: null,
      });
    } else if (prev && !prev.masteredAt) {
      const streak = prev.streak + 1;
      byId.set(id, { ...prev, streak, masteredAt: streak >= MASTERY_STREAK ? now : null });
    }
  }
  return [...byId.values()];
}

/** Builds the notebook from existing quiz history (latest attempt per quiz) the first time it's needed. */
export function mistakesFromHistory(state: Pick<StudyState, "quizzes" | "attempts">): Mistake[] {
  let out: Mistake[] = [];
  for (const quiz of state.quizzes) {
    const attempts = state.attempts.filter((a) => a.quizId === quiz.id).sort((a, b) => a.finishedAt - b.finishedAt);
    const last = attempts[attempts.length - 1];
    if (!last) continue;
    const items = quiz.questions
      .map((q) => ({ question: q, answer: last.answers[q.id], correct: !!last.results.find((r) => r.questionId === q.id)?.correct }))
      .filter((it) => !it.correct);
    out = noteResults(out, { kind: "quiz", quizId: quiz.id, quizTitle: quiz.title, moduleId: quiz.moduleId, lessonId: quiz.lessonId }, items, last.finishedAt);
  }
  return out;
}

/* ------------------------------------------------------------------ variants */

function seeded(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], rnd: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const quote = (s: string) => `“${s}”`;
const typeable = (s: string) => !s.includes("$") && s.trim().length > 0 && s.trim().length <= 28;

function base(q: Question, suffix: string): Question {
  return { ...q, id: `${q.id}::${suffix}`, marks: 1 };
}

function shuffled(q: Question, rnd: () => number): Question {
  if (q.type === "blank") return base(q, "recall");
  const order = shuffle(q.options.map((_, i) => i), rnd);
  return {
    ...base(q, "shuffle"),
    marks: q.marks,
    options: order.map((i) => q.options[i]),
    correct: order.flatMap((orig, newIdx) => (q.correct.includes(orig) ? [newIdx] : [])).sort((a, b) => a - b),
  };
}

function trueFalse(q: Question, statement: string, isTrue: boolean, framing: string, suffix: string): Question {
  return {
    ...base(q, suffix),
    type: "mcq",
    prompt: `True or false? ${framing.replace("{q}", quote(q.prompt)).replace("{a}", statement)}`,
    options: ["True", "False"],
    correct: [isTrue ? 0 : 1],
    accepted: [],
    explanation: q.explanation,
  };
}

function answerText(q: Question) {
  return q.type === "blank" ? q.accepted[0] ?? "" : q.correct.map((i) => q.options[i]).join(", ");
}

/** New ways to ask the same thing, so revision tests understanding, not memory of letter positions. */
export function variantsFor(q: Question, distractorPool: string[], rnd: () => number): Question[] {
  const out: Question[] = [];
  const explain = (x: Question) => ({ ...x, explanation: [q.explanation, `Answer: ${answerText(q)}.`].filter(Boolean).join(" ") });

  if (q.type === "mcq") {
    const right = q.options[q.correct[0]];
    const wrongs = q.options.filter((_, i) => !q.correct.includes(i));
    const useTrue = rnd() < 0.5 || wrongs.length === 0;
    const stmt = useTrue ? right : wrongs[Math.floor(rnd() * wrongs.length)];
    out.push(explain(trueFalse(q, stmt, useTrue, "For {q}, the answer is {a}.", "tf")));
    if (typeable(right)) out.push(explain({ ...base(q, "type"), type: "blank", prompt: `${q.prompt} — type the answer.`, options: [], correct: [], accepted: [right] }));
    if (wrongs.length >= 2) {
      const pick = shuffle(wrongs, rnd).slice(0, 2);
      const opts = shuffle([right, ...pick], rnd);
      out.push(
        explain({
          ...base(q, "not"),
          type: "mcma",
          prompt: `Which of these are NOT the answer to ${quote(q.prompt)}? Select all that apply.`,
          options: opts,
          correct: opts.flatMap((o, i) => (o === right ? [] : [i])),
          accepted: [],
        })
      );
    }
  } else if (q.type === "mcma") {
    const rights = q.correct.map((i) => q.options[i]);
    const wrongs = q.options.filter((_, i) => !q.correct.includes(i));
    const all = q.options.map((o, i) => ({ o, ok: q.correct.includes(i) }));
    const pickOne = all[Math.floor(rnd() * all.length)];
    out.push(explain(trueFalse(q, quote(pickOne.o), pickOne.ok, "{a} is one of the correct answers to {q}.", "tf")));
    if (wrongs.length >= 1) {
      const one = rights[Math.floor(rnd() * rights.length)];
      const opts = shuffle([one, ...shuffle(wrongs, rnd).slice(0, 3)], rnd);
      out.push(
        explain({
          ...base(q, "one"),
          type: "mcq",
          prompt: `Which ONE of these is a correct answer to ${quote(q.prompt)}?`,
          options: opts,
          correct: [opts.indexOf(one)],
          accepted: [],
        })
      );
    }
  } else {
    const answer = q.accepted[0] ?? "";
    const distractors = shuffle(
      Array.from(new Set(distractorPool.filter((d) => d && !q.accepted.some((a) => normalizeBlank(a) === normalizeBlank(d))))),
      rnd
    ).slice(0, 3);
    if (distractors.length >= 2) {
      const opts = shuffle([answer, ...distractors], rnd);
      out.push(explain({ ...base(q, "choose"), type: "mcq", prompt: `${q.prompt} — choose the answer.`, options: opts, correct: [opts.indexOf(answer)], accepted: [] }));
    }
    const useTrue = rnd() < 0.5 || distractors.length === 0;
    out.push(explain(trueFalse(q, quote(useTrue ? answer : distractors[0]), useTrue, "The answer to {q} is {a}.", "tf")));
  }
  return out;
}

/* ------------------------------------------------------------------ sessions */

export interface RevisionSession {
  questions: Question[];
  /** session question id → mistake id */
  owner: Record<string, string>;
  mistakeIds: string[];
}

/**
 * Picks the mistakes that need it most (missed most, then longest ago), asks each one once as
 * a shuffled original, then again later as a variant — spaced, so it isn't the same question twice in a row.
 */
export function buildSession(mistakes: Mistake[], seed: number): RevisionSession {
  const rnd = seeded(seed);
  const chosen = [...mistakes]
    .filter((m) => !m.masteredAt)
    .sort((a, b) => b.wrongCount - a.wrongCount || a.lastWrongAt - b.lastWrongAt)
    .slice(0, MAX_MISTAKES_PER_SESSION);
  const pool = mistakes.flatMap((m) => (m.question.type === "blank" ? m.question.accepted.slice(0, 1) : m.question.options.filter((o) => typeable(o))));

  const first: Question[] = [];
  const second: Question[] = [];
  const owner: Record<string, string> = {};
  for (const m of shuffle(chosen, rnd)) {
    const orig = shuffled(m.question, rnd);
    first.push(orig);
    owner[orig.id] = m.id;
    const vs = variantsFor(m.question, pool, rnd);
    if (vs.length) {
      const v = vs[Math.floor(rnd() * vs.length)];
      second.push(v);
      owner[v.id] = m.id;
    }
  }
  return { questions: [...first, ...shuffle(second, rnd)], owner, mistakeIds: chosen.map((m) => m.id) };
}

/** A mistake moves towards mastery only if every question about it was right this session. */
export function applyRevision(mistakes: Mistake[], session: RevisionSession, results: QuestionResult[], answers: Record<string, AnswerValue>, now = Date.now()): Mistake[] {
  const perMistake = new Map<string, boolean>();
  const lastAnswer = new Map<string, AnswerValue>();
  for (const r of results) {
    const mid = session.owner[r.questionId];
    if (!mid) continue;
    perMistake.set(mid, (perMistake.get(mid) ?? true) && r.correct);
    if (r.questionId.endsWith("::shuffle") || r.questionId.endsWith("::recall")) lastAnswer.set(mid, answers[r.questionId]);
  }
  return mistakes.map((m) => {
    if (!perMistake.has(m.id)) return m;
    if (perMistake.get(m.id)) {
      const streak = m.streak + 1;
      return { ...m, streak, masteredAt: streak >= MASTERY_STREAK ? now : null };
    }
    return { ...m, streak: 0, wrongCount: m.wrongCount + 1, lastWrongAt: now, lastAnswer: lastAnswer.get(m.id) ?? m.lastAnswer };
  });
}

/* ------------------------------------------------------------------ grouping */

export type Scope =
  | { kind: "all" }
  | { kind: "module"; id: string }
  | { kind: "lesson"; moduleId: string; lessonId: string | null }
  | { kind: "quiz"; id: string }
  | { kind: "class"; id: string }
  | { kind: "set"; id: string };

export function scopeToParam(s: Scope) {
  switch (s.kind) {
    case "all":
      return "all";
    case "lesson":
      return `lesson:${s.moduleId}:${s.lessonId ?? "none"}`;
    default:
      return `${s.kind}:${s.id}`;
  }
}

export function parseScope(param: string | null): Scope {
  const [kind, a, b] = (param ?? "all").split(":");
  if (kind === "module" && a) return { kind, id: a };
  if (kind === "lesson" && a) return { kind, moduleId: a, lessonId: b && b !== "none" ? b : null };
  if ((kind === "quiz" || kind === "class" || kind === "set") && a) return { kind, id: a };
  return { kind: "all" };
}

export function inScope(m: Mistake, s: Scope): boolean {
  const src = m.source;
  switch (s.kind) {
    case "all":
      return true;
    case "module":
      return src.kind === "quiz" && src.moduleId === s.id;
    case "lesson":
      return src.kind === "quiz" && src.moduleId === s.moduleId && src.lessonId === s.lessonId;
    case "quiz":
      return src.kind === "quiz" && src.quizId === s.id;
    case "class":
      return src.kind === "class" && src.classId === s.id;
    case "set":
      return src.kind === "class" && src.setId === s.id;
  }
}
