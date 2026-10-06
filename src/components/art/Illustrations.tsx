import type { SVGProps } from "react";
import type { CoverArt } from "@/lib/types";

/* Palette lifted from the reference room: plum outlines, cream fur, blush pink, dusty lilac. */
const OUT = "#6b5870";
const FUR = "#fdf1ea";
const BLUSH = "#f3a6b6";
const EAR = "#f7c6cf";
const LILAC = "#b9aed0";
const PINK = "#eeb5c1";
const LEAF = "#9cc4a8";
const LEAF_D = "#7fae93";
const WOOD = "#e8c9b5";

const stroke = { stroke: OUT, strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

type ArtProps = { className?: string };
type Place = Pick<SVGProps<SVGSVGElement>, "x" | "y" | "width" | "height">;

/* ------------------------------------------------------------------ bits */

function Face({ cx, cy, s = 1, sleepy = false, wink = false }: { cx: number; cy: number; s?: number; sleepy?: boolean; wink?: boolean }) {
  const eye = (x: number, closed: boolean) =>
    closed ? (
      <path d={`M${x - 3.5 * s} ${cy} q${3.5 * s} ${3 * s} ${7 * s} 0`} fill="none" {...stroke} strokeWidth={1.8 * s} />
    ) : (
      <ellipse cx={x} cy={cy} rx={2.4 * s} ry={3 * s} fill="#3d3140" />
    );
  return (
    <g>
      {eye(cx - 12 * s, sleepy)}
      {eye(cx + 12 * s, sleepy || wink)}
      <ellipse cx={cx - 18 * s} cy={cy + 7 * s} rx={5.5 * s} ry={3.2 * s} fill={BLUSH} opacity={0.75} />
      <ellipse cx={cx + 18 * s} cy={cy + 7 * s} rx={5.5 * s} ry={3.2 * s} fill={BLUSH} opacity={0.75} />
      <path
        d={`M${cx - 4 * s} ${cy + 5 * s} q${2 * s} ${2.6 * s} ${4 * s} 0 q${2 * s} ${2.6 * s} ${4 * s} 0`}
        fill="none"
        {...stroke}
        strokeWidth={1.6 * s}
      />
    </g>
  );
}

function BearHead({ cx, cy, s = 1, sleepy, wink }: { cx: number; cy: number; s?: number; sleepy?: boolean; wink?: boolean }) {
  return (
    <g>
      <circle cx={cx - 25 * s} cy={cy - 20 * s} r={10 * s} fill={FUR} {...stroke} />
      <circle cx={cx + 25 * s} cy={cy - 20 * s} r={10 * s} fill={FUR} {...stroke} />
      <circle cx={cx - 25 * s} cy={cy - 20 * s} r={5 * s} fill={EAR} />
      <circle cx={cx + 25 * s} cy={cy - 20 * s} r={5 * s} fill={EAR} />
      <ellipse cx={cx} cy={cy} rx={33 * s} ry={27 * s} fill={FUR} {...stroke} />
      <Face cx={cx} cy={cy + 1 * s} s={s} sleepy={sleepy} wink={wink} />
    </g>
  );
}

function BunnyHead({ cx, cy, s = 1, sleepy }: { cx: number; cy: number; s?: number; sleepy?: boolean }) {
  return (
    <g>
      <ellipse cx={cx - 12 * s} cy={cy - 30 * s} rx={8 * s} ry={20 * s} fill={FUR} {...stroke} transform={`rotate(-12 ${cx - 12 * s} ${cy - 30 * s})`} />
      <ellipse cx={cx + 12 * s} cy={cy - 30 * s} rx={8 * s} ry={20 * s} fill={FUR} {...stroke} transform={`rotate(12 ${cx + 12 * s} ${cy - 30 * s})`} />
      <ellipse cx={cx - 12 * s} cy={cy - 28 * s} rx={3.5 * s} ry={13 * s} fill={EAR} transform={`rotate(-12 ${cx - 12 * s} ${cy - 28 * s})`} />
      <ellipse cx={cx + 12 * s} cy={cy - 28 * s} rx={3.5 * s} ry={13 * s} fill={EAR} transform={`rotate(12 ${cx + 12 * s} ${cy - 28 * s})`} />
      <ellipse cx={cx} cy={cy} rx={30 * s} ry={25 * s} fill={FUR} {...stroke} />
      <Face cx={cx} cy={cy + 1 * s} s={0.92 * s} sleepy={sleepy} />
    </g>
  );
}

function Pot({ x, y, s = 1, color = PINK, kind = "leafy" }: { x: number; y: number; s?: number; color?: string; kind?: "leafy" | "cactus" | "tulip" }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {kind === "leafy" && (
        <g {...stroke} strokeWidth={1.8}>
          <path d="M0 -14 C-18 -22 -20 -40 -8 -46 C-2 -36 -2 -24 0 -14Z" fill={LEAF} />
          <path d="M0 -14 C16 -24 22 -40 12 -48 C4 -38 2 -26 0 -14Z" fill={LEAF_D} />
          <path d="M0 -14 C-4 -30 0 -50 6 -58 C10 -44 6 -28 0 -14Z" fill={LEAF} />
        </g>
      )}
      {kind === "cactus" && (
        <g {...stroke} strokeWidth={1.8}>
          <rect x={-7} y={-40} width={14} height={30} rx={7} fill={LEAF} />
          <path d="M-7 -24 h-6 a4 4 0 0 1 -4 -4 v-6" fill="none" />
          <path d="M7 -20 h5 a4 4 0 0 0 4 -4 v-4" fill="none" />
          <circle cx={0} cy={-42} r={3} fill={PINK} />
        </g>
      )}
      {kind === "tulip" && (
        <g {...stroke} strokeWidth={1.8}>
          <path d="M-5 -12 V-34 M5 -12 V-40" fill="none" />
          <path d="M-11 -36 q6 -12 12 0 q-6 6 -12 0Z" fill="#f08ea3" />
          <path d="M-1 -42 q6 -12 12 0 q-6 6 -12 0Z" fill="#f4a6b6" />
          <path d="M-5 -22 q-8 -2 -10 -8" fill="none" />
        </g>
      )}
      <path d="M-14 -14 H14 L10 8 H-10 Z" fill={color} {...stroke} strokeWidth={1.8} />
      <path d="M-15 -14 H15" {...stroke} strokeWidth={1.8} />
      <path d="M-4 -3 l2 -3 l2 3 l3 0 l-2.5 2 l1 3 l-3.5 -2 l-3.5 2 l1 -3 l-2.5 -2Z" fill="#fff6f2" opacity={0.9} />
    </g>
  );
}

