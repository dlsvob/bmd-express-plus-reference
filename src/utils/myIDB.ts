// src/utils/myIDB.ts
import { openDB, IDBPDatabase, DBSchema, IDBPTransaction, StoreNames, StoreValue, StoreKey } from 'idb'; // Import more types
import {
    ProjectData,
    DoseResponseExperiment,
    CategoryAnalysisResult,
    BMDResult,
    WilliamsTrendResult,
    // ... other BMDx types ...
} from '../models/BMDxExported';
import { ProjectInfo } from '../hooks/useProjectData';

// --- Constants for Store Names ---
export const EXP_STORE = 'doseResponseExperiments' as const;
export const CAT_ANALYSIS_STORE = 'categoryAnalysisResults' as const;
export const BMD_RESULT_STORE = 'bMDResult' as const;
export const WILLIAMS_STORE = 'williamsTrendResults' as const;
export const ANOVA_STORE = 'oneWayANOVAResults' as const;
export const CURVE_FIT_STORE = 'curveFitPrefilterResults' as const;
export const ORIOGEN_STORE = 'oriogenResults' as const;
export const META_DB_NAME = 'BMDxAppMetaDB' as const;
export const META_PROJECTS_STORE = 'projects' as const;

// --- Schemas ---
// Ensure these schemas are fully defined with correct key/value/indexes
export interface ProjectDB extends DBSchema {
    [EXP_STORE]: { key: number; value: DoseResponseExperiment; indexes: { 'by-projectName': string }; };
    [CAT_ANALYSIS_STORE]: { key: number; value: CategoryAnalysisResult; indexes: { 'by-name': string; 'by-bmdResultRef': number }; };
    [BMD_RESULT_STORE]: { key: number; value: BMDResult; indexes: { 'by-doseResponseExperiment': number }; };
    [WILLIAMS_STORE]: { key: number; value: WilliamsTrendResult; indexes: { 'by-doseResponseExperiement': number }; }; // Check spelling
    [ANOVA_STORE]: { key: number; value: any; };
    [CURVE_FIT_STORE]: { key: number; value: any; };
    [ORIOGEN_STORE]: { key: number; value: any; };
}
export interface MetaDB extends DBSchema {
    [META_PROJECTS_STORE]: { key: string; value: ProjectInfo; };
}

