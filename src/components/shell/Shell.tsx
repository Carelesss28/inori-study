"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStudy } from "@/lib/store";
import { bestAttempt, modulePercent } from "@/lib/derive";
import { dayKey } from "@/lib/seed";
import { BunnyLogo, DefaultAvatar, SidebarScene } from "@/components/art/Illustrations";
import { useStoredImage } from "@/lib/images";
import { Ambience } from "@/components/art/Ambience";
import { Icon, type IconName } from "@/components/ui/Icon";
import { BackLink, cx } from "@/components/ui/primitives";

const nav: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/modules", label: "Modules", icon: "modules" },
  { href: "/quizzes", label: "Quizzes", icon: "quiz" },
  { href: "/revision", label: "Revision", icon: "target" },
  { href: "/classrooms", label: "Classrooms", icon: "users" },
  { href: "/progress", label: "Progress", icon: "progress" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

const quotes = [
  "A little progress every day adds up to big results.",
  "Small habits. Brighter days. Better me.",
  "Be gentle with yourself — you're learning.",
  "One page at a time is still moving forward.",
  "Learning is better together.",
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function sectionIndex(pathname: string) {
  const i = nav.findIndex((n) => n.href !== "/" && isActive(pathname, n.href));
  return i === -1 ? 0 : i;
}

/** Logo, menu, quote and mascot: shared by the desktop sidebar and the phone drawer. */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const idx = sectionIndex(pathname);
  const { prefs } = useStudy();
  const mascot = useStoredImage(prefs.customMascot?.id, prefs.customMascot?.v);
  return (
    <>
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2 px-5 pb-6 pt-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25">
          <BunnyLogo size={30} />
        </span>
        <span className="text-[0.9375rem] font-extrabold tracking-tight">Inori Study</span>
      </Link>
      <nav className="flex flex-col gap-1 px-3" aria-label="Main">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                active ? "bg-side-active text-ink shadow-sm" : "text-side-ink/90 hover:bg-white/15"
              )}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <p className="px-6 text-xs font-semibold leading-relaxed text-side-ink/80">{quotes[idx % quotes.length]}</p>
        {mascot ? (
          // eslint-disable-next-line @next/next/no-img-element -- the person's own uploaded picture
          <img src={mascot} alt="" className="mx-auto mt-2 max-h-44 w-full object-contain object-bottom px-3 pb-2" />
        ) : (
          <SidebarScene variant={idx} className="mt-2 w-full" />
        )}
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="grain sticky top-0 hidden h-screen w-52 shrink-0 2xl:w-56 flex-col bg-linear-to-b from-side-1 to-side-2 text-side-ink lg:flex">
      <SidebarBody />
    </aside>
  );
}

/** Phones/tablets: the sidebar slides in from the left via a › tab, and closes with ‹. */
export function MobileDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // keep the page behind from scrolling while the drawer is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      {/* one tab rides on the drawer's edge: › to open, ‹ to close */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-drawer"
        style={{ left: open ? "min(16rem, 80vw)" : 0 }}
        className="fixed top-1/2 z-[48] flex h-14 w-6 -translate-y-1/2 items-center justify-center rounded-r-xl bg-linear-to-b from-side-1 to-side-2 text-side-ink shadow-md transition-[left] duration-300 ease-out"
      >
        <Icon name={open ? "chevronLeft" : "chevronRight"} size={16} strokeWidth={2.6} />
      </button>

      {/* dimmed page behind */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cx("fixed inset-0 z-[46] bg-[rgb(var(--c-shadow)/0.45)] transition-opacity duration-300", open ? "opacity-100" : "pointer-events-none opacity-0")}
      />

      <aside
        id="mobile-drawer"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
        className={cx(
          "grain fixed inset-y-0 left-0 z-[47] flex w-64 max-w-[80vw] flex-col bg-linear-to-b from-side-1 to-side-2 text-side-ink shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarBody onNavigate={() => setOpen(false)} />
      </aside>
    </div>
  );
}

// the phone bar keeps the essentials; everything else is in the › side menu
const MOBILE_BAR = ["/", "/modules", "/quizzes", "/revision", "/profile"];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-panel/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur lg:hidden">
      {nav.filter((n) => MOBILE_BAR.includes(n.href)).map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx("flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[0.625rem] font-bold", active ? "text-pink-strong" : "text-ink-faint")}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Avatar({ size = 36, className }: { size?: number; className?: string }) {
  const { profile } = useStudy();
  return (
    <span className={cx("block shrink-0 overflow-hidden rounded-full ring-2 ring-white/70", className)} style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }}>
      {profile.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL
        <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        <DefaultAvatar className="h-full w-full" />
      )}
    </span>
  );
}

interface Note {
  id: string;
  text: string;
  href: string;
}

