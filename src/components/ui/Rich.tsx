"use client";

import katex from "katex";
import { memo, useMemo } from "react";

function tex(src: string, displayMode: boolean) {
  return katex.renderToString(src, { throwOnError: false, displayMode, output: "html" });
}

/** Renders text with inline `$math$` and `` `code` `` segments. */
export const Rich = memo(function Rich({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => text.split(/(\$[^$]+\$|`[^`]+`)/g).filter(Boolean), [text]);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.length > 2 && part.startsWith("$") && part.endsWith("$")) {
          return <span key={i} dangerouslySetInnerHTML={{ __html: tex(part.slice(1, -1), false) }} />;
        }
        if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="rounded-md bg-lav-soft px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
});

export const MathBlock = memo(function MathBlock({ src }: { src: string }) {
  const html = useMemo(() => tex(src, true), [src]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
});
