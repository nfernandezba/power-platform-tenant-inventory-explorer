const DB_NAME = "pp-tenant-inventory-explorer";
const DB_VERSION = 1;
const STORE = "datasets";
const CACHE_SCHEMA_VERSION = 2;

export function datasetCacheKey(tenantId, datasetKey) {
  return `${String(tenantId || "unknown").toLowerCase()}:${datasetKey}:v${CACHE_SCHEMA_VERSION}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("tenantId", "tenantId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedDataset(tenantId, datasetKey) {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(datasetCacheKey(tenantId, datasetKey));
    request.onsuccess = () => resolve(request.result?.payload ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function setCachedDataset(tenantId, datasetKey, payload) {
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      key: datasetCacheKey(tenantId, datasetKey),
      tenantId: String(tenantId || "unknown").toLowerCase(),
      datasetKey,
      savedAt: new Date().toISOString(),
      payload
    });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function deleteCachedDataset(tenantId, datasetKey) {
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(datasetCacheKey(tenantId, datasetKey));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearTenantCache(tenantId) {
  const db = await openDatabase();
  if (!db) return;
  const normalisedTenant = String(tenantId || "unknown").toLowerCase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const index = tx.objectStore(STORE).index("tenantId");
    const request = index.openCursor(IDBKeyRange.only(normalisedTenant));
    request.onsuccess = event => {
      const cursor = event.target.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