function Blossom({ x, y, r = 6, fill = "#f6b8c5" }: { x: number; y: number; r?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0} cy={-r * 0.75} rx={r * 0.55} ry={r * 0.75} fill={fill} transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.32} fill="#e27d95" />
    </g>
  );
}

function SleepyCat({ x, y, s = 1, color = "#c9c0d8", stripe = "#a99fbd" }: { x: number; y: number; s?: number; color?: string; stripe?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-52 0 C-56 -28 -30 -44 0 -44 C30 -44 58 -30 54 0 Z" fill={color} {...stroke} />
      <path d="M50 -4 C66 -6 70 -20 60 -24" fill="none" {...stroke} strokeWidth={6} stroke={OUT} />
      <path d="M50 -4 C66 -6 70 -20 60 -24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M-40 -36 L-44 -58 L-24 -44 M24 -44 L40 -58 L40 -34" fill={color} {...stroke} />
      <path d="M-40 -42 L-41 -52 L-32 -46Z M34 -46 L38 -52 L38 -42Z" fill={EAR} />
      <path d="M-6 -44 v8 M2 -44 v7 M10 -43 v6" {...stroke} stroke={stripe} strokeWidth={3} />
      <path d="M-22 -18 q5 4 10 0 M12 -18 q5 4 10 0" fill="none" {...stroke} strokeWidth={1.8} />
      <ellipse cx={-26} cy={-9} rx={6} ry={3} fill={BLUSH} opacity={0.7} />
      <ellipse cx={26} cy={-9} rx={6} ry={3} fill={BLUSH} opacity={0.7} />
      <path d="M-3 -10 q1.5 2 3 0 q1.5 2 3 0" fill="none" {...stroke} strokeWidth={1.5} />
      <ellipse cx={-30} cy={0} rx={10} ry={5} fill={FUR} {...stroke} strokeWidth={1.8} />
      <ellipse cx={30} cy={0} rx={10} ry={5} fill={FUR} {...stroke} strokeWidth={1.8} />
    </g>
  );
}

/* --------------------------------------------------------------- mascots */

export function BunnyLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <BunnyHead cx={32} cy={42} s={0.68} />
    </svg>
  );
}

type BearPose = "sit" | "sign" | "peek" | "read" | "wave" | "sleep";

