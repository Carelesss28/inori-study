"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/*
 * Two small SVG charts for the Grades tab, following the dataviz rules:
 * one 0–100% axis, recessive grid, 2px lines / thin bars with 4px rounded ends,
 * ≥8px markers with a 2px surface ring, a legend + direct labels for 2 series,
 * and a hover tooltip on every point/bar. Colours come from the validated
 * --c-chart-1 / --c-chart-2 tokens; text stays in ink tokens.
 */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const Y_TICKS = [0, 25, 50, 75, 100];

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x - 90, 0), Math.max(0, width - 180));
  return (
    <div className="card pointer-events-none absolute z-10 w-[11.25rem] px-3 py-2 text-xs shadow-lg" style={{ left, top: Math.max(0, y - 8), transform: "translateY(-100%)" }}>
      {children}
    </div>
  );
}

export interface LineSeries {
  name: string;
  color: string; // css var
  values: (number | null)[];
}

export function LineChart({
  labels,
  fullLabels,
  series,
  height = 240,
  caption,
  extra,
}: {
  labels: string[];
  fullLabels?: string[];
  series: LineSeries[];
  height?: number;
  caption: string;
  /** extra tooltip rows per x index */
  extra?: (i: number) => ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 42, r: series.length > 1 ? 92 : 16, t: 14, b: 34 };
  const w = Math.max(width, 240);
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const n = labels.length;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / 100) * ih;
  const step = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 70))));

  // direct labels sit beside each series' last point; push them apart if they'd overlap
  const labelY: (number | undefined)[] = series.map((s) => {
    const last = s.values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).pop();
    return last === undefined ? undefined : y(s.values[last]!) + 4;
  });
  for (let i = 1; i < labelY.length; i++) {
    const a = labelY[i - 1];
    const b = labelY[i];
    if (a !== undefined && b !== undefined && Math.abs(a - b) < 14) labelY[i] = a + (b >= a ? 14 : -14);
  }

  return (
    <figure className="min-w-0">
      {series.length > 1 && (
        <figcaption className="mb-2 flex flex-wrap gap-4 text-xs text-ink-soft" aria-label="Legend">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <div ref={ref} className="relative w-full" onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={w} height={height} role="img" aria-label={caption} className="block">
            {Y_TICKS.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--c-line)" strokeWidth={1} />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--c-ink-faint)">
                  {t}%
                </text>
              </g>
            ))}
            {labels.map((l, i) =>
              i % step === 0 || i === n - 1 ? (
                <text key={i} x={x(i)} y={height - 12} textAnchor="middle" fontSize={11} fill="var(--c-ink-faint)">
                  {l}
                </text>
              ) : null
            )}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--c-line-strong)" strokeWidth={1} />}
            {series.map((s, si) => {
              // break the line where a value is missing
              const segs: string[] = [];
              let cur = "";
              s.values.forEach((v, i) => {
                if (v === null) {
                  if (cur) segs.push(cur);
                  cur = "";
                } else cur += `${cur ? "L" : "M"}${x(i)},${y(v)}`;
              });
              if (cur) segs.push(cur);
              const lastIdx = s.values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).pop();
              return (
                <g key={s.name}>
                  {segs.map((d, k) => (
                    <path key={k} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  ))}
                  {s.values.map((v, i) =>
                    v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5.5 : 4} fill={s.color} stroke="var(--c-panel)" strokeWidth={2} />
                  )}
                  {series.length > 1 && lastIdx !== undefined && (
                    <text x={x(lastIdx) + 9} y={labelY[si] ?? y(s.values[lastIdx]!) + 4} fontSize={11} fontWeight={700} fill="var(--c-ink-soft)">
                      {s.name.length > 12 ? `${s.name.slice(0, 11)}…` : s.name}
                    </text>
                  )}
                </g>
              );
            })}
            {/* hit areas wider than the marks */}
            {labels.map((_, i) => {
              const half = n <= 1 ? iw / 2 : iw / (n - 1) / 2;
              return <rect key={i} x={x(i) - half} y={pad.t} width={half * 2} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />;
            })}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tooltip x={x(hover)} y={pad.t + 4} width={w}>
            <p className="mb-1 font-extrabold text-ink">{fullLabels?.[hover] ?? labels[hover]}</p>
            {series.map((s) => (
              <p key={s.name} className="flex items-center justify-between gap-2 text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <b className="tabular-nums text-ink">{s.values[hover] === null ? "—" : `${s.values[hover]}%`}</b>
              </p>
            ))}
            {extra?.(hover)}
          </Tooltip>
        )}
      </div>
    </figure>
  );
}

export function BarChart({
  labels,
  values,
  height = 220,
  caption,
  tooltip,
  onSelect,
}: {
  labels: string[];
  values: (number | null)[];
  height?: number;
  caption: string;
  tooltip: (i: number) => ReactNode;
  onSelect?: (i: number) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 42, r: 8, t: 14, b: 30 };
  const w = Math.max(width, 200);
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const n = Math.max(1, labels.length);
  const band = iw / n;
  const bw = Math.max(4, Math.min(28, band - 2)); // ≥2px surface gap between bars
  const y = (v: number) => pad.t + ih - (v / 100) * ih;
  const step = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 28))));

  return (
    <div ref={ref} className="relative w-full min-w-0" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={w} height={height} role="img" aria-label={caption} className="block">
          {Y_TICKS.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--c-line)" strokeWidth={1} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--c-ink-faint)">
                {t}%
              </text>
            </g>
          ))}
          {values.map((v, i) => {
            const cx = pad.l + band * i + band / 2;
            const h = v === null ? 0 : Math.max(v === 0 ? 0 : 2, (v / 100) * ih);
            const top = pad.t + ih - h;
            const r = Math.min(4, bw / 2, h);
            return (
              <g key={i}>
                {v !== null && h > 0 && (
                  <path
                    d={`M${cx - bw / 2},${pad.t + ih} V${top + r} Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top} H${cx + bw / 2 - r} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r} V${pad.t + ih} Z`}
                    fill="var(--c-chart-1)"
                    opacity={hover === null || hover === i ? 1 : 0.55}
                  />
                )}
                {v === null && <text x={cx} y={pad.t + ih - 4} textAnchor="middle" fontSize={10} fill="var(--c-ink-faint)">–</text>}
                {v === 0 && <text x={cx} y={pad.t + ih - 5} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--c-ink-soft)">0%</text>}
                {(i % step === 0 || i === n - 1) && (
                  <text x={cx} y={height - 10} textAnchor="middle" fontSize={11} fill="var(--c-ink-faint)">
                    {labels[i]}
                  </text>
                )}
                <rect
                  x={pad.l + band * i}
                  y={pad.t}
                  width={band}
                  height={ih}
                  fill="transparent"
                  className={onSelect ? "cursor-pointer" : undefined}
                  onMouseEnter={() => setHover(i)}
                  onClick={() => onSelect?.(i)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip x={pad.l + band * hover + band / 2} y={values[hover] === null ? pad.t + ih : y(values[hover]!)} width={w}>
          {tooltip(hover)}
        </Tooltip>
      )}
    </div>
  );
}
