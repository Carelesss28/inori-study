# Inori Study 🐰

A cozy, pastel study companion / LMS: modules → lessons (uploaded PDFs or written notes with maths) → quizzes (MCQ, multi-answer, fill-in-the-blank), with progress tracking.

```bash
npm install
npm run dev     # http://localhost:3000
```

## What's inside

| Screen | Route |
| --- | --- |
| Home — greeting, live clock, today's plan, progress overview, recently accessed, search | `/` |
| Modules grid (create / edit / delete) | `/modules` |
| Module — lessons (add, reorder, mark done) and its quizzes | `/modules/[moduleId]` |
| Lesson viewer — thumbnails, paging, zoom, fullscreen, resume, PDF download | `/modules/[moduleId]/lessons/[lessonId]` |
| Quizzes list with module filter | `/quizzes` |
| Quiz builder | `/quizzes/new`, `/quizzes/[quizId]/edit` |
| Take a quiz — timer, question navigator, autosave | `/quizzes/[quizId]` |
| Results — score, performance by type, answer review | `/quizzes/[quizId]/results/[attemptId]` |
| Progress | `/progress` |
| Profile — account, theme (Blossom / Dusk), notifications, data export/import/reset | `/profile` |

## How data is stored

Everything lives in the browser — no server or account needed:

- App state (modules, notes, quizzes, attempts, progress, profile) → `localStorage` (`inori-study-v1`), see `src/lib/store.tsx`.
- Uploaded PDFs → IndexedDB, see `src/lib/files.ts`.

First launch loads demo content (`src/lib/seed-content.ts`). Profile → Privacy can reset to the demo, start fresh, or export/import a JSON backup.

## Writing notes lessons

```
# Heading
Paragraph with inline maths $e^{-st}$ and `code`.
$$ \int_0^\infty e^{-st} f(t)\,dt $$
- bullet
> highlighted note
---            ← new page
```

## Notes

- PDFs render with `pdfjs-dist`; its worker is copied to `public/` by `scripts/copy-pdf-worker.mjs` before `dev`/`build`.
- Maths renders with KaTeX. All illustrations are hand-drawn inline SVG in `src/components/art/Illustrations.tsx`.

## Classrooms (shared, online)

Teachers create a class and share its 6-letter code; students join with the code and their name (no passwords).
Each class is a channel-style feed: the teacher posts announcements and question sets (write them or import a CSV),
students answer sets one question at a time with instant feedback, and the teacher's **Grades** tab shows every
student × question plus progress graphs. Personal modules/quizzes stay local; only classroom data is online.

**One-time database setup (Supabase):**
1. Supabase dashboard → project **Inori Study** → **SQL Editor** → New query.
2. Paste all of [`supabase/classrooms.sql`](supabase/classrooms.sql) → **Run**.
3. Make sure `.env.local` has the two values from `.env.example` (already filled in for this project). Restart `npm run dev`.

## Deploy to Vercel

1. Push this folder to a GitHub repo. It must be its own repo: right now it sits inside a git repo covering your whole home folder, so run `git init` inside this folder first.
2. On vercel.com → **Add New → Project** → import the repo (framework: Next.js, defaults are fine).
3. In **Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same values as `.env.local`), then deploy.

Students then use the `*.vercel.app` link from any device; your laptop can be off.