export function Bear({ pose = "sit", className, label = "Well Done!", ...place }: ArtProps & Place & { pose?: BearPose; label?: string }) {
  if (pose === "peek") {
    return (
      <svg viewBox="0 0 120 90" className={className} aria-hidden="true" {...place}>
        <BearHead cx={60} cy={50} s={1.1} />
        <ellipse cx={34} cy={82} rx={13} ry={9} fill={FUR} {...stroke} />
        <ellipse cx={86} cy={82} rx={13} ry={9} fill={FUR} {...stroke} />
        <path d="M30 80 v4 M34 79 v5 M38 80 v4 M82 80 v4 M86 79 v5 M90 80 v4" {...stroke} strokeWidth={1.4} />
      </svg>
    );
  }
  if (pose === "sleep") {
    return (
      <svg viewBox="0 0 180 110" className={className} aria-hidden="true" {...place}>
        <ellipse cx={95} cy={82} rx={60} ry={24} fill={FUR} {...stroke} />
        <ellipse cx={140} cy={96} rx={14} ry={8} fill={FUR} {...stroke} />
        <ellipse cx={140} cy={96} rx={6} ry={3.5} fill={EAR} />
        <BearHead cx={52} cy={66} s={0.95} sleepy />
        <text x={96} y={30} fontSize={14} fill={OUT} fontWeight={700} fontFamily="inherit">z</text>
        <text x={108} y={18} fontSize={10} fill={OUT} fontWeight={700} fontFamily="inherit">z</text>
      </svg>
    );
  }
  const shirt = pose === "sit" || pose === "wave";
  return (
    <svg viewBox="0 0 140 150" className={className} aria-hidden="true" {...place}>
      {/* body */}
      <ellipse cx={70} cy={112} rx={34} ry={30} fill={shirt ? "#c9b8e2" : FUR} {...stroke} />
      {shirt && (
        <g>
          <path d="M64 108 q6 -8 12 0 q-2 12 -6 14 q-4 -2 -6 -14Z" fill="#ef8ea0" {...stroke} strokeWidth={1.6} />
          <path d="M66 104 l4 -4 l4 4" fill={LEAF} {...stroke} strokeWidth={1.4} />
        </g>
      )}
      {/* feet */}
      <ellipse cx={48} cy={138} rx={14} ry={10} fill={FUR} {...stroke} />
      <ellipse cx={92} cy={138} rx={14} ry={10} fill={FUR} {...stroke} />
      <ellipse cx={48} cy={139} rx={6} ry={4.5} fill={EAR} />
      <ellipse cx={92} cy={139} rx={6} ry={4.5} fill={EAR} />
      {/* arms */}
      {pose === "wave" ? (
        <>
          <ellipse cx={104} cy={82} rx={9} ry={15} fill={FUR} {...stroke} transform="rotate(35 104 82)" />
          <ellipse cx={42} cy={112} rx={9} ry={14} fill={FUR} {...stroke} transform="rotate(20 42 112)" />
        </>
      ) : pose === "sign" || pose === "read" ? null : (
        <>
          <ellipse cx={40} cy={110} rx={9} ry={14} fill={FUR} {...stroke} transform="rotate(20 40 110)" />
          <ellipse cx={100} cy={110} rx={9} ry={14} fill={FUR} {...stroke} transform="rotate(-20 100 110)" />
        </>
      )}
      <BearHead cx={70} cy={58} s={1.15} wink={pose === "wave"} />
      {pose === "sign" && (
        <g>
          <path d="M30 104 l-4 42 M110 104 l4 42" {...stroke} strokeWidth={3} />
          <rect x={14} y={92} width={112} height={40} rx={8} fill="#fff8f2" {...stroke} transform="rotate(-6 70 112)" />
          <text x={70} y={117} textAnchor="middle" fontSize={14} fontWeight={800} fill={OUT} transform="rotate(-6 70 112)" fontFamily="inherit">
            {label}
          </text>
          <circle cx={20} cy={110} r={8} fill={FUR} {...stroke} />
          <circle cx={120} cy={98} r={8} fill={FUR} {...stroke} />
        </g>
      )}
      {pose === "read" && (
        <g>
          <path d="M34 104 Q52 96 70 106 Q88 96 106 104 L106 132 Q88 124 70 134 Q52 124 34 132Z" fill="#fff8f2" {...stroke} />
          <path d="M70 106 V134" {...stroke} />
          <path d="M42 110 h18 M42 116 h14 M80 110 h18 M80 116 h14" {...stroke} strokeWidth={1.4} opacity={0.6} />
          <circle cx={36} cy={118} r={8} fill={FUR} {...stroke} />
          <circle cx={104} cy={118} r={8} fill={FUR} {...stroke} />
        </g>
      )}
    </svg>
  );
}

