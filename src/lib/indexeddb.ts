// IndexedDB utility for storing API key
const DB_NAME = 'ai-chat-app';
const DB_VERSION = 1;
const STORE_NAME = 'settings';
const KEY_NAME = 'apiKey';

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
	});
}

/**
 * Save API key to IndexedDB
 */
export async function saveApiKey(key: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.put(key, KEY_NAME);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

/**
 * Load API key from IndexedDB
 * @returns The stored API key or null if not found
 */
export async function loadApiKey(): Promise<string | null> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get(KEY_NAME);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result || null);
	});
}

/**
 * Delete API key from IndexedDB
 */
export async function deleteApiKey(): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.delete(KEY_NAME);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}
