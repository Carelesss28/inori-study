"use client";

// Uploaded PDFs live in IndexedDB — they are far too large for localStorage.
const DB_NAME = "inori-study-files";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

export function saveFile(id: string, blob: Blob) {
  return run("readwrite", (s) => s.put(blob, id));
}

export function loadFile(id: string): Promise<Blob | undefined> {
  return run<Blob | undefined>("readonly", (s) => s.get(id));
}

export function deleteFile(id: string) {
  return run("readwrite", (s) => s.delete(id)).catch(() => undefined);
}

/** Deletes uploaded lesson PDFs. Personal pictures ("custom-…") are kept — they're settings, not study data. */
export async function clearFiles() {
  try {
    const keys = await run<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
    await Promise.all(keys.filter((k) => !String(k).startsWith("custom-")).map((k) => deleteFile(String(k))));
  } catch {
    // nothing stored yet
  }
}
