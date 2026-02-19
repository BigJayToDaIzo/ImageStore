const DB_NAME = 'imagestore';
const DB_VERSION = 1;
const STORE_NAMES = ['settings', 'procedures', 'surgeons', 'patients', 'manifests', 'handles'] as const;

type StoreName = (typeof STORE_NAMES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

function tx(store: StoreName, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then(db => db.transaction(store, mode).objectStore(store));
}

function wrap<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  const os = await tx(store, 'readonly');
  return wrap<T | undefined>(os.get(key));
}

export async function idbSet(store: StoreName, key: string, value: unknown): Promise<void> {
  const os = await tx(store, 'readwrite');
  await wrap(os.put(value, key));
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
  const os = await tx(store, 'readwrite');
  await wrap(os.delete(key));
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const os = await tx(store, 'readonly');
  return wrap<T[]>(os.getAll());
}

export async function idbGetAllKeys(store: StoreName): Promise<string[]> {
  const os = await tx(store, 'readonly');
  return wrap(os.getAllKeys()) as Promise<string[]>;
}

export async function idbClear(store: StoreName): Promise<void> {
  const os = await tx(store, 'readwrite');
  await wrap(os.clear());
}