function useNotifications(): Note[] {
  const s = useStudy();
  return useMemo(() => {
    const out: Note[] = [];
    const today = dayKey();
    if (s.prefs.notifyPlan) {
      const left = s.plan.filter((p) => p.date === today && !p.done).length;
      if (left > 0) out.push({ id: `plan-${today}-${left}`, text: `You have ${left} task${left > 1 ? "s" : ""} left in today's plan.`, href: "/" });
    }
    if (s.prefs.notifyQuizzes) {
      for (const [quizId, act] of Object.entries(s.active)) {
        const quiz = s.quizzes.find((q) => q.id === quizId);
        if (quiz) out.push({ id: `active-${quizId}-${act.startedAt}`, text: `Resume "${quiz.title}" — it's still in progress.`, href: `/quizzes/${quizId}` });
      }
      s.quizzes
        .filter((q) => !s.attempts.some((a) => a.quizId === q.id) && !s.active[q.id])
        .slice(0, 3)
        .forEach((q) => {
          const mod = s.modules.find((m) => m.id === q.moduleId);
          out.push({ id: `new-${q.id}`, text: `${q.title} for ${mod?.title ?? "a module"} is waiting for you.`, href: `/quizzes/${q.id}` });
        });
    }
    if (s.prefs.notifyMilestones) {
      s.modules.forEach((m) => {
        if (modulePercent(s, m.id) === 100) out.push({ id: `done-${m.id}`, text: `You finished every lesson in ${m.title}! 🎉`, href: `/modules/${m.id}` });
      });
      s.quizzes.forEach((q) => {
        const best = bestAttempt(s, q.id);
        if (best && best.score >= 85) out.push({ id: `star-${best.id}`, text: `Great job — ${best.score}% on ${q.title}. ✨`, href: `/quizzes/${q.id}/results/${best.id}` });
      });
    }
    return out;
  }, [s]);
}

function Notifications() {
  const notes = useNotifications();
  const { readNotifications, markNotificationsRead } = useStudy();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notes.filter((n) => !readNotifications.includes(n.id));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread.length ? ` (${unread.length} unread)` : ""}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread.length) markNotificationsRead(unread.map((n) => n.id));
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft hover:bg-panel-2 hover:text-ink"
      >
        <Icon name="bell" size={19} />
        {unread.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-pink-strong ring-2 ring-bg" />}
      </button>
      {open && (
        <div className="card pop-in absolute right-0 top-11 z-40 w-80 max-w-[calc(100vw-2rem)] p-2">
          <p className="px-2 pb-1 pt-1 text-xs font-extrabold uppercase tracking-wide text-ink-faint">Notifications</p>
          {notes.length === 0 ? (
            <p className="px-2 py-4 text-sm text-ink-soft">All caught up. Time for tea 🍵</p>
          ) : (
            <ul>
              {notes.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 text-sm text-ink hover:bg-panel-2">
                    {n.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function TopActions({ children }: { children?: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {children}
      <Notifications />
      <Link href="/profile" aria-label="Your profile" className="ml-1">
        <Avatar size={34} />
      </Link>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  titleIcon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  titleIcon?: ReactNode;
}) {
  return (
    <header className="relative z-10 mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {back && (
            <div className="mb-2">
              <BackLink href={back.href}>{back.label}</BackLink>
            </div>
          )}
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink sm:text-[1.625rem]">
            {titleIcon}
            <span className="line-clamp-2 sm:line-clamp-1">{title}</span>
          </h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        </div>
        <TopActions>{actions}</TopActions>
      </div>
    </header>
  );
}

/** The person's own background picture, faded over the theme colour so cards stay readable. */
function CustomBackground() {
  const { prefs } = useStudy();
  const url = useStoredImage(prefs.customBg?.id, prefs.customBg?.v);
  if (!url || !prefs.customBg) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center"
      style={{ backgroundImage: `url("${url}")`, opacity: prefs.customBg.strength }}
    />
  );
}

// reading and answering screens stay calm: no drifting particles there
const FOCUS_ROUTES = [/^\/revision\/play/, /\/lessons\//, /^\/quizzes\/[^/]+$/, /\/practice$/, /^\/classrooms\/[^/]+\/sets\/[^/]+$/];

function ThemeAmbience() {
  const { prefs } = useStudy();
  const pathname = usePathname();
  if (!prefs.ambience || prefs.reduceMotion || pathname === "/quizzes/new" || FOCUS_ROUTES.some((r) => r.test(pathname))) return null;
  return <Ambience theme={prefs.theme} />;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="isolate flex min-h-screen bg-bg">
      <CustomBackground />
      <ThemeAmbience />
      <Sidebar />
      <MobileDrawer />
      <main className="flex min-w-0 flex-1 flex-col px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-7 2xl:px-10">
        <div className="flex w-full flex-1 flex-col">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
