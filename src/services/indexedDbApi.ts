// src/services/indexedDbApi.ts
import { IRtxDataSource } from '../data/IRtxDataSource';
import { Project, Experiment } from '../models';

export class IndexedDbApi implements IRtxDataSource {
    private dbPromise?: Promise<IDBDatabase>;

    constructor(private dbName: string = 'MyDatabase', private version: number = 1) {
        // No automatic DB open here.
    }

    // Call this method when you're ready to initialize
    init(): Promise<IDBDatabase> {
        if (!this.dbPromise) {
            this.dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.version);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains('projects')) {
                        // Using 'name' as key for projects.
                        db.createObjectStore('projects', { keyPath: 'name' });
                    }
                    if (!db.objectStoreNames.contains('experiments')) {
                        // Using a valid key, e.g., 'ref', instead of '@ref'.
                        db.createObjectStore('experiments', { keyPath: 'ref' });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
        return this.dbPromise;
    }

    private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
        if (!this.dbPromise) {
            await this.init();
        }
        const db = await this.dbPromise!;
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    async getProjects(): Promise<Project[]> {
        const store = await this.getStore('projects');
        return new Promise<Project[]>((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const projects: Project[] = (request.result as any[]).map(record => ({
                    name: record.name,
                    experiments: []
                }));
                resolve(projects);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getExperiments(projectName: string): Promise<Experiment[]> {
        const store = await this.getStore('experiments');
        return new Promise<Experiment[]>((resolve, reject) => {
            const result: Experiment[] = [];
            const request = store.openCursor();
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    const record = cursor.value as any;
                    if (record.projectName === projectName) {
                        result.push(record);
                    }
                    cursor.continue();
                } else {
                    resolve(result);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
}