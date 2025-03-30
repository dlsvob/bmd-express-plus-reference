// src/data/IndexedDbApi.ts
import { IRtxDataSource } from './IRtxDataSource';
import { Project, Experiment } from '../models';

/**
 * Experimental helper: returns a list of existing database names.
 */
async function getExistingDatabaseNames(): Promise<string[]> {
    if (indexedDB.databases) {
        const dbs = await indexedDB.databases();
        // Filter out entries with no name.
        return dbs.map(db => db.name).filter((name): name is string => !!name);
    }
    return [];
}

/**
 * IndexedDbApi now opens an existing database rather than creating a new one.
 * If no database name is provided, it uses indexedDB.databases() to get available names.
 * If no databases exist, it throws an error so you can notify the user.
 */
export class IndexedDbApi implements IRtxDataSource {
    private dbPromise: Promise<IDBDatabase>;

    constructor(private dbName?: string, private version: number = 100) {
        const namePromise = this.dbName
            ? Promise.resolve(this.dbName)
            : getExistingDatabaseNames().then(names => {
                if (names.length === 0) {
                    throw new Error("No existing IndexedDB databases found. Please import data.");
                }
                // Use the first available database name.
                return names[0];
            });

        this.dbPromise = namePromise.then(name => {
            return new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open(name, this.version);
                request.onupgradeneeded = () => {
                    // If this fires, it means the version number is higher than that of the existing database.
                    // Since our database is pre-populated, we don't expect an upgrade.
                    reject(new Error("Database upgrade was needed. The database might not be in the expected state."));
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        });
    }

    private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
        const db = await this.dbPromise;
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    async getProjects(): Promise<Project[]> {
        const store = await this.getStore('projects');
        return new Promise<Project[]>((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                // Map each record to our Project model.
                // In your case, a Project is identified solely by its name.
                const projects: Project[] = (request.result as any[]).map(record => ({
                    name: record.name,
                    experiments: [] // Experiments will be loaded on demand.
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
                    // Filter experiments that belong to the given project.
                    // Make sure that when storing experiments, you include a 'projectName' property.
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