// src/utils/myIDB.ts
import { openDB, IDBPDatabase, DBSchema } from 'idb';

export interface ProjectDB extends DBSchema {
    doseResponseExperiments: {
        key: number;
        value: {
            ref: number;
            name: string;
            projectName: string;
            // ... other fields
        };
        indexes: { 'by-projectName': string };
    };
    categoryAnalysisResults: {
        key: number;
        value: {
            id: number;
            name: string;
            "@ref": number;
            "@type": string;
            bmdResult: number;
            categoryAnalsyisResults: any[];
            // ... other fields as needed
        };
        indexes: { 'by-name': string };
    };
    // Define other object stores as needed.
}

/**
 * Opens an IndexedDB database for the given project name.
 * If version is provided, it opens with that version; otherwise, it opens the existing database.
 */
export async function openProjectDB(projectName: string, version?: number): Promise<IDBPDatabase<ProjectDB>> {
    if (version) {
        return openDB<ProjectDB>(projectName, version, {
            upgrade(db: IDBPDatabase<ProjectDB>) {
                if (!db.objectStoreNames.contains('doseResponseExperiments')) {
                    const store = db.createObjectStore('doseResponseExperiments', { keyPath: 'ref' });
                    store.createIndex('by-projectName', 'projectName');
                }
                if (!db.objectStoreNames.contains('categoryAnalysisResults')) {
                    const store = db.createObjectStore('categoryAnalysisResults', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('by-name', 'name');
                }
            }
        });
    } else {
        return openDB<ProjectDB>(projectName);
    }
}