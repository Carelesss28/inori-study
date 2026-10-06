"use client";

import { useSyncExternalStore } from "react";
import { api, type Me } from "./api";

// Who this device is in classrooms. No passwords: a random secret issued by the server,
// kept here, and movable to another device with a "device code".
const KEY = "inori-classroom-me";
const listeners = new Set<() => void>();
let cached: Me | null | undefined;

function read(): Me | null {
  if (cached !== undefined) return cached;
  try {
    const raw = window.localStorage.getItem(KEY);
    cached = raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    cached = null;
  }
  return cached;
}

function write(me: Me | null) {
  cached = me;
  try {
    if (me) window.localStorage.setItem(KEY, JSON.stringify(me));
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage blocked — identity lasts for this tab only
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cached = undefined;
    l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** `undefined` while not yet read on the client, `null` when this device has no identity. */
export function useMe(): Me | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

export async function createIdentity(name: string) {
  const me = await api.register(name.trim());
  write(me);
  return me;
}

export async function renameIdentity(me: Me, name: string) {
  await api.rename(me, name.trim());
  write({ ...me, name: name.trim() });
}

export function forgetIdentity() {
  write(null);
}

export function deviceCode(me: Me) {
  return `INORI-${me.id}-${me.secret}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export async function restoreFromCode(code: string) {
  const m = code.trim().toLowerCase().match(new RegExp(`^inori-(${UUID})-(${UUID})$`));
  if (!m) throw new Error("That doesn't look like a device code. It starts with INORI-.");
  const who = await api.whoami(m[1], m[2]);
  const me: Me = { id: who.id, secret: m[2], name: who.name };
  write(me);
  return me;
}
