// src/api/IndexedDBStore.ts

import { DataStore } from './DataStore';

export class IndexedDBStore implements DataStore {
    private dbName = 'myAppDB';
    private storeName = 'userData';

    private openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (e) => {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async save(data: any): Promise<void> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.add({ data });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async load(): Promise<any> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}