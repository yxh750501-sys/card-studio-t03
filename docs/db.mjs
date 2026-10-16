const DB_NAME = 'card-studio-t03';
const STORE = 'templates';
let databasePromise;

function open() {
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

async function transaction(mode, action) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result;
    try { result = action(store); } catch (error) { tx.abort(); reject(error); return; }
    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || Error('저장 작업이 중단되었습니다.'));
  });
}

export const listTemplates = async () => (await transaction('readonly', store => store.getAll())).sort((a,b) => b.updatedAt - a.updatedAt);
export const putTemplate = value => transaction('readwrite', store => store.put(value));
export const deleteTemplate = id => transaction('readwrite', store => store.delete(id));
export const replaceTemplates = values => transaction('readwrite', store => {
  store.clear();
  for (const value of values) store.put(value);
});
