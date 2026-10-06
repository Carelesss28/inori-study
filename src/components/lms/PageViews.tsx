"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { NotePage } from "@/lib/types";
import { renderPdfPage } from "@/lib/pdf";
import { MathBlock, Rich } from "@/components/ui/Rich";

const BASE_WIDTH = 720;
export const PAGE_RATIO = 1.414;

/** A written-notes page drawn as a sheet of paper; everything scales with `width`. */
export function NotesPageView({ page, width }: { page: NotePage; width: number }) {
  const scale = width / BASE_WIDTH;
  return (
    <div className="paper rounded-md" style={{ width, minHeight: width * PAGE_RATIO, fontSize: 17 * scale, padding: `${56 * scale}px ${64 * scale}px` }}>
      {page.blocks.map((b, i) => {
        switch (b.t) {
          case "h":
            return (
              <h2 key={i} className="font-extrabold" style={{ fontSize: "1.35em", margin: i === 0 ? "0 0 0.8em" : "1.4em 0 0.7em" }}>
                <Rich text={b.text} />
              </h2>
            );
          case "p":
            return (
              <p key={i} style={{ margin: "0 0 0.8em", lineHeight: 1.65 }}>
                <Rich text={b.text} />
              </p>
            );
          case "math":
            return <MathBlock key={i} src={b.tex} />;
          case "list":
            return (
              <ul key={i} className="list-disc" style={{ margin: "0 0 0.9em", paddingLeft: "1.5em", lineHeight: 1.7 }}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Rich text={it} />
                  </li>
                ))}
              </ul>
            );
          case "note":
            return (
              <p key={i} className="rounded-lg" style={{ margin: "1em 0", padding: "0.7em 1em", background: "#f7e1e7", borderLeft: `${4 * scale}px solid #e8a3b1`, lineHeight: 1.6 }}>
                <Rich text={b.text} />
              </p>
            );
        }
      })}
    </div>
  );
}

/** One PDF page, rendered lazily when it scrolls near the viewport and re-rendered on zoom. */
export function PdfPageView({ doc, pageNumber, width, eager = false }: { doc: PDFDocumentProxy; pageNumber: number; width: number; eager?: boolean }) {
  const holder = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [height, setHeight] = useState(width * PAGE_RATIO);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (eager || visible) return;
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [eager, visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    renderPdfPage(doc, pageNumber, width)
      .then((canvas) => {
        if (cancelled || !holder.current) return;
        canvas.className = "block rounded-md";
        holder.current.replaceChildren(canvas);
        setHeight(parseFloat(canvas.style.height));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber, width, visible]);

  return (
    <div className="paper relative overflow-hidden rounded-md" style={{ width, height }}>
      <div ref={holder} className="h-full w-full" />
      {failed && <p className="absolute inset-0 flex items-center justify-center text-xs text-[#a79db7]">Couldn&apos;t render page {pageNumber}</p>}
    </div>
  );
}
