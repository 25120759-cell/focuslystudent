// Tiny IndexedDB wrapper for offline-first persistence of AI artifacts.
// No deps. Stores blobs keyed by (kind, ref_id) and syncs with the cloud `ai_artifacts` table.

const DB_NAME = "focusly-ai-cache";
const DB_VERSION = 1;
const STORE = "artifacts";

type ArtifactRow = {
  // local-first key: `${kind}:${ref_id}` or `${kind}:_:${localId}` when no ref_id
  key: string;
  kind: "breakdown" | "notes";
  ref_id: string | null;
  title: string;
  payload: any;
  updated_at: number; // epoch ms
  cloud_id?: string | null;
  dirty?: boolean;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB not available"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "key" });
        os.createIndex("kind", "kind", { unique: false });
        os.createIndex("ref_id", "ref_id", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    Promise.resolve(fn(store)).then((v) => { tx.oncomplete = () => resolve(v); tx.onerror = () => reject(tx.error); }).catch(reject);
  });
}

function reqAsPromise<T = any>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result as T); r.onerror = () => rej(r.error); });
}

export function makeKey(kind: "breakdown" | "notes", ref_id: string | null | undefined): string {
  return `${kind}:${ref_id ?? `_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`}`;
}

export async function saveLocal(row: Omit<ArtifactRow, "updated_at"> & { updated_at?: number }) {
  try {
    await withStore("readwrite", async (s) => {
      await reqAsPromise(s.put({ ...row, updated_at: row.updated_at ?? Date.now(), dirty: row.dirty ?? true } as ArtifactRow));
    });
  } catch (e) {
    // localStorage fallback for very restricted browsers
    try { localStorage.setItem(`focusly-ai:${row.key}`, JSON.stringify({ ...row, updated_at: Date.now() })); } catch {}
  }
}

export async function getLocal(key: string): Promise<ArtifactRow | null> {
  try {
    return (await withStore("readonly", (s) => reqAsPromise(s.get(key)))) ?? null;
  } catch {
    try { const raw = localStorage.getItem(`focusly-ai:${key}`); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}

export async function listLocal(kind?: "breakdown" | "notes"): Promise<ArtifactRow[]> {
  try {
    return await withStore("readonly", async (s) => {
      const all: ArtifactRow[] = await reqAsPromise(s.getAll());
      return (kind ? all.filter((r) => r.kind === kind) : all).sort((a, b) => b.updated_at - a.updated_at);
    });
  } catch {
    return [];
  }
}

export async function deleteLocal(key: string) {
  try { await withStore("readwrite", (s) => reqAsPromise(s.delete(key))); } catch {}
  try { localStorage.removeItem(`focusly-ai:${key}`); } catch {}
}

export async function markClean(key: string, cloudId: string) {
  try {
    await withStore("readwrite", async (s) => {
      const r: ArtifactRow | undefined = await reqAsPromise(s.get(key));
      if (r) await reqAsPromise(s.put({ ...r, cloud_id: cloudId, dirty: false }));
    });
  } catch {}
}

export async function listDirty(): Promise<ArtifactRow[]> {
  const all = await listLocal();
  return all.filter((r) => r.dirty);
}
