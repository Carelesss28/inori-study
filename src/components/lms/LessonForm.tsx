"use client";

import { useState } from "react";
import { useStudy } from "@/lib/store";
import { deleteFile, saveFile } from "@/lib/files";
import { notesTemplate, parseNotes, serializeNotes } from "@/lib/notes";
import { countPdfPages } from "@/lib/pdf";
import { uid } from "@/lib/seed";
import type { Lesson, LessonSource } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Button, Field, Modal, cx, inputClass } from "@/components/ui/primitives";

type Mode = "pdf" | "notes";

/** Create a lesson in `moduleId`, or edit `lesson`. Mount with a `key` so it resets per target. */
export function LessonFormModal({ open, onClose, moduleId, lesson }: { open: boolean; onClose: () => void; moduleId: string; lesson?: Lesson }) {
  const { addLesson, updateLesson } = useStudy();
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [summary, setSummary] = useState(lesson?.summary ?? "");
  const [mode, setMode] = useState<Mode>(lesson?.source.kind ?? "pdf");
  const [text, setText] = useState(lesson?.source.kind === "notes" ? serializeNotes(lesson.source.pages) : notesTemplate);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingPdf = lesson?.source.kind === "pdf" ? lesson.source : null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    let source: LessonSource;
    if (mode === "notes") {
      const pages = parseNotes(text);
      if (pages.length === 0) return setError("Write at least one line of notes.");
      source = { kind: "notes", pages };
    } else if (file) {
      setBusy(true);
      try {
        const pageCount = await countPdfPages(file);
        const fileId = uid("pdf");
        await saveFile(fileId, file);
        if (existingPdf) void deleteFile(existingPdf.fileId);
        source = { kind: "pdf", fileId, fileName: file.name, pageCount };
      } catch {
        setBusy(false);
        return setError("That file couldn't be read as a PDF. Try another file.");
      }
      setBusy(false);
    } else if (existingPdf) {
      source = existingPdf;
    } else {
      return setError("Choose a PDF to upload.");
    }
    // switching a PDF lesson to notes frees the stored file
    if (existingPdf && source.kind === "notes") void deleteFile(existingPdf.fileId);

    const input = { title: title.trim(), summary: summary.trim(), source };
    if (lesson) updateLesson(lesson.id, input);
    else addLesson(moduleId, input);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={lesson ? "Edit lesson" : "Add lesson"} wide>
      <form onSubmit={save} className="space-y-4">
        <Field label="Lesson title">
          <input autoFocus className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fourier Series" required />
        </Field>
        <Field label="Short description">
          <input className={inputClass} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One line about what this lesson covers" />
        </Field>

        <div role="radiogroup" aria-label="Lesson material" className="grid grid-cols-2 gap-2 rounded-xl bg-panel-2 p-1">
          {(["pdf", "notes"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cx("flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold", mode === m ? "bg-panel text-ink shadow-sm" : "text-ink-soft")}
            >
              <Icon name={m === "pdf" ? "upload" : "pencil"} size={15} />
              {m === "pdf" ? "Upload PDF" : "Write notes"}
            </button>
          ))}
        </div>

        {mode === "pdf" ? (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-panel-2/50 px-4 py-7 text-center hover:border-pink">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-soft text-pink-strong">
              <Icon name="upload" size={20} />
            </span>
            <span className="text-sm font-bold text-ink">{file ? file.name : existingPdf ? `Current: ${existingPdf.fileName}` : "Choose a PDF"}</span>
            <span className="text-xs text-ink-soft">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : existingPdf ? "Pick a new file to replace it" : "Stored privately in this browser"}</span>
            <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <Field label="Notes" hint="# heading · $$ display math $$ · - bullet · > note · --- new page · inline $math$ and `code`">
            <textarea className={cx(inputClass, "min-h-64 resize-y font-mono text-[0.8125rem] leading-relaxed")} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
          </Field>
        )}

        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Reading PDF…" : lesson ? "Save changes" : "Add lesson"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
