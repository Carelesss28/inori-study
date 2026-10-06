"use client";

import { useRef, useState } from "react";
import { useStudy } from "@/lib/store";
import { fontScales, themes } from "@/lib/themes";
import { deleteFile, saveFile } from "@/lib/files";
import { shrinkImage, useStoredImage } from "@/lib/images";
import { Bear, BlossomBranch, ModuleCover } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { Button, Confirm, Toggle, cx, inputClass } from "@/components/ui/primitives";
import { Avatar, PageHeader } from "@/components/shell/Shell";

const tabs = ["Account", "Appearance", "Settings", "Notifications", "Privacy"] as const;
type Tab = (typeof tabs)[number];

/** Shrink an uploaded photo to a small square data URL so it fits in local storage. */
function toAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = Object.assign(document.createElement("canvas"), { width: size, height: size });
      const ctx = canvas.getContext("2d")!;
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function ProfilePage() {
  const s = useStudy();
  const [tab, setTab] = useState<Tab>("Account");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(s.profile);
  const photoInput = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(s.profile);
    setEditing(true);
    setTab("Account");
  };
  const save = () => {
    s.updateProfile({ name: draft.name.trim() || s.profile.name, email: draft.email.trim(), role: draft.role.trim() || "Student" });
    setEditing(false);
  };

  return (
    <div>
      <PageHeader title="My Profile" />

      <section className="card relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] md:block" aria-hidden="true">
          <div className="absolute left-6 right-0 top-6 h-px rotate-[-3deg] bg-[#b99aa8]" />
          {(["book", "bear", "flask"] as const).map((art, i) => (
            <div key={art} className="absolute rounded-sm bg-white p-1.5 pb-4 shadow-md" style={{ left: `${14 + i * 26}%`, top: 12 + i * -6, transform: `rotate(${[-6, 4, -3][i]}deg)` }}>
              <span className="absolute -top-2 left-1/2 h-3 w-1.5 -translate-x-1/2 rounded-sm bg-[#d9a0ad]" />
              <ModuleCover art={art} className="block h-16 w-20" />
            </div>
          ))}
          <BlossomBranch className="absolute -right-6 -top-4 w-52 opacity-80" />
          <Bear pose="sleep" className="absolute -bottom-1 right-4 w-40" />
        </div>

        <div className="relative flex flex-wrap items-center gap-5">
          <div className="relative">
            <Avatar size={104} className="ring-4" />
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-pink text-pink-ink shadow-md hover:bg-pink-strong"
            >
              <Icon name="camera" size={17} />
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) s.updateProfile({ avatar: await toAvatarDataUrl(f) });
                e.target.value = "";
              }}
            />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-ink">{s.profile.name}</h2>
            <p className="text-sm font-semibold text-ink-soft">{s.profile.role}</p>
            <p className="text-sm text-ink-faint">{s.profile.email}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" icon="pencil" onClick={startEdit}>
                Edit Profile
              </Button>
              {s.profile.avatar && (
                <Button size="sm" variant="ghost" onClick={() => s.updateProfile({ avatar: null })}>
                  Remove photo
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <div role="tablist" aria-label="Profile sections" className="no-scrollbar -mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-line px-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cx("-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors", tab === t ? "border-pink-strong text-ink" : "border-transparent text-ink-soft hover:text-ink")}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Account" && (
          <div className="max-w-2xl">
            <h3 className="mb-4 text-[0.9375rem] font-extrabold text-ink">Account Information</h3>
            <dl className="divide-y divide-line">
              {(
                [
                  ["Name", "name", "text"],
                  ["Email", "email", "email"],
                  ["Role", "role", "text"],
                ] as const
              ).map(([label, key, type]) => (
                <div key={key} className="grid items-center gap-2 py-3 sm:grid-cols-[8.75rem_1fr]">
                  <dt className="text-sm font-bold text-ink-soft">
                    <label htmlFor={`pf-${key}`}>{label}</label>
                  </dt>
                  <dd>
                    {editing ? (
                      <input id={`pf-${key}`} type={type} className={inputClass} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                    ) : (
                      <p className="rounded-xl border border-line bg-panel-2/60 px-3 py-2.5 text-sm text-ink">{s.profile[key] || "—"}</p>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {editing && (
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button icon="check" onClick={save}>
                  Save changes
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === "Appearance" && <Appearance />}
        {tab === "Settings" && <SettingsTab />}
        {tab === "Notifications" && <NotificationPrefs />}
        {tab === "Privacy" && <Privacy />}
      </section>
    </div>
  );
}

function Row({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="text-xs text-ink-soft">{body}</p>
      </div>
      {children}
    </div>
  );
}

function Appearance() {
  const { prefs, updatePrefs } = useStudy();
  return (
    <div className="max-w-4xl">
      <h3 className="mb-3 text-[0.9375rem] font-extrabold text-ink">Theme</h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Theme">
        {themes.map((t) => {
          const [page, card, side, accent] = t.swatch;
          const on = prefs.theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => updatePrefs({ theme: t.id })}
              className={cx("rounded-2xl border-2 p-3 text-left transition-colors", on ? "border-pink-strong bg-pink-soft/40" : "border-line hover:border-line-strong")}
            >
              {/* mini preview of the app in this theme */}
              <div className="flex h-20 overflow-hidden rounded-xl" style={{ background: page }} aria-hidden="true">
                <div className="flex w-1/4 flex-col gap-1.5 p-2" style={{ background: side }}>
                  <span className="h-1.5 w-3/4 rounded-full bg-white/70" />
                  <span className="h-1.5 w-1/2 rounded-full bg-white/40" />
                  <span className="h-1.5 w-2/3 rounded-full bg-white/40" />
                </div>
                <div className="m-2 flex flex-1 flex-col justify-between rounded-lg p-2" style={{ background: card }}>
                  <div className="h-2 w-2/3 rounded-full" style={{ background: accent }} />
                  <div className="h-1.5 w-1/2 rounded-full opacity-40" style={{ background: side }} />
                  <div className="h-4 w-12 self-end rounded-md" style={{ background: accent }} />
                </div>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-extrabold text-ink">
                <Icon name={t.mode === "dark" ? "moon" : "sun"} size={15} /> {t.name}
                {on && <Icon name="check" size={15} strokeWidth={2.6} className="ml-auto text-pink-strong" />}
              </p>
              <p className="text-xs text-ink-soft">{t.body}</p>
            </button>
          );
        })}
      </div>
      <OwnPictures />

      <div className="mt-4 max-w-2xl divide-y divide-line">
        <Row title="Theme animations" body="Falling petals, twinkling stars, neon lights… each theme has its own. Paused while you read or answer.">
          <Toggle checked={prefs.ambience} onChange={(v) => updatePrefs({ ambience: v })} label="Theme animations" />
        </Row>
        <Row title="Reduce motion" body="Turn off floating mascots, theme animations and transitions.">
          <Toggle checked={prefs.reduceMotion} onChange={(v) => updatePrefs({ reduceMotion: v })} label="Reduce motion" />
        </Row>
      </div>
    </div>
  );
}

const STRENGTHS = [
  { value: 0.35, label: "Soft" },
  { value: 0.6, label: "Medium" },
  { value: 0.9, label: "Bold" },
];

function PictureSlot({
  title,
  body,
  url,
  busy,
  onPick,
  onRemove,
  children,
}: {
  title: string;
  body: string;
  url: string | null;
  busy: boolean;
  onPick: (f: File) => void;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-4 py-4">
      <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-panel-2">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- the person's own uploaded picture
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon name="camera" size={20} className="text-ink-faint" />
        )}
      </div>
      <div className="min-w-48 flex-1">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="text-xs text-ink-soft">{body}</p>
        {children}
      </div>
      <div className="flex gap-2">
        <Button size="sm" icon="upload" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Saving…" : url ? "Change" : "Upload"}
        </Button>
        {url && (
          <Button size="sm" variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

/** Personal pictures: saved only in this browser (IndexedDB), never uploaded anywhere. */
function OwnPictures() {
  const { prefs, updatePrefs } = useStudy();
  const bgUrl = useStoredImage(prefs.customBg?.id, prefs.customBg?.v);
  const mascotUrl = useStoredImage(prefs.customMascot?.id, prefs.customMascot?.v);
  const [busy, setBusy] = useState<"bg" | "mascot" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (slot: "bg" | "mascot", file: File) => {
    setBusy(slot);
    setError(null);
    try {
      const blob = await shrinkImage(file, slot === "bg" ? 2400 : 640);
      const id = slot === "bg" ? "custom-bg" : "custom-mascot";
      await saveFile(id, blob);
      if (slot === "bg") updatePrefs({ customBg: { id, v: Date.now(), strength: prefs.customBg?.strength ?? 0.6 } });
      else updatePrefs({ customMascot: { id, v: Date.now() } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that picture.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-6 max-w-2xl">
      <h3 className="text-[0.9375rem] font-extrabold text-ink">Your own picture</h3>
      <p className="mt-0.5 text-xs text-ink-soft">Personalise the app with your own wallpaper or mascot. Pictures stay in this browser only — they&apos;re never uploaded or shared.</p>
      <div className="mt-1 divide-y divide-line">
        <PictureSlot
          title="Background picture"
          body="Shown behind everything, under your theme colours."
          url={bgUrl}
          busy={busy === "bg"}
          onPick={(f) => upload("bg", f)}
          onRemove={() => {
            void deleteFile("custom-bg");
            updatePrefs({ customBg: null });
          }}
        >
          {prefs.customBg && (
            <div role="radiogroup" aria-label="How visible the background is" className="mt-2 inline-flex rounded-lg bg-panel-2 p-0.5">
              {STRENGTHS.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  role="radio"
                  aria-checked={prefs.customBg?.strength === st.value}
                  onClick={() => prefs.customBg && updatePrefs({ customBg: { ...prefs.customBg, strength: st.value } })}
                  className={cx("rounded-md px-2.5 py-1 text-xs font-bold", prefs.customBg?.strength === st.value ? "bg-panel text-ink shadow-sm" : "text-ink-soft")}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </PictureSlot>
        <PictureSlot
          title="Sidebar picture"
          body="Replaces the little scene at the bottom of the sidebar. A PNG with a transparent background looks best."
          url={mascotUrl}
          busy={busy === "mascot"}
          onPick={(f) => upload("mascot", f)}
          onRemove={() => {
            void deleteFile("custom-mascot");
            updatePrefs({ customMascot: null });
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
    </section>
  );
}

function SettingsTab() {
  const { prefs, updatePrefs } = useStudy();
  const current = prefs.fontScale || 1;
  return (
    <div className="max-w-2xl">
      <h3 className="text-[0.9375rem] font-extrabold text-ink">Text size</h3>
      <p className="mt-0.5 text-xs text-ink-soft">Makes all text, buttons and spacing larger or smaller across the app.</p>
      <div role="radiogroup" aria-label="Text size" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {fontScales.map((f) => {
          const on = current === f.value;
          return (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => updatePrefs({ fontScale: f.value })}
              className={cx("flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 transition-colors", on ? "border-pink-strong bg-pink-soft/40" : "border-line hover:border-line-strong")}
            >
              {/* fixed px so each sample shows its own size, whatever is selected */}
              <span className="font-extrabold leading-none text-ink" style={{ fontSize: `${Math.round(18 * f.value)}px` }}>
                Aa
              </span>
              <span className="text-xs font-bold text-ink-soft">{f.label}</span>
              <span className="text-[0.625rem] text-ink-faint">{Math.round(f.value * 100)}%</span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 divide-y divide-line border-t border-line">
        <Row title="Hint buddy" body="Show Mochi the cat on questions. Mochi gives nudges and analogies — never the answer. Hints halve that question's XP in practice.">
          <Toggle checked={prefs.hints} onChange={(v) => updatePrefs({ hints: v })} label="Hint buddy" />
        </Row>
      </div>

      <div className="mt-4 rounded-xl bg-panel-2/60 p-4">
        <p className="text-xs font-bold text-ink-faint">Preview</p>
        <p className="mt-1 text-base font-extrabold text-ink">Lesson 1 · Laplace Transform</p>
        <p className="text-sm text-ink-soft">A little progress every day adds up to big results.</p>
      </div>
    </div>
  );
}

function NotificationPrefs() {
  const { prefs, updatePrefs } = useStudy();
  return (
    <div className="max-w-2xl divide-y divide-line">
      <Row title="Daily plan" body="Remind me about tasks left in today's plan.">
        <Toggle checked={prefs.notifyPlan} onChange={(v) => updatePrefs({ notifyPlan: v })} label="Daily plan reminders" />
      </Row>
      <Row title="Quizzes" body="Tell me about new quizzes and attempts still in progress.">
        <Toggle checked={prefs.notifyQuizzes} onChange={(v) => updatePrefs({ notifyQuizzes: v })} label="Quiz notifications" />
      </Row>
      <Row title="Milestones" body="Celebrate finished modules and high scores.">
        <Toggle checked={prefs.notifyMilestones} onChange={(v) => updatePrefs({ notifyMilestones: v })} label="Milestone notifications" />
      </Row>
    </div>
  );
}

function Privacy() {
  const s = useStudy();
  const [confirm, setConfirm] = useState<"demo" | "fresh" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const { modules, lessons, quizzes, attempts, active, lessonProgress, plan, recent, profile, prefs, readNotifications, mistakes } = s;
    const data = { version: 1, modules, lessons, quizzes, attempts, active, lessonProgress, plan, recent, profile, prefs, readNotifications, mistakes };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    Object.assign(document.createElement("a"), { href: url, download: `inori-study-backup-${new Date().toISOString().slice(0, 10)}.json` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="max-w-2xl">
      <p className="mb-2 rounded-xl bg-lav-soft/60 px-3 py-2.5 text-xs text-ink-soft">
        Everything — including uploaded PDFs — is stored only in this browser. Nothing is sent to a server.
      </p>
      <div className="divide-y divide-line">
        <Row title="Remember recently accessed" body="Show lessons and quizzes you opened on the Home page.">
          <Toggle checked={s.prefs.trackRecent} onChange={(v) => s.updatePrefs({ trackRecent: v })} label="Remember recently accessed" />
        </Row>
        <Row title="Clear recent history" body={`${s.recent.length} item${s.recent.length === 1 ? "" : "s"} saved.`}>
          <Button variant="outline" size="sm" onClick={s.clearRecent} disabled={s.recent.length === 0}>
            Clear
          </Button>
        </Row>
        <Row title="Export my data" body="Download a JSON backup of modules, notes, quizzes and progress (PDF files not included).">
          <Button variant="outline" size="sm" icon="download" onClick={exportData}>
            Export
          </Button>
        </Row>
        <Row title="Import a backup" body="Replace everything here with a previously exported file.">
          <Button variant="outline" size="sm" icon="upload" onClick={() => importInput.current?.click()}>
            Import
          </Button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                s.importState(await f.text());
                setMsg({ ok: true, text: "Backup imported." });
              } catch (err) {
                setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't read that file." });
              }
            }}
          />
        </Row>
        <Row title="Reset to demo data" body="Bring back the sample modules, lessons and quizzes.">
          <Button variant="outline" size="sm" icon="refresh" onClick={() => setConfirm("demo")}>
            Reset
          </Button>
        </Row>
        <Row title="Start fresh" body="Delete all modules, lessons, quizzes and progress. Your profile is kept.">
          <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirm("fresh")}>
            Delete all
          </Button>
        </Row>
      </div>
      {msg && <p className={cx("mt-3 text-sm font-semibold", msg.ok ? "text-teal" : "text-danger")}>{msg.text}</p>}
      <Confirm
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "demo" ? "Reset to demo data?" : "Delete everything?"}
        body={
          confirm === "demo"
            ? "Your modules, lessons, uploaded PDFs, quizzes and progress will be replaced with the sample content."
            : "All modules, lessons, uploaded PDFs, quizzes and progress will be permanently deleted from this browser."
        }
        confirmLabel={confirm === "demo" ? "Reset" : "Delete all"}
        onConfirm={() => {
          if (confirm === "demo") s.resetDemo();
          else s.startFresh();
          setMsg({ ok: true, text: confirm === "demo" ? "Demo data restored." : "All clear — a fresh start!" });
        }}
      />
    </div>
  );
}