export function Bunny({ className, ...place }: ArtProps & Place) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden="true" {...place}>
      <ellipse cx={60} cy={116} rx={30} ry={28} fill={FUR} {...stroke} />
      <ellipse cx={42} cy={140} rx={12} ry={8} fill={FUR} {...stroke} />
      <ellipse cx={78} cy={140} rx={12} ry={8} fill={FUR} {...stroke} />
      <ellipse cx={60} cy={120} rx={14} ry={12} fill="#fff9f5" />
      <BunnyHead cx={60} cy={72} s={1.1} />
    </svg>
  );
}

/* ----------------------------------------------------------- decorations */

export function BlossomBranch({ className, flip = false }: ArtProps & { flip?: boolean }) {
  return (
    <svg viewBox="0 0 240 120" className={className} aria-hidden="true">
      <g transform={flip ? "translate(240 0) scale(-1 1)" : undefined}>
        <path d="M240 8 C190 14 150 30 110 58 C90 72 70 78 40 80" fill="none" stroke="#8d6f7e" strokeWidth={4} strokeLinecap="round" />
        <path d="M160 26 C150 44 152 60 160 74 M110 58 C104 70 106 84 112 96 M200 12 C196 28 206 42 214 50" fill="none" stroke="#8d6f7e" strokeWidth={2.5} strokeLinecap="round" />
        {[
          [60, 78, 8], [88, 70, 9], [118, 54, 10], [140, 40, 8], [162, 74, 7], [112, 96, 7],
          [180, 22, 9], [214, 50, 8], [228, 12, 7], [150, 26, 6], [74, 88, 6], [196, 34, 6],
        ].map(([x, y, r], i) => (
          <Blossom key={i} x={x} y={y} r={r} fill={i % 3 === 0 ? "#f3a9b9" : i % 3 === 1 ? "#f8c7d1" : "#efb0c0"} />
        ))}
        {[[48, 94], [132, 108], [96, 110], [206, 76]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={3} ry={4.5} fill="#f6bccb" transform={`rotate(${30 * i} ${x} ${y})`} />
        ))}
      </g>
    </svg>
  );
}

/** Bottom-of-sidebar vignettes, one per page, like the mockups. */
export function SidebarScene({ variant = 0, className }: ArtProps & { variant?: number }) {
  const v = variant % 4;
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      <rect x={0} y={122} width={200} height={28} fill="rgb(255 255 255)" opacity={0.22} />
      <path d="M0 122 H200" stroke={OUT} strokeWidth={1.5} opacity={0.35} />
      {v === 0 && (
        <g>
          <Pot x={30} y={120} s={0.8} kind="leafy" color="#e7b7c6" />
          <g transform="translate(100 124)">
            <SleepyCat x={0} y={0} s={0.72} />
          </g>
          <g transform="translate(118 58) scale(0.42)">
            <BearHead cx={60} cy={60} s={1} sleepy />
          </g>
          <Pot x={178} y={120} s={0.62} kind="tulip" color="#c9b8e2" />
        </g>
      )}
      {v === 1 && (
        <g>
          <rect x={20} y={104} width={70} height={10} rx={3} fill="#c9b8e2" {...stroke} strokeWidth={1.6} />
          <rect x={26} y={112} width={62} height={10} rx={3} fill={PINK} {...stroke} strokeWidth={1.6} />
          <Bear pose="read" x={20} y={20} width={80} height={86} />
          <Pot x={120} y={120} s={0.75} kind="leafy" color="#e7b7c6" />
          <Pot x={168} y={120} s={0.7} kind="cactus" color="#fbe6d8" />
        </g>
      )}
      {v === 2 && (
        <g>
          <Pot x={24} y={120} s={0.7} kind="tulip" color="#fbe6d8" />
          <Bunny x={56} y={32} width={72} height={90} />
          <Pot x={150} y={120} s={0.8} kind="leafy" color="#c9b8e2" />
          <Blossom x={182} y={108} r={6} />
        </g>
      )}
      {v === 3 && (
        <g>
          <Bear pose="sleep" x={4} y={54} width={116} height={71} />
          <rect x={120} y={106} width={60} height={16} rx={4} fill="#fbe6d8" {...stroke} strokeWidth={1.6} />
          <Pot x={150} y={106} s={0.62} kind="leafy" color="#e7b7c6" />
        </g>
      )}
    </svg>
  );
}

