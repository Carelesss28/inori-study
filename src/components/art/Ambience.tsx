"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { ThemeName } from "@/lib/types";

/* ------------------------------------------------------------------ shapes */

const Petal = ({ c }: { c: string }) => (
  <svg viewBox="0 0 20 22" width="100%" height="100%">
    <path d="M10 1 C8.5 3.5 7 2 6 3 C1 9 3 17 10 21 C17 17 19 9 14 3 C13 2 11.5 3.5 10 1Z" fill={c} />
    <path d="M10 6 V17" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" />
  </svg>
);
const Leaf = ({ c }: { c: string }) => (
  <svg viewBox="0 0 20 20" width="100%" height="100%">
    <path d="M2 18 C2 8 8 2 18 2 C18 12 12 18 2 18Z" fill={c} />
    <path d="M3 17 L15 5" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.2" />
  </svg>
);
const Heart = ({ c }: { c: string }) => (
  <svg viewBox="0 0 20 18" width="100%" height="100%">
    <path d="M10 17 C4 12.5 1 9.5 1 6 A4.5 4.5 0 0 1 10 4 A4.5 4.5 0 0 1 19 6 C19 9.5 16 12.5 10 17Z" fill={c} />
  </svg>
);
const Bow = ({ c }: { c: string }) => (
  <svg viewBox="0 0 24 14" width="100%" height="100%">
    <path d="M12 7 L2 1 Q0 7 2 13Z M12 7 L22 1 Q24 7 22 13Z" fill={c} />
    <circle cx="12" cy="7" r="2.6" fill={c} stroke="#fff" strokeOpacity="0.6" />
  </svg>
);
const Sparkle = ({ c }: { c: string }) => (
  <svg viewBox="0 0 20 20" width="100%" height="100%">
    <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" fill={c} />
  </svg>
);
const Cloud = ({ c }: { c: string }) => (
  <svg viewBox="0 0 64 30" width="100%" height="100%">
    <g fill={c}>
      <ellipse cx="20" cy="20" rx="16" ry="10" />
      <ellipse cx="34" cy="13" rx="14" ry="12" />
      <ellipse cx="47" cy="20" rx="15" ry="9" />
    </g>
  </svg>
);
const Letter = ({ c }: { c: string }) => (
  <svg viewBox="0 0 24 16" width="100%" height="100%">
    <rect x="1" y="1" width="22" height="14" rx="1.5" fill="#f6efe0" stroke={c} strokeWidth="1.3" />
    <path d="M1.5 2 L12 9.5 L22.5 2" fill="none" stroke={c} strokeWidth="1.3" />
    <circle cx="12" cy="9.5" r="2" fill="#a0303b" />
  </svg>
);
const Neon = ({ c }: { c: string }) => <span className="amb-neon block h-full w-full" style={{ color: c }} />;

/* ------------------------------------------------------------------ recipes */

type Motion = "fall" | "rise" | "drift" | "still";
type Inner = "sway" | "spin" | "bob" | "twinkle" | "flicker" | "none";

interface Layer {
  count: number;
  motion: Motion;
  inner: Inner;
  size: [number, number]; // px range
  duration: [number, number]; // seconds for the travel
  innerDuration: [number, number];
  opacity: number;
  shapes: ((c: string) => ReactNode)[];
  colors: string[];
}

const recipes: Record<ThemeName, Layer[]> = {
  blossom: [
    { count: 12, motion: "fall", inner: "sway", size: [13, 20], duration: [16, 26], innerDuration: [3, 5], opacity: 0.7, shapes: [(c) => <Petal c={c} />], colors: ["#f2b8c6", "#eaa3b6", "#f7cbd6"] },
    { count: 8, motion: "still", inner: "twinkle", size: [8, 12], duration: [0, 0], innerDuration: [3, 6], opacity: 0.8, shapes: [(c) => <Sparkle c={c} />], colors: ["#ffffff", "#e8d6f0"] },
  ],
  dusk: [
    { count: 30, motion: "still", inner: "twinkle", size: [4, 10], duration: [0, 0], innerDuration: [2.5, 6], opacity: 0.9, shapes: [(c) => <Sparkle c={c} />], colors: ["#fff7e6", "#e8dcff", "#ffd6e2"] },
  ],
  kitty: [
    { count: 10, motion: "rise", inner: "bob", size: [12, 20], duration: [18, 28], innerDuration: [3, 5], opacity: 0.75, shapes: [(c) => <Heart c={c} />], colors: ["#ff8fab", "#ffb3c6", "#e8344e"] },
    { count: 5, motion: "rise", inner: "bob", size: [18, 24], duration: [22, 30], innerDuration: [3, 5], opacity: 0.8, shapes: [(c) => <Bow c={c} />], colors: ["#e8344e", "#ff6f91"] },
  ],
  cinnamoroll: [
    { count: 6, motion: "drift", inner: "bob", size: [70, 120], duration: [45, 80], innerDuration: [5, 8], opacity: 0.45, shapes: [(c) => <Cloud c={c} />], colors: ["#ffffff"] },
    { count: 14, motion: "still", inner: "twinkle", size: [7, 12], duration: [0, 0], innerDuration: [3, 6], opacity: 0.9, shapes: [(c) => <Sparkle c={c} />], colors: ["#ffffff", "#cfe2fb"] },
  ],
  evergarden: [
    { count: 22, motion: "still", inner: "twinkle", size: [4, 9], duration: [0, 0], innerDuration: [3, 7], opacity: 0.85, shapes: [(c) => <Sparkle c={c} />], colors: ["#e6c27f", "#f4ead6"] },
    { count: 4, motion: "fall", inner: "sway", size: [22, 28], duration: [28, 40], innerDuration: [5, 7], opacity: 0.85, shapes: [(c) => <Letter c={c} />], colors: ["#c9a24c"] },
  ],
  sakura: [
    { count: 16, motion: "fall", inner: "sway", size: [14, 22], duration: [13, 22], innerDuration: [2.5, 4.5], opacity: 0.85, shapes: [(c) => <Petal c={c} />], colors: ["#f6b6c4", "#f1a7b8", "#fbd3dc"] },
    { count: 6, motion: "fall", inner: "spin", size: [12, 18], duration: [15, 24], innerDuration: [6, 10], opacity: 0.8, shapes: [(c) => <Leaf c={c} />], colors: ["#8fae7e", "#a9c48f"] },
  ],
  cyberpunk: [
    { count: 22, motion: "rise", inner: "flicker", size: [3, 6], duration: [14, 26], innerDuration: [2, 5], opacity: 0.9, shapes: [(c) => <Neon c={c} />], colors: ["#00e5ff", "#ff2bd6", "#3dff9e"] },
  ],
};

/* ------------------------------------------------------------------ render */

/** Deterministic pseudo-random numbers, so particles don't jump around on re-render. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const innerAnim: Record<Inner, string> = {
  sway: "amb-sway",
  spin: "amb-spin",
  bob: "amb-bob",
  twinkle: "amb-twinkle",
  flicker: "amb-flicker",
  none: "",
};

export function Ambience({ theme }: { theme: ThemeName }) {
  const particles = useMemo(() => {
    const rnd = seeded(theme.length * 977 + theme.charCodeAt(0));
    const between = ([a, b]: [number, number]) => a + rnd() * (b - a);
    return recipes[theme].flatMap((layer, li) =>
      Array.from({ length: layer.count }, (_, i) => {
        const size = between(layer.size);
        const dur = between(layer.duration);
        const style: CSSProperties = { width: size, height: size, opacity: layer.opacity };
        if (layer.motion === "still") {
          Object.assign(style, { left: `${rnd() * 100}%`, top: `${rnd() * 100}%` });
        } else if (layer.motion === "drift") {
          Object.assign(style, { left: 0, top: `${5 + rnd() * 70}%`, height: size * 0.47, animation: `amb-drift ${dur}s linear ${-rnd() * dur}s infinite` });
        } else {
          Object.assign(style, {
            left: `${rnd() * 100}%`,
            animation: `amb-${layer.motion} ${dur}s linear ${-rnd() * dur}s infinite`,
            "--dx": `${(rnd() - 0.5) * 30}vw`,
          });
        }
        const innerDur = between(layer.innerDuration);
        const innerStyle: CSSProperties = innerAnim[layer.inner]
          ? { width: "100%", height: "100%", animation: `${innerAnim[layer.inner]} ${innerDur}s ease-in-out ${-rnd() * innerDur}s infinite` }
          : { width: "100%", height: "100%" };
        const shape = layer.shapes[Math.floor(rnd() * layer.shapes.length)];
        const color = layer.colors[Math.floor(rnd() * layer.colors.length)];
        return { key: `${li}-${i}`, style, innerStyle, node: shape(color) };
      })
    );
  }, [theme]);

  return (
    <div className="ambience" aria-hidden="true">
      {particles.map((p) => (
        <span key={p.key} className="amb" style={p.style}>
          <span style={p.innerStyle}>{p.node}</span>
        </span>
      ))}
    </div>
  );
}
