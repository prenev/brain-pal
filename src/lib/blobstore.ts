/** Tiny IndexedDB blob store for local mode (localStorage can't hold audio/photos). */
const DB = 'brainpal-media', STORE = 'blobs'

let conn: Promise<IDBDatabase> | null = null

/** One shared connection (parallel opens during a big list load were a source of flaky reads). */
function open(): Promise<IDBDatabase> {
  conn ??= new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => {
      r.result.onversionchange = () => { r.result.close(); conn = null }
      r.result.onclose = () => { conn = null }
      res(r.result)
    }
    r.onerror = () => { conn = null; rej(r.error) }
  })
  return conn
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    t.oncomplete = () => res(req.result)
    t.onerror = t.onabort = () => rej(t.error)
  })
}

const urls = new Map<string, string>()

export const putBlob = (key: string, blob: Blob) => tx('readwrite', s => s.put(blob, key)).then(() => undefined)
export const getBlob = (key: string) => tx<Blob | undefined>('readonly', s => s.get(key))
export async function deleteBlob(key: string) {
  const u = urls.get(key); if (u) { URL.revokeObjectURL(u); urls.delete(key) }
  await tx('readwrite', s => s.delete(key))
}

/** Object URL for a stored blob (cached so repeated lists don't leak URLs); null if missing. */
export async function blobUrl(key: string): Promise<string | null> {
  const hit = urls.get(key); if (hit) return hit
  const b = await getBlob(key).catch(() => undefined)
  if (!b) return null
  const u = URL.createObjectURL(b); urls.set(key, u); return u
}