/** The cozy room behind the dashboard greeting. */
export function HeroScene({ className }: ArtProps) {
  return (
    <svg viewBox="160 0 740 300" preserveAspectRatio="xMaxYMax meet" overflow="visible" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hero-sky" x1="0" x2="0" y1="0" y2="1">
          {/* the window sky follows the active theme */}
          <stop offset="0" stopColor="var(--c-lav-soft, #c9b6de)" />
          <stop offset="0.6" stopColor="var(--c-pink-soft, #f2c6d3)" />
          <stop offset="1" stopColor="var(--c-cream, #fbe1dd)" />
        </linearGradient>
        <radialGradient id="hero-lamp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff4dc" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff4dc" stopOpacity="0" />
        </radialGradient>
        <pattern id="hero-plaid" width="26" height="26" patternUnits="userSpaceOnUse">
          <rect width="26" height="26" fill="var(--c-rose, #ecc7d0)" opacity="0.55" />
          <rect width="26" height="8" fill="var(--c-pink-soft, #f3d6dc)" opacity="0.8" />
          <rect width="8" height="26" fill="var(--c-pink-soft, #f3d6dc)" opacity="0.8" />
        </pattern>
      </defs>

      {/* window */}
      <g>
        <rect x={470} y={-10} width={190} height={200} rx={6} fill="url(#hero-sky)" {...stroke} />
        <circle cx={610} cy={60} r={18} fill="#fff4e8" opacity={0.85} />
        <path d="M565 -10 V190 M470 90 H660" {...stroke} />
        <path d="M480 150 q30 -26 60 -6 q30 -20 60 2 q30 -14 60 4 V190 H470Z" fill="var(--c-rose, #d9a9c4)" opacity={0.45} />
        <path d="M455 -10 C470 60 462 130 440 196 L470 196 L470 -10Z" fill="var(--c-pink, #f2c9d4)" {...stroke} />
        <path d="M675 -10 C660 60 668 130 690 196 L660 196 L660 -10Z" fill="var(--c-pink, #f2c9d4)" {...stroke} />
      </g>
      <g transform="translate(520 -6) scale(1.1)">
        <BlossomBranch />
      </g>

      {/* shelf */}
      <path d="M250 120 H430" stroke="#b99aa8" strokeWidth={8} strokeLinecap="round" />
      <Pot x={285} y={116} s={0.9} kind="leafy" color="#e7b7c6" />
      <Pot x={345} y={116} s={0.8} kind="cactus" color="#fbe6d8" />
      <g transform="translate(378 70)">
        <rect x={0} y={16} width={30} height={30} rx={4} fill="#c9b8e2" {...stroke} />
        <path d="M8 16 L4 0 M15 16 V-4 M22 16 L28 2" {...stroke} strokeWidth={3} stroke="#e98ea1" />
      </g>

      {/* lamp glow */}
      <ellipse cx={760} cy={120} rx={150} ry={110} fill="url(#hero-lamp)" />

      {/* desk */}
      <rect x={-1400} y={230} width={2300} height={70} fill="url(#hero-plaid)" />
      <path d="M-1400 230 H900" {...stroke} opacity={0.5} />

      {/* sleeping cat + bear on the desk */}
      <SleepyCat x={330} y={242} s={1.35} />
      <g transform="translate(455 160) scale(1)">
        <ellipse cx={60} cy={76} rx={48} ry={22} fill={FUR} {...stroke} />
        <BearHead cx={46} cy={56} s={0.95} sleepy />
      </g>
      {/* pencil cup */}
      <g transform="translate(610 180)">
        <path d="M0 10 H40 L36 58 H4Z" fill="#fff4f2" {...stroke} />
        <path d="M10 10 L4 -20 M20 10 V-26 M30 10 L38 -16" {...stroke} strokeWidth={3} stroke="#8f86ae" />
        <circle cx={20} cy={-28} r={4} fill="#ef8ea0" />
        <ellipse cx={20} cy={34} rx={9} ry={7} fill={FUR} {...stroke} strokeWidth={1.4} />
      </g>
      {/* mug */}
      <g transform="translate(200 196)">
        <rect x={0} y={0} width={34} height={40} rx={8} fill="#d8cbe8" {...stroke} />
        <path d="M34 10 q14 0 14 12 q0 12 -14 12" fill="none" {...stroke} />
        <path d="M10 -6 q-4 -8 2 -14 M22 -6 q-4 -8 2 -14" fill="none" {...stroke} strokeWidth={1.6} opacity={0.6} />
      </g>
    </svg>
  );
}

/* ----------------------------------------------------------- module art */

