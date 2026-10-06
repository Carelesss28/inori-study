"use client";

import { useState } from "react";
import { useStudy } from "@/lib/store";
import type { CoverArt, Module } from "@/lib/types";
import { ModuleCover, coverChoices } from "@/components/art/Illustrations";
import { Button, Field, Modal, cx, inputClass } from "@/components/ui/primitives";

/** Create a module (no `module`) or edit one. Mount with a `key` so it resets per target. */
export function ModuleFormModal({
  open,
  onClose,
  module,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  module?: Module;
  onCreated?: (id: string) => void;
}) {
  const { addModule, updateModule } = useStudy();
  const [title, setTitle] = useState(module?.title ?? "");
  const [description, setDescription] = useState(module?.description ?? "");
  const [cover, setCover] = useState<CoverArt>(module?.cover ?? "notebook");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const input = { title: title.trim(), description: description.trim(), cover };
    if (module) updateModule(module.id, input);
    else onCreated?.(addModule(input));
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={module ? "Edit module" : "New module"} wide>
      <form onSubmit={save} className="space-y-4">
        <Field label="Module name">
          <input autoFocus className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Signals & Systems" required />
        </Field>
        <Field label="Description">
          <textarea className={cx(inputClass, "min-h-20 resize-y")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this module about?" />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-xs font-bold text-ink-soft">Cover illustration</legend>
          <div className="grid grid-cols-3 gap-2">
            {coverChoices.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cover: ${c}`}
                aria-pressed={cover === c}
                onClick={() => setCover(c)}
                className={cx("overflow-hidden rounded-xl border-2 transition-all", cover === c ? "border-pink-strong ring-2 ring-pink/40" : "border-transparent opacity-80 hover:opacity-100")}
              >
                <ModuleCover art={c} className="block aspect-[12/7] w-full" />
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{module ? "Save changes" : "Create module"}</Button>
        </div>
      </form>
    </Modal>
  );
}
