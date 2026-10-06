"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { HintCat } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { Button, cx } from "@/components/ui/primitives";
import { Rich } from "@/components/ui/Rich";

const LETTERS = "ABCDEFGH";
const MAX_HINTS = 3;

/** Built-in hints for when the AI isn't available — they narrow things down without giving the answer. */
function offlineHint(q: Question, level: number): string {
  if (level === 1) {
    return q.type === "blank"
      ? "Paws for a sec 🐾 Re-read the question and spot the key word — which idea from the lesson does it point to?"
      : "Paws for a sec 🐾 Re-read the question and spot the key word. Which idea from the lesson is it really testing? Check each option against that idea.";
  }
  if (q.type === "blank") {
    const a = q.accepted[0] ?? "";
    return level === 2 ? `The answer is ${a.trim().split(/\s+/).length > 1 ? `${a.trim().split(/\s+/).length} words` : `${a.trim().length} characters long`}.` : `It starts with “${a.trim()[0] ?? "?"}”.`;
  }
  const wrong = q.options.map((_, i) => i).filter((i) => !q.correct.includes(i));
  const out = wrong.slice(0, level - 1);
  return out.length
    ? `Mochi is pretty sure ${out.map((i) => `option ${LETTERS[i]}`).join(" and ")} ${out.length > 1 ? "aren't" : "isn't"} it. Think about why, then decide.`
    : "Think about what makes each option true or false — the right one will fit the lesson's rule exactly.";
}

export function HintBuddy({ question, topic, disabled, onUse }: { question: Question; topic?: string; disabled?: boolean; onUse?: () => void }) {
  const [open, setOpen] = useState(false);
  const [hints, setHints] = useState<{ text: string; offline: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  const getHint = async () => {
    if (loading || hints.length >= MAX_HINTS) return;
    const level = (hints.length + 1) as 1 | 2 | 3;
    setLoading(true);
    if (hints.length === 0) onUse?.();
    let text: string | null = null;
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: question.prompt,
          type: question.type,
          options: question.options,
          correct: question.correct,
          accepted: question.accepted,
          explanation: question.explanation,
          topic,
          level,
          previousHints: hints.map((h) => h.text),
        }),
      });
      if (res.ok) text = ((await res.json()) as { hint?: string }).hint ?? null;
    } catch {
      // offline — fall through to the built-in hint
    }
    setHints((h) => [...h, text ? { text, offline: false } : { text: offlineHint(question, level), offline: true }]);
    setLoading(false);
  };

  if (disabled && !open) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open && hints.length === 0) getHint();
        }}
        aria-expanded={open}
        aria-label={open ? "Close Mochi's hints" : "Ask Mochi for a hint"}
        title="Stuck? Ask Mochi for a hint"
        className="group flex items-center gap-1.5 rounded-full border border-line bg-panel py-1 pl-1 pr-3 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-pink"
      >
        <HintCat thinking={loading} className={cx("h-9 w-9", loading && "animate-bounce")} />
        <span className="text-xs font-extrabold text-ink-soft group-hover:text-ink">{hints.length ? "Hints" : "Hint"}</span>
      </button>

      {open && (
        <div role="dialog" aria-label="Mochi's hints" className="card pop-in absolute right-0 top-12 z-30 w-[min(22rem,calc(100vw-3rem))] p-4">
          <div className="mb-2 flex items-center gap-2">
            <HintCat className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-ink">Mochi</p>
              <p className="text-[0.6875rem] text-ink-faint">Your hint buddy — nudges, never answers</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1 text-ink-faint hover:bg-panel-2 hover:text-ink">
              <Icon name="x" size={15} />
            </button>
          </div>

          <ol className="space-y-2">
            {hints.map((h, i) => (
              <li key={i} className="relative rounded-2xl rounded-tl-md bg-pink-soft/70 px-3 py-2 text-sm leading-relaxed text-ink">
                <span className="mb-0.5 block text-[0.625rem] font-extrabold uppercase tracking-wide text-pink-strong">
                  Hint {i + 1}
                  {h.offline && <span className="ml-1 font-semibold normal-case text-ink-faint">· simple hint</span>}
                </span>
                <Rich text={h.text} />
              </li>
            ))}
            {loading && (
              <li className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-pink-soft/50 px-3 py-2.5 text-xs font-semibold text-ink-soft" aria-live="polite">
                Mochi is thinking
                <span className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-strong" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </span>
              </li>
            )}
          </ol>

          {!disabled && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[0.6875rem] text-ink-faint">
                {hints.length}/{MAX_HINTS} hints
              </p>
              {hints.length < MAX_HINTS ? (
                <Button size="sm" variant="soft" icon="sparkle" onClick={getHint} disabled={loading}>
                  {hints.length ? "Another hint" : "Give me a hint"}
                </Button>
              ) : (
                <p className="text-xs font-semibold text-ink-soft">You&apos;ve got this! 🐾</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