// --- DB Open Functions ---
export async function openProjectDB(projectName: string): Promise<IDBPDatabase<ProjectDB>> {
    const latestVersion = 1;
    return openDB<ProjectDB>(projectName, latestVersion, {
        // FIX: Explicitly type parameters for the upgrade callback
        upgrade(
            db: IDBPDatabase<ProjectDB>, // DB instance
            oldVersion: number, // Old version number
            newVersion: number | null, // New version number (can be null)
            tx: IDBPTransaction<ProjectDB, StoreNames<ProjectDB>[], "versionchange">, // Transaction
            event: IDBVersionChangeEvent // The event itself
        ) {
            console.log(`Upgrading Project DB ${projectName} from version ${oldVersion} to ${newVersion ?? latestVersion}`);
            // Perform schema changes based on oldVersion
            if (oldVersion < 1) {
                // Create stores if they don't exist
                if (!db.objectStoreNames.contains(EXP_STORE)) {
                    // Use tx.db.createObjectStore or db.createObjectStore
                    const store = db.createObjectStore(EXP_STORE, { keyPath: '@ref' });
                    // Ensure 'name' exists on DoseResponseExperiment
                    store.createIndex('by-projectName', 'name');
                }
                if (!db.objectStoreNames.contains(CAT_ANALYSIS_STORE)) {
                    const store = db.createObjectStore(CAT_ANALYSIS_STORE, { keyPath: '@ref' });
                    store.createIndex('by-name', 'name');
                    store.createIndex('by-bmdResultRef', 'bmdResult');
                }
                if (!db.objectStoreNames.contains(BMD_RESULT_STORE)) {
                    const store = db.createObjectStore(BMD_RESULT_STORE, { keyPath: '@ref' });
                    store.createIndex('by-doseResponseExperiment', 'doseResponseExperiment');
                }
                if (!db.objectStoreNames.contains(WILLIAMS_STORE)) {
                    const store = db.createObjectStore(WILLIAMS_STORE, { keyPath: '@ref' });
                    // Check spelling: 'doseResponseExperiement' vs 'doseResponseExperiment'
                    store.createIndex('by-doseResponseExperiement', 'doseResponseExperiement');
                }
                if (!db.objectStoreNames.contains(ANOVA_STORE)) {
                    db.createObjectStore(ANOVA_STORE, { autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(CURVE_FIT_STORE)) {
                    db.createObjectStore(CURVE_FIT_STORE, { autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(ORIOGEN_STORE)) {
                    db.createObjectStore(ORIOGEN_STORE, { autoIncrement: true });
                }
            }
            // No explicit return needed from upgrade function
        },
        blocked() { console.error(`openProjectDB ${projectName}: DB blocked`); },
        blocking() { console.warn(`openProjectDB ${projectName}: DB blocking`); },
        terminated() { console.error(`openProjectDB ${projectName}: DB terminated`); },
    });
}

// Function to open the Meta DB (using singleton pattern)
let metaDbPromise: Promise<IDBPDatabase<MetaDB>> | null = null;
export function openMetaDB(): Promise<IDBPDatabase<MetaDB>> {
    if (!metaDbPromise) {
        const latestVersion = 1;
        const dbNameForHandlers = META_DB_NAME; // Capture name for handlers
        metaDbPromise = openDB<MetaDB>(META_DB_NAME, latestVersion, {
            // FIX: Explicitly type parameters for the upgrade callback
            upgrade(
                db: IDBPDatabase<MetaDB>,
                oldVersion: number,
                newVersion: number | null,
                tx: IDBPTransaction<MetaDB, StoreNames<MetaDB>[], "versionchange">
            ) {
                console.log(`Upgrading Meta DB from version ${oldVersion} to ${newVersion ?? latestVersion}`);
                if (oldVersion < 1) {
                    if (!db.objectStoreNames.contains(META_PROJECTS_STORE)) {
                        db.createObjectStore(META_PROJECTS_STORE); // Key provided externally
                    }
                }
                // No explicit return needed
            },
            blocked() { console.error(`openMetaDB ${dbNameForHandlers}: DB blocked`); },
            blocking() { console.warn(`openMetaDB ${dbNameForHandlers}: DB blocking`); },
            terminated() { console.error(`openMetaDB ${dbNameForHandlers}: DB terminated`); },
        }).catch(err => {
            metaDbPromise = null;
            console.error("Failed to open Meta DB:", err);
            throw err;
        });
    }
    return metaDbPromise;
}


// --- Meta DB Operations ---
export const saveProjectMetadata = async (projectInfo: ProjectInfo): Promise<void> => {
    const db = await openMetaDB();
    const tx = db.transaction(META_PROJECTS_STORE, 'readwrite');
    await tx.store.put(projectInfo, projectInfo.name);
    await tx.done;
    console.log(`Saved metadata for project: ${projectInfo.name}`);
};

export const getAllProjectsMetadata = async (): Promise<ProjectInfo[]> => {
    const db = await openMetaDB();
    return db.getAll(META_PROJECTS_STORE);
};

export const deleteProjectMetadata = async (projectName: string): Promise<void> => {
    const db = await openMetaDB();
    const tx = db.transaction(META_PROJECTS_STORE, 'readwrite');
    await tx.store.delete(projectName);
    await tx.done;
    console.log(`Deleted metadata for project: ${projectName}`);
};

// --- Project DB Operations ---
const ALL_PROJECT_STORE_NAMES_TUPLE = [ /* ... store names tuple ... */] as const;
type ProjectStoreTuple = typeof ALL_PROJECT_STORE_NAMES_TUPLE;
export const saveFullProjectData = async (projectName: string, data: ProjectData): Promise<void> => { /* ... as before ... */ };