const coverBg: Record<CoverArt, [string, string]> = {
  book: ["#f4d3dd", "#e9bfd0"],
  flask: ["#d5d9ef", "#bfc6e6"],
  battery: ["#f8dcd2", "#efc4bb"],
  laptop: ["#e7cfe0", "#d7b8d2"],
  chart: ["#ddd6ee", "#c9c0e3"],
  bear: ["#f6d6dc", "#ebbfca"],
  globe: ["#d3e6e2", "#bcd9d3"],
  palette: ["#f7e2cf", "#efcfb5"],
  notebook: ["#e2dcef", "#d0c7e6"],
};

export const coverChoices: CoverArt[] = ["book", "flask", "battery", "laptop", "chart", "bear", "globe", "palette", "notebook"];

export function ModuleCover({ art, className }: ArtProps & { art: CoverArt }) {
  const [a, b] = coverBg[art];
  const id = `cover-${art}`;
  return (
    <svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="240" height="140" fill={`url(#${id})`} />
      <circle cx={30} cy={26} r={3} fill="#fff" opacity={0.6} />
      <circle cx={210} cy={20} r={2} fill="#fff" opacity={0.7} />
      <circle cx={196} cy={40} r={1.6} fill="#fff" opacity={0.6} />
      <rect x={0} y={112} width={240} height={28} fill={WOOD} opacity={0.75} />
      <path d="M0 112 H240" {...stroke} opacity={0.4} />
      {art === "book" && (
        <g>
          <path d="M62 112 L70 40 Q100 30 120 46 Q140 30 170 40 L178 112 Q150 100 120 112 Q90 100 62 112Z" fill="#fff8f2" {...stroke} />
          <path d="M120 46 V112" {...stroke} />
          <rect x={80} y={54} width={30} height={24} rx={3} fill="#f6c8d2" {...stroke} strokeWidth={1.6} />
          <Pot x={95} y={76} s={0.4} kind="tulip" color="#f6c8d2" />
          <path d="M132 58 h28 M132 66 h24 M132 74 h28 M84 88 h26 M84 96 h20" {...stroke} strokeWidth={1.4} opacity={0.55} />
          <Pot x={200} y={112} s={0.7} kind="tulip" color="#c9b8e2" />
        </g>
      )}
      {art === "flask" && (
        <g>
          <path d="M104 30 h24 M110 30 V58 L86 102 Q82 112 94 112 H138 Q150 112 146 102 L122 58 V30" fill="#fff8f2" {...stroke} />
          <path d="M94 88 H138 L146 102 Q150 112 138 112 H94 Q82 112 86 102Z" fill="#a9b7e3" />
          <path d="M110 30 V58 L86 102 Q82 112 94 112 H138 Q150 112 146 102 L122 58 V30" fill="none" {...stroke} />
          <circle cx={108} cy={98} r={3} fill="#fff" />
          <circle cx={122} cy={94} r={2} fill="#fff" />
          <circle cx={116} cy={40} r={4} fill="#fff" {...stroke} strokeWidth={1.4} />
          <rect x={160} y={60} width={14} height={52} rx={7} fill="#fff8f2" {...stroke} />
          <rect x={162} y={86} width={10} height={24} rx={5} fill="#f3a6b6" />
          <Pot x={52} y={112} s={0.62} kind="leafy" color="#e7b7c6" />
        </g>
      )}
      {art === "battery" && (
        <g>
          <rect x={104} y={30} width={24} height={10} rx={3} fill="#c9b8e2" {...stroke} />
          <rect x={88} y={38} width={56} height={74} rx={12} fill="#fff8f2" {...stroke} />
          <rect x={94} y={70} width={44} height={36} rx={8} fill="#f6c3b8" />
          <path d="M120 48 L108 72 H120 L112 94 L130 64 H118 Z" fill="#f7d98b" {...stroke} strokeWidth={1.6} />
          <g transform="translate(166 112)">
            <SleepyCat x={0} y={0} s={0.42} color="#f1d7c9" stripe="#dcb7a3" />
          </g>
          <Pot x={56} y={112} s={0.6} kind="cactus" color="#e7b7c6" />
        </g>
      )}
      {art === "laptop" && (
        <g>
          <rect x={74} y={42} width={92} height={60} rx={6} fill="#5f5577" {...stroke} />
          <path d="M84 56 h20 M90 64 h32 M90 72 h24 M84 80 h14 M104 80 h26" stroke="#f3a6b6" strokeWidth={3} strokeLinecap="round" />
          <path d="M84 64 h2 M84 72 h2" stroke="#a9d3c7" strokeWidth={3} strokeLinecap="round" />
          <path d="M62 102 H178 L170 112 H70Z" fill="#d8cbe8" {...stroke} />
          <g transform="translate(184 84)">
            <rect x={0} y={0} width={24} height={28} rx={6} fill="#fff8f2" {...stroke} />
            <path d="M24 8 q8 0 8 7 q0 7 -8 7" fill="none" {...stroke} />
          </g>
          <Pot x={44} y={112} s={0.6} kind="leafy" color="#c9b8e2" />
        </g>
      )}
      {art === "chart" && (
        <g>
          <rect x={80} y={30} width={80} height={82} rx={6} fill="#fff8f2" {...stroke} />
          <rect x={104} y={24} width={32} height={12} rx={4} fill="#c9b8e2" {...stroke} />
          <rect x={92} y={80} width={10} height={20} rx={2} fill="#f3a6b6" />
          <rect x={108} y={66} width={10} height={34} rx={2} fill="#b8acd6" />
          <rect x={124} y={56} width={10} height={44} rx={2} fill="#f3a6b6" />
          <rect x={140} y={70} width={10} height={30} rx={2} fill="#b8acd6" />
          <path d="M92 60 L110 50 L126 44 L148 48" fill="none" {...stroke} strokeWidth={1.6} />
          <rect x={172} y={92} width={44} height={10} rx={3} fill={PINK} {...stroke} strokeWidth={1.6} />
          <rect x={176} y={102} width={40} height={10} rx={3} fill="#c9b8e2" {...stroke} strokeWidth={1.6} />
          <Pot x={48} y={112} s={0.6} kind="tulip" color="#fbe6d8" />
        </g>
      )}
      {art === "bear" && (
        <g>
          <ellipse cx={120} cy={106} rx={72} ry={14} fill="#f4c6d0" {...stroke} />
          <Bear pose="sleep" x={62} y={30} width={130} height={79} />
          <g transform="translate(40 76)">
            <path d="M0 36 H40 V20 Q20 8 0 20Z" fill="#fff8f2" {...stroke} strokeWidth={1.8} />
            <path d="M0 22 Q20 12 40 22" fill="none" stroke="#f3a6b6" strokeWidth={5} />
            <circle cx={20} cy={8} r={6} fill="#ef6f86" {...stroke} strokeWidth={1.6} />
          </g>
        </g>
      )}
      {art === "globe" && (
        <g>
          <circle cx={120} cy={66} r={36} fill="#bfe0da" {...stroke} />
          <path d="M100 48 q14 6 10 20 q-8 6 -4 16 M132 40 q-6 14 8 18 q10 0 12 10" fill="none" stroke="#86b9a9" strokeWidth={6} strokeLinecap="round" />
          <path d="M120 102 V112 M100 112 H140" {...stroke} strokeWidth={3} />
          <path d="M80 66 A40 40 0 0 0 160 66" fill="none" {...stroke} />
          <Pot x={192} y={112} s={0.62} kind="leafy" color="#e7b7c6" />
        </g>
      )}
      {art === "palette" && (
        <g>
          <path d="M120 34 C156 34 176 58 170 82 C166 96 150 92 142 98 C134 104 142 114 126 114 C92 114 70 94 70 72 C70 50 92 34 120 34Z" fill="#fff8f2" {...stroke} />
          <circle cx={96} cy={64} r={7} fill="#f3a6b6" />
          <circle cx={116} cy={50} r={7} fill="#b8acd6" />
          <circle cx={140} cy={54} r={7} fill="#a9d3c7" />
          <circle cx={152} cy={74} r={7} fill="#f7d98b" />
          <path d="M184 40 L150 96" {...stroke} strokeWidth={5} stroke="#8f86ae" />
          <Pot x={52} y={112} s={0.6} kind="tulip" color="#c9b8e2" />
        </g>
      )}
      {art === "notebook" && (
        <g>
          <rect x={88} y={30} width={66} height={82} rx={6} fill="#fff8f2" {...stroke} />
          <path d="M88 30 V112" {...stroke} strokeWidth={6} stroke="#c9b8e2" />
          <path d="M104 50 h36 M104 60 h30 M104 70 h36 M104 80 h22" {...stroke} strokeWidth={1.4} opacity={0.55} />
          <path d="M162 40 l8 60 l-6 6 l-4 -6Z" fill={PINK} {...stroke} strokeWidth={1.6} />
          <Pot x={56} y={112} s={0.62} kind="leafy" color="#e7b7c6" />
        </g>
      )}
    </svg>
  );
}

