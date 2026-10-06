import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";

/*
 * Mochi, the hint cat. Gives a nudge (an analogy, a guiding question, what to think about)
 * without ever revealing the answer. Runs on Google Gemini. Server-only: the API key never reaches the browser.
 */

// override with GEMINI_MODEL, e.g. "gemini-3.5-flash-lite" for the cheapest option
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const LETTERS = "ABCDEFGH";

interface HintRequest {
  prompt: string;
  type: "mcq" | "mcma" | "blank";
  options: string[];
  /** indexes into options, in the order the student sees them */
  correct: number[];
  accepted: string[];
  explanation?: string;
  topic?: string;
  level: 1 | 2 | 3;
  previousHints: string[];
}

const SYSTEM = `You are Mochi, a cheerful study-buddy cat inside a learning app. A student is stuck on a question and tapped you for a hint.

Your job is to help them get closer to the answer on their own. You are given the correct answer only so your hint points the right way. Never reveal it.

Never:
- state, quote, paraphrase or spell out the correct answer, or any part of it that would give it away
- name, hint at or rule in the correct option by its letter, position or wording
- say which options are right or wrong, or eliminate options for them
- solve the question fully

Instead, use one of: a short everyday analogy, a guiding question, the key idea or rule to recall, or the first step of the reasoning. Match the hint level:
- Level 1: a gentle nudge or analogy about the underlying idea.
- Level 2: more focused; point at the exact concept or step that matters.
- Level 3: the strongest hint that still leaves the final step to the student.
Each new hint must add something beyond the previous hints, not repeat them.

Style: warm and encouraging, 2-4 short sentences, plain language. You may use $...$ for maths. At most one small cat touch (like "paws for a sec" or a single 🐾), never more. Reply with the hint only.`;

/* ---------------------------------------------------------------- guards */

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\$|\\[a-z]+|[{}\\]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** True if the hint gives away the answer: names a correct letter or contains a correct answer's text. */
function leaks(hint: string, q: HintRequest): boolean {
  const h = ` ${norm(hint)} `;
  const prompt = ` ${norm(q.prompt)} `;
  const answers = q.type === "blank" ? q.accepted : q.correct.map((i) => q.options[i] ?? "");
  for (const a of answers) {
    const n = norm(a);
    // skip answers too short to check reliably, or words the question itself already uses
    if (n.length < 2 || prompt.includes(` ${n} `)) continue;
    if (h.includes(` ${n} `)) return true;
  }
  if (q.type !== "blank") {
    for (const i of q.correct) {
      const L = LETTERS[i];
      if (new RegExp(`\\b(option|answer|choice|pick|choose|select)\\s*\\(?${L}\\)?\\b`, "i").test(hint) || new RegExp(`\\(${L}\\)`).test(hint)) return true;
    }
  }
  return /\b(the|correct) answer is\b/i.test(hint);
}

/* ---------------------------------------------------------------- rate limit (per instance, best effort) */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function limited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

/* ---------------------------------------------------------------- handler */

function validate(body: unknown): HintRequest | null {
  const b = body as Partial<HintRequest>;
  if (!b || typeof b.prompt !== "string" || !b.prompt.trim() || b.prompt.length > 2000) return null;
  if (b.type !== "mcq" && b.type !== "mcma" && b.type !== "blank") return null;
  const options = Array.isArray(b.options) ? b.options.slice(0, 8).map((o) => String(o).slice(0, 500)) : [];
  const correct = Array.isArray(b.correct) ? b.correct.filter((i) => Number.isInteger(i) && i >= 0 && i < options.length) : [];
  const accepted = Array.isArray(b.accepted) ? b.accepted.slice(0, 10).map((a) => String(a).slice(0, 200)) : [];
  if (b.type === "blank" ? accepted.length === 0 : options.length < 2 || correct.length === 0) return null;
  const level = b.level === 2 || b.level === 3 ? b.level : 1;
  const previousHints = Array.isArray(b.previousHints) ? b.previousHints.slice(0, 3).map((h) => String(h).slice(0, 800)) : [];
  return {
    prompt: b.prompt,
    type: b.type,
    options,
    correct,
    accepted,
    explanation: typeof b.explanation === "string" ? b.explanation.slice(0, 1500) : undefined,
    topic: typeof b.topic === "string" ? b.topic.slice(0, 200) : undefined,
    level,
    previousHints,
  };
}

function questionBlock(q: HintRequest) {
  const lines = [q.topic ? `Topic: ${q.topic}` : null, `Question type: ${q.type === "mcq" ? "multiple choice (one answer)" : q.type === "mcma" ? "multiple choice (select all that apply)" : "fill in the blank"}`, `Question: ${q.prompt}`];
  if (q.type !== "blank") lines.push("Options as the student sees them:", ...q.options.map((o, i) => `${LETTERS[i]}. ${o}`));
  lines.push(
    "",
    "Correct answer (for your eyes only, never reveal): " +
      (q.type === "blank" ? q.accepted.join(" / ") : q.correct.map((i) => `${LETTERS[i]}. ${q.options[i]}`).join("; "))
  );
  if (q.explanation) lines.push(`Teacher's explanation (for your eyes only): ${q.explanation}`);
  if (q.previousHints.length) lines.push("", "Hints already given (don't repeat these):", ...q.previousHints.map((h, i) => `${i + 1}. ${h}`));
  lines.push("", `Give a level ${q.level} hint.`);
  return lines.filter((l) => l !== null).join("\n");
}

async function ask(ai: GoogleGenAI, q: HintRequest, stricter: boolean) {
  const retryNote = "Your previous draft gave the answer away. Write a new hint that only points to the idea, without naming any answer or option.";
  const contents = stricter ? `${questionBlock(q)}\n\n${retryNote}` : questionBlock(q);
  const res = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: SYSTEM,
      maxOutputTokens: 2000,
      // a short tutoring reply: light thinking keeps it quick
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });
  if (res.promptFeedback?.blockReason) return null;
  return res.text?.trim() || null;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const q = validate(body);
  if (!q) return Response.json({ error: "bad_request" }, { status: 400 });

  const ai = new GoogleGenAI({ apiKey });
  try {
    let hint = await ask(ai, q, false);
    if (hint && leaks(hint, q)) hint = await ask(ai, q, true);
    if (!hint || leaks(hint, q)) {
      return Response.json({ hint: "Paws for a sec 🐾 Re-read the question slowly and ask yourself which key idea from the lesson it's really testing, then check each option against that idea." });
    }
    return Response.json({ hint });
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) return Response.json({ error: "busy" }, { status: 429 });
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return Response.json({ error: "not_configured" }, { status: 503 });
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
