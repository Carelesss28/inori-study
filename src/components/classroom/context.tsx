"use client";

import { createContext, useContext } from "react";
import type { ClassroomDetail, Me } from "@/lib/classroom/api";

export interface ClassroomCtx {
  me: Me;
  classId: string;
  data: ClassroomDetail;
  refresh: () => void;
}

export const ClassroomContext = createContext<ClassroomCtx | null>(null);

export function useClassroom() {
  const ctx = useContext(ClassroomContext);
  if (!ctx) throw new Error("useClassroom must be used inside a classroom page");
  return ctx;
}