/** Mini "document" thumbnail used on lesson rows. */
export function LessonThumb({ className, seed = 0 }: ArtProps & { seed?: number }) {
  const hue = ["#c9b8e2", "#f3c0cc", "#bcd9d3"][seed % 3];
  return (
    <svg viewBox="0 0 60 76" className={className} aria-hidden="true">
      <rect x={0} y={0} width={60} height={76} rx={6} fill="#d9d0ea" />
      <rect x={10} y={8} width={40} height={60} rx={3} fill="#fffaf7" {...stroke} strokeWidth={1.4} />
      <rect x={15} y={14} width={30} height={16} rx={2} fill={hue} />
      <path d="M15 36 h30 M15 42 h24 M15 48 h30 M15 54 h18" stroke="#b8aec6" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function DefaultAvatar({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <rect width="80" height="80" fill="#e6dcef" />
      <path d="M12 80 C14 60 26 54 40 54 C54 54 66 60 68 80Z" fill="#8f86ae" />
      <path d="M16 40 C14 18 26 8 40 8 C56 8 66 20 64 42 C62 56 58 60 56 62 L24 62 C20 58 17 52 16 40Z" fill="#3b3346" />
      <ellipse cx={40} cy={40} rx={17} ry={19} fill="#fbe7de" />
      <path d="M22 34 C26 20 36 18 42 22 C46 18 58 22 58 36 C52 28 46 28 42 30 C36 26 28 28 22 34Z" fill="#3b3346" />
      <ellipse cx={33} cy={42} rx={2.2} ry={2.8} fill="#3b3346" />
      <ellipse cx={47} cy={42} rx={2.2} ry={2.8} fill="#3b3346" />
      <ellipse cx={29} cy={48} rx={3.5} ry={2} fill={BLUSH} opacity={0.7} />
      <ellipse cx={51} cy={48} rx={3.5} ry={2} fill={BLUSH} opacity={0.7} />
      <path d="M37 50 q3 2.5 6 0" fill="none" stroke="#3b3346" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

export { LILAC };

/** Mochi, the hint cat: a round cream kitten. `thinking` raises a paw to its chin. */
export function HintCat({ className, thinking = false }: ArtProps & { thinking?: boolean }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      {/* ears */}
      <path d="M18 38 L22 10 L42 26Z" fill="#fff7f0" {...stroke} />
      <path d="M78 38 L74 10 L54 26Z" fill="#fff7f0" {...stroke} />
      <path d="M23 31 L25 17 L35 26Z" fill={EAR} />
      <path d="M73 31 L71 17 L61 26Z" fill={EAR} />
      {/* head */}
      <ellipse cx={48} cy={52} rx={34} ry={29} fill="#fff7f0" {...stroke} />
      {/* calico patch */}
      <path d="M62 27 C74 29 80 38 81 47 C72 46 64 40 62 27Z" fill="#f4c99b" opacity={0.85} />
      {/* eyes with sparkles */}
      <ellipse cx={35} cy={52} rx={5} ry={6} fill="#3d3140" />
      <ellipse cx={61} cy={52} rx={5} ry={6} fill="#3d3140" />
      <circle cx={36.8} cy={49.6} r={1.9} fill="#fff" />
      <circle cx={62.8} cy={49.6} r={1.9} fill="#fff" />
      <circle cx={33.6} cy={54.4} r={0.9} fill="#fff" />
      <circle cx={59.6} cy={54.4} r={0.9} fill="#fff" />
      {/* blush */}
      <ellipse cx={26} cy={62} rx={6} ry={3.4} fill={BLUSH} opacity={0.75} />
      <ellipse cx={70} cy={62} rx={6} ry={3.4} fill={BLUSH} opacity={0.75} />
      {/* nose + mouth */}
      <path d="M46 59 h4 l-2 2.4Z" fill="#e98ea1" />
      <path d="M44 63 q2 2.6 4 0 q2 2.6 4 0" fill="none" {...stroke} strokeWidth={1.6} />
      {/* whiskers */}
      <path d="M14 58 h10 M15 64 l9 -2 M82 58 h-10 M81 64 l-9 -2" {...stroke} strokeWidth={1.3} opacity={0.6} />
      {/* bow */}
      <g transform="translate(26 22) rotate(-18)">
        <path d="M0 0 L-9 -5 Q-11 0 -9 5Z M0 0 L9 -5 Q11 0 9 5Z" fill="#e98ea1" {...stroke} strokeWidth={1.4} />
        <circle r={2.4} fill="#f6b1c0" {...stroke} strokeWidth={1.2} />
      </g>
      {thinking && (
        <g>
          <ellipse cx={70} cy={76} rx={9} ry={7} fill="#fff7f0" {...stroke} />
          <path d="M65 77 v2.5 M70 78 v2.5 M75 77 v2.5" {...stroke} strokeWidth={1.2} />
        </g>
      )}
    </svg>
  );
}
