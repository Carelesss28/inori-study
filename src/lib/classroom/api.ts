"use client";

import type { AnswerValue, Question, QuestionResult } from "@/lib/types";

/* ------------------------------------------------------------------ types */

export type Role = "teacher" | "student";

export interface Me {
  id: string;
  secret: string;
  name: string;
}

export interface ClassroomSummary {
  id: string;
  name: string;
  description: string;
  code: string | null;
  join_open: boolean;
  created_at: string;
  role: Role;
  teacher_name: string;
  member_count: number;
  set_count: number;
  done_count: number;
  last_post_at: string | null;
  last_post: string | null;
}

export interface Post {
  id: string;
  kind: "announcement" | "set";
  body: string;
  set_id: string | null;
  pinned: boolean;
  created_at: string;
}

export interface QuestionSet {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface SetAttempt {
  id: string;
  set_id: string;
  person_id: string;
  answers: Record<string, AnswerValue>;
  results: QuestionResult[];
  score: number;
  started_at: string;
  finished_at: string;
}

export interface Member {
  person_id: string;
  display_name: string;
  joined_at: string;
}

export interface ClassroomDetail {
  role: Role;
  classroom: {
    id: string;
    name: string;
    description: string;
    code: string | null;
    join_open: boolean;
    created_at: string;
    teacher_name: string;
  };
  member_count: number;
  members: Member[];
  posts: Post[];
  sets: QuestionSet[];
  attempts: SetAttempt[];
  set_progress: Record<string, number>;
}

/* ------------------------------------------------------------------ transport */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const classroomsConfigured = Boolean(URL && KEY);

const friendly: Record<string, string> = {
  not_authorized: "This device's classroom identity isn't recognised. Set your name up again.",
  not_teacher: "Only the teacher of this classroom can do that.",
  not_member: "You're not a member of this classroom (anymore).",
  class_not_found: "No classroom has that code. Check it with your teacher.",
  class_closed: "This classroom isn't accepting new students right now.",
  own_class: "That's your own classroom — you're already its teacher.",
  set_not_found: "That question set no longer exists.",
  set_not_available: "That question set isn't available anymore.",
  post_not_found: "That post no longer exists.",
  empty_post: "Write something first.",
};

export class ClassroomError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
  }
}

/** Calls one of the classroom functions in supabase/classrooms.sql. */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!URL || !KEY) throw new ClassroomError("Classrooms aren't configured — add the Supabase keys to .env.local.", "not_configured");
  let res: Response;
  try {
    res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
  } catch {
    throw new ClassroomError("Can't reach the classroom server. Check your internet connection.", "offline");
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message: string = body?.message ?? "";
    if (body?.code === "PGRST202" || body?.code === "42883") {
      throw new ClassroomError("The classroom database isn't set up yet — run supabase/classrooms.sql in the Supabase SQL editor.", "not_setup");
    }
    throw new ClassroomError(friendly[message] ?? (message || `Request failed (${res.status}).`), message || String(res.status));
  }
  return body as T;
}

const auth = (me: Me) => ({ p_person: me.id, p_secret: me.secret });

export const api = {
  register: (name: string) => rpc<Me>("register_person", { p_name: name }),
  whoami: (id: string, secret: string) => rpc<{ id: string; name: string }>("whoami", { p_person: id, p_secret: secret }),
  rename: (me: Me, name: string) => rpc<void>("rename_person", { ...auth(me), p_name: name }),

  myClassrooms: (me: Me) => rpc<ClassroomSummary[]>("my_classrooms", auth(me)),
  detail: (me: Me, classroomId: string) => rpc<ClassroomDetail>("classroom_detail", { ...auth(me), p_classroom: classroomId }),
  create: (me: Me, name: string, description: string) => rpc<string>("create_classroom", { ...auth(me), p_name: name, p_description: description }),
  update: (me: Me, classroomId: string, name: string, description: string, joinOpen: boolean) =>
    rpc<void>("update_classroom", { ...auth(me), p_classroom: classroomId, p_name: name, p_description: description, p_join_open: joinOpen }),
  regenerateCode: (me: Me, classroomId: string) => rpc<string>("regenerate_code", { ...auth(me), p_classroom: classroomId }),
  remove: (me: Me, classroomId: string) => rpc<void>("delete_classroom", { ...auth(me), p_classroom: classroomId }),
  join: (me: Me, code: string, displayName: string) => rpc<string>("join_classroom", { ...auth(me), p_code: code, p_display_name: displayName }),
  leave: (me: Me, classroomId: string) => rpc<void>("leave_classroom", { ...auth(me), p_classroom: classroomId }),
  removeMember: (me: Me, classroomId: string, memberId: string) =>
    rpc<void>("remove_member", { ...auth(me), p_classroom: classroomId, p_member: memberId }),

  postAnnouncement: (me: Me, classroomId: string, body: string) => rpc<string>("post_announcement", { ...auth(me), p_classroom: classroomId, p_body: body }),
  pinPost: (me: Me, postId: string, pinned: boolean) => rpc<void>("pin_post", { ...auth(me), p_post: postId, p_pinned: pinned }),
  deletePost: (me: Me, postId: string) => rpc<void>("delete_post", { ...auth(me), p_post: postId }),

  saveSet: (me: Me, classroomId: string, setId: string | null, title: string, description: string, questions: Question[], published: boolean) =>
    rpc<string>("save_set", {
      ...auth(me),
      p_classroom: classroomId,
      p_set: setId,
      p_title: title,
      p_description: description,
      p_questions: questions,
      p_published: published,
    }),
  deleteSet: (me: Me, setId: string) => rpc<void>("delete_set", { ...auth(me), p_set: setId }),
  setPublished: (me: Me, setId: string, published: boolean) => rpc<void>("set_published", { ...auth(me), p_set: setId, p_published: published }),
  submitAttempt: (me: Me, setId: string, answers: Record<string, AnswerValue>, results: QuestionResult[], score: number, startedAt: number) =>
    rpc<string>("submit_set_attempt", {
      ...auth(me),
      p_set: setId,
      p_answers: answers,
      p_results: results,
      p_score: score,
      p_started_at: new Date(startedAt).toISOString(),
    }),
};
