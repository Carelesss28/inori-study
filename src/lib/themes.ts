import type { ThemeName } from "./types";

export interface ThemeInfo {
  id: ThemeName;
  name: string;
  body: string;
  mode: "light" | "dark";
  /** preview swatch: page, card, sidebar, accent */
  swatch: [string, string, string, string];
}

// Colour values live in globals.css under [data-theme="…"]; this is the picker's catalogue.
export const themes: ThemeInfo[] = [
  { id: "blossom", name: "Blossom", body: "Soft lilac and pink, like a sunny desk.", mode: "light", swatch: ["#efe5ee", "#faf5f8", "#9f98ba", "#e8a3b1"] },
  { id: "dusk", name: "Dusk", body: "A cosy night-time palette that's easy on the eyes.", mode: "dark", swatch: ["#27223a", "#322b48", "#3d3556", "#e59bab"] },
  { id: "kitty", name: "Sanrio Hello Kitty", body: "Sugar-pink and white with a red-bow accent.", mode: "light", swatch: ["#fff2f5", "#ffffff", "#f45b80", "#e8344e"] },
  { id: "cinnamoroll", name: "Sanrio Cinnamoroll", body: "Sky blue and fluffy clouds with blue gingham bows.", mode: "light", swatch: ["#dde9f8", "#f8fbff", "#8db2e4", "#9cc3f0"] },
  { id: "evergarden", name: "Violet Evergarden", body: "Midnight navy, letter-paper cream and brooch gold.", mode: "dark", swatch: ["#121a2e", "#1a2440", "#1d2a4d", "#d4af6a"] },
  { id: "sakura", name: "Japanese Spring", body: "Washi cream, sakura pink and fresh matcha.", mode: "light", swatch: ["#f7f3ec", "#fffdf8", "#7f9f6e", "#f1a7b8"] },
  { id: "cyberpunk", name: "Cyberpunk", body: "Neon magenta and cyan glowing on near-black.", mode: "dark", swatch: ["#0b0b14", "#12121f", "#14142a", "#ff2bd6"] },
];

export const darkThemes = themes.filter((t) => t.mode === "dark").map((t) => t.id);

export function themeMode(id: ThemeName) {
  return darkThemes.includes(id) ? "dark" : "light";
}

export const fontScales = [
  { value: 0.9, label: "Small" },
  { value: 1, label: "Default" },
  { value: 1.15, label: "Large" },
  { value: 1.3, label: "Extra large" },
] as const;
