import type { AnswerValue, Question, QuestionResult, QuestionType, Quiz } from "./types";

export function normalizeBlank(s: string) {
  return s
    .toLowerCase()
    .replace(/[−–]/g, "-")
    .replace(/[\s$,]/g, "")
    .replace(/%$/, "");
}

export function isAnswered(q: Question, a: AnswerValue | undefined) {
  if (a === undefined) return false;
  if (q.type === "blank") return typeof a === "string" && a.trim().length > 0;
  return Array.isArray(a) && a.length > 0;
}

export function gradeQuestion(q: Question, a: AnswerValue | undefined): QuestionResult {
  let correct = false;
  if (q.type === "blank") {
    const given = typeof a === "string" ? normalizeBlank(a) : "";
    correct = given.length > 0 && q.accepted.some((acc) => normalizeBlank(acc) === given);
  } else if (Array.isArray(a)) {
    const want = [...q.correct].sort().join(",");
    const got = [...a].sort().join(",");
    correct = want === got;
  }
  return { questionId: q.id, correct, earned: correct ? q.marks : 0 };
}

export function gradeQuiz(quiz: Quiz, answers: Record<string, AnswerValue>) {
  return gradeQuestions(quiz.questions, answers);
}

export function gradeQuestions(questions: Question[], answers: Record<string, AnswerValue>) {
  const results = questions.map((q) => gradeQuestion(q, answers[q.id]));
  const total = questions.reduce((s, q) => s + q.marks, 0);
  const earned = results.reduce((s, r) => s + r.earned, 0);
  const score = total === 0 ? 0 : Math.round((earned / total) * 100);
  return { results, score };
}

export const typeLabel: Record<QuestionType, string> = {
  mcq: "MCQ",
  mcma: "MCMA",
  blank: "Blank",
};

export function quizTypesLabel(quiz: { questions: Question[] }) {
  const types = (["mcq", "mcma", "blank"] as QuestionType[]).filter((t) =>
    quiz.questions.some((q) => q.type === t)
  );
  if (types.length === 3) return "MCQ / MCMA / Blank";
  return types.map((t) => typeLabel[t]).join(" / ") || "No questions yet";
}
