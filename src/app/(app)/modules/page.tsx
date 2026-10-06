"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStudy } from "@/lib/store";
import { lessonsOf, modulePercent } from "@/lib/derive";
import type { Module } from "@/lib/types";
import { BlossomBranch, Bunny, ModuleCover } from "@/components/art/Illustrations";
import { Icon } from "@/components/ui/Icon";
import { Button, Confirm, EmptyState, Menu, ProgressBar } from "@/components/ui/primitives";
import { PageHeader } from "@/components/shell/Shell";
import { ModuleFormModal } from "@/components/lms/ModuleForm";

export default function ModulesPage() {
  const s = useStudy();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Module | "new" | null>(null);
  const [deleting, setDeleting] = useState<Module | null>(null);

  const term = query.trim().toLowerCase();
  const modules = s.modules.filter((m) => !term || m.title.toLowerCase().includes(term) || m.description.toLowerCase().includes(term));

  return (
    <div className="relative">
      <BlossomBranch className="pointer-events-none absolute -top-7 right-28 hidden w-56 opacity-80 md:block" />
      <PageHeader title="Modules" subtitle="Choose a module to view lessons and study materials." />

      <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-10 w-full max-w-xs items-center gap-2 rounded-xl border border-line-strong bg-panel px-3 text-ink-soft focus-within:ring-2 focus-within:ring-lav/30">
          <Icon name="search" size={16} />
          <span className="sr-only">Search modules</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search modules..." className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none" />
        </label>
        <Button icon="plus" onClick={() => setEditing("new")}>
          New Module
        </Button>
      </div>

      {s.modules.length === 0 ? (
        <EmptyState
          art={<Bunny className="h-28 w-24" />}
          title="No modules yet"
          body="Create your first module, then add lessons (upload your PDFs) and quizzes to it."
          action={
            <Button icon="plus" onClick={() => setEditing("new")}>
              Create a module
            </Button>
          }
        />
      ) : modules.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-soft">No modules match “{query}”.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => {
            const pct = modulePercent(s, m.id);
            const count = lessonsOf(s, m.id).length;
            return (
              <div key={m.id} className="card group p-3 transition-transform hover:-translate-y-0.5">
                <Link href={`/modules/${m.id}`} tabIndex={-1} aria-hidden="true" className="block overflow-hidden rounded-xl">
                  <ModuleCover art={m.cover} className="block aspect-[12/7] w-full transition-transform duration-300 group-hover:scale-[1.03]" />
                </Link>
                <div className="px-1.5 pb-1 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/modules/${m.id}`} className="min-w-0 flex-1">
                      <h2 className="truncate text-[0.9375rem] font-extrabold text-ink group-hover:underline">{m.title}</h2>
                      <p className="text-xs font-semibold text-ink-soft">
                        {count} Lesson{count === 1 ? "" : "s"}
                      </p>
                    </Link>
                    <Menu
                      label={`Options for ${m.title}`}
                      className="-mr-1.5 -mt-1"
                      items={[
                        { label: "Edit module", icon: "pencil", onSelect: () => setEditing(m) },
                        { label: "Delete module", icon: "trash", danger: true, onSelect: () => setDeleting(m) },
                      ]}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={pct} label={`${m.title} progress`} />
                    <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums text-ink-soft">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-line-strong text-ink-soft transition-colors hover:border-pink hover:bg-panel/60 hover:text-ink"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-soft text-pink-strong">
              <Icon name="plus" size={22} />
            </span>
            <span className="text-sm font-bold">Add a module</span>
          </button>
        </div>
      )}

      {editing && (
        <ModuleFormModal
          key={editing === "new" ? "new" : editing.id}
          open
          onClose={() => setEditing(null)}
          module={editing === "new" ? undefined : editing}
          onCreated={(id) => router.push(`/modules/${id}`)}
        />
      )}
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete module?"
        body={`“${deleting?.title}” and all of its lessons, uploaded PDFs, quizzes and quiz history will be removed. This can't be undone.`}
        onConfirm={() => deleting && s.deleteModule(deleting.id)}
      />
    </div>
  );
}
