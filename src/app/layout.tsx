import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { StudyProvider } from "@/lib/store";
import { STORAGE_KEY } from "@/lib/constants";
import { darkThemes } from "@/lib/themes";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Inori Study",
  description: "A cozy study companion — modules, lessons, quizzes and progress in one place.",
};

// Apply the saved theme before first paint so Dusk mode never flashes light.
// Apply the saved theme, light/dark mode and text size before first paint so nothing flashes.
const themeScript = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"null");if(s&&s.prefs){var d=document.documentElement;d.dataset.theme=s.prefs.theme;d.dataset.mode=${JSON.stringify(darkThemes)}.indexOf(s.prefs.theme)>=0?"dark":"light";d.dataset.motion=s.prefs.reduceMotion?"reduce":"full";if(s.prefs.fontScale)d.style.setProperty("--fs",String(s.prefs.fontScale))}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <StudyProvider>{children}</StudyProvider>
      </body>
    </html>
  );
}
