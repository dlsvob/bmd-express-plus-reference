// src/utils/myIDB.ts
import { openDB, IDBPDatabase, DBSchema, IDBPTransaction, StoreNames } from 'idb'; // Removed unused types
import {
    ProjectData,
    DoseResponseExperiment,
    CategoryAnalysisResult,
    BMDResult,
    WilliamsTrendResult,
    // Import other specific types for your stores if available
} from '../models/BMDxExported'; // Adjust path
import { ProjectInfo } from '../hooks/useProjectData'; // Adjust path

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
    [ANOVA_STORE]: { key: number; value: any; }; // Use specific type if known
    [CURVE_FIT_STORE]: { key: number; value: any; }; // Use specific type if known
    [ORIOGEN_STORE]: { key: number; value: any; }; // Use specific type if known
}
export interface MetaDB extends DBSchema {
    [META_PROJECTS_STORE]: { key: string; value: ProjectInfo; };
}

// --- DB Open Functions ---

/**
 * Opens an existing IndexedDB database for the given project name
 * WITHOUT specifying a version. Will NOT trigger upgrade/creation.
 * Assumes the database and its stores already exist.
 */
export async function openProjectDB(projectName: string): Promise<IDBPDatabase<ProjectDB>> {
    console.log(`Opening existing Project DB: ${projectName}`);
    // *** OMIT VERSION NUMBER by passing undefined ***
    return openDB<ProjectDB>(projectName, undefined, {
        // 'upgrade' callback is NOT provided when version is omitted
        blocked() { console.error(`openProjectDB ${projectName}: DB blocked`); },
        blocking() { console.warn(`openProjectDB ${projectName}: DB blocking`); },
        terminated() { console.error(`openProjectDB ${projectName}: DB terminated`); },
    });
}

/**
 * Opens the existing Meta DB WITHOUT specifying a version.
 * Uses a singleton promise pattern. Assumes DB/stores exist.
 */
let metaDbPromise: Promise<IDBPDatabase<MetaDB>> | null = null;
export function openMetaDB(): Promise<IDBPDatabase<MetaDB>> {
    if (!metaDbPromise) {
        const dbNameForHandlers = META_DB_NAME;
        console.log(`Opening existing Meta DB: ${dbNameForHandlers}`);
        // *** OMIT VERSION NUMBER by passing undefined ***
        metaDbPromise = openDB<MetaDB>(META_DB_NAME, undefined, { // Pass undefined for version
            // 'upgrade' callback is NOT provided when version is omitted
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
// These functions now rely on the DB and stores already existing
export const saveProjectMetadata = async (projectInfo: ProjectInfo): Promise<void> => {
    const db = await openMetaDB(); // Opens existing DB
    const tx = db.transaction(META_PROJECTS_STORE, 'readwrite');
    await tx.store.put(projectInfo, projectInfo.name);
    await tx.done;
    console.log(`Saved metadata for project: ${projectInfo.name}`);
};

export const getAllProjectsMetadata = async (): Promise<ProjectInfo[]> => {
    const db = await openMetaDB(); // Opens existing DB
    // Add check if store exists, although openMetaDB assumes it does
    if (!db.objectStoreNames.contains(META_PROJECTS_STORE)) {
        console.warn(`Meta store '${META_PROJECTS_STORE}' not found in ${META_DB_NAME}. Returning empty project list.`);
        return [];
    }
    return db.getAll(META_PROJECTS_STORE);
};

export const deleteProjectMetadata = async (projectName: string): Promise<void> => {
    const db = await openMetaDB(); // Opens existing DB
    // Add check if store exists
    if (!db.objectStoreNames.contains(META_PROJECTS_STORE)) {
        console.warn(`Meta store '${META_PROJECTS_STORE}' not found in ${META_DB_NAME}. Cannot delete metadata for ${projectName}.`);
        return;
    }
    const tx = db.transaction(META_PROJECTS_STORE, 'readwrite');
    await tx.store.delete(projectName);
    await tx.done;
    console.log(`Deleted metadata for project: ${projectName}`);
};

// --- Project DB Operations ---
// Define the tuple of store names explicitly typed from ProjectDB keys
const ALL_PROJECT_STORE_NAMES_TUPLE = [
    EXP_STORE, CAT_ANALYSIS_STORE, BMD_RESULT_STORE, WILLIAMS_STORE,
    ANOVA_STORE, CURVE_FIT_STORE, ORIOGEN_STORE
    // Add all stores to populate, matching ProjectDB keys
] as const;
type ProjectStoreTuple = typeof ALL_PROJECT_STORE_NAMES_TUPLE;

// This function now assumes the project DB and ALL its stores already exist
// It's primarily used by createProjectDatabase after the DB is opened with upgrade
// or potentially for overwriting data if needed (though current design is immutable)
export const saveFullProjectData = async (projectName: string, data: ProjectData): Promise<void> => {
    // This function might need re-evaluation depending on whether it's called
    // only during creation (where the DB is passed from createProjectDatabase)
    // or if it needs to open the DB itself. Assuming it needs to open for now.
    const db = await openProjectDB(projectName); // Opens existing DB

    // Check if all target stores actually exist in the opened DB
    const missingStores = ALL_PROJECT_STORE_NAMES_TUPLE.filter(name => !db.objectStoreNames.contains(name));
    if (missingStores.length > 0) {
        throw new Error(`Cannot save project data: Missing object stores in DB '${projectName}': ${missingStores.join(', ')}`);
    }

    let tx: IDBPTransaction<ProjectDB, ProjectStoreTuple, "readwrite"> | undefined;
    try {
        tx = db.transaction(ALL_PROJECT_STORE_NAMES_TUPLE, 'readwrite');

        // Use Promise.all to run puts concurrently within the transaction
        await Promise.all([
            // Add null checks for safety
            ...(data.doseResponseExperiments || []).map(item => tx!.objectStore(EXP_STORE).put(item)),
            ...(data.categoryAnalysisResults || []).map(item => tx!.objectStore(CAT_ANALYSIS_STORE).put(item)),
            ...(data.bMDResult || []).map(item => tx!.objectStore(BMD_RESULT_STORE).put(item)),
            ...(data.williamsTrendResults || []).map(item => tx!.objectStore(WILLIAMS_STORE).put(item)),
            ...(data.oneWayANOVAResults || []).map((item) => tx!.objectStore(ANOVA_STORE).put(item)),
            ...(data.curveFitPrefilterResults || []).map((item) => tx!.objectStore(CURVE_FIT_STORE).put(item)),
            ...(data.oriogenResults || []).map((item) => tx!.objectStore(ORIOGEN_STORE).put(item)),
        ]);

        await tx!.done; // Wait for transaction to complete successfully
        console.log(`Populated/Updated individual stores for project: ${projectName}`);
    } catch (err) {
        console.error(`Error saving full project data for ${projectName}:`, err);
        if (tx && !tx.done) {
            try { tx.abort(); console.log(`Transaction aborted for project: ${projectName}`); }
            catch (abortErr) { console.error(`Error aborting transaction for ${projectName}:`, abortErr); }
        }
        throw err; // Re-throw the original error
    }
};

// *** NEW FUNCTION FOR INITIAL CREATION ***
/**
 * Creates a new project database with the specified version and schema,
 * then populates it with the initial data.
 * This should be called ONLY during the initial project setup/upload.
 */
export async function createProjectDatabase(projectName: string, initialData: ProjectData): Promise<void> {
    const latestVersion = 1; // Define the version for creation
    console.log(`Creating NEW Project DB ${projectName} at version ${latestVersion}`);
    let db: IDBPDatabase<ProjectDB> | null = null; // Keep track of DB instance
    try {
        // Open DB with version and upgrade callback to ensure schema creation
        db = await openDB<ProjectDB>(projectName, latestVersion, {
            upgrade(dbInstance, oldVersion, newVersion, tx) {
                console.log(`Running upgrade for ${projectName} from ${oldVersion} to ${newVersion ?? latestVersion}`);
                // Define the schema creation logic HERE
                if (oldVersion < 1) {
                    if (!dbInstance.objectStoreNames.contains(EXP_STORE)) {
                        const store = dbInstance.createObjectStore(EXP_STORE, { keyPath: '@ref' });
                        store.createIndex('by-projectName', 'name');
                    }
                    if (!dbInstance.objectStoreNames.contains(CAT_ANALYSIS_STORE)) {
                        const store = dbInstance.createObjectStore(CAT_ANALYSIS_STORE, { keyPath: '@ref' });
                        store.createIndex('by-name', 'name');
                        store.createIndex('by-bmdResultRef', 'bmdResult');
                    }
                    if (!dbInstance.objectStoreNames.contains(BMD_RESULT_STORE)) {
                        const store = dbInstance.createObjectStore(BMD_RESULT_STORE, { keyPath: '@ref' });
                        store.createIndex('by-doseResponseExperiment', 'doseResponseExperiment');
                    }
                    if (!dbInstance.objectStoreNames.contains(WILLIAMS_STORE)) {
                        const store = dbInstance.createObjectStore(WILLIAMS_STORE, { keyPath: '@ref' });
                        store.createIndex('by-doseResponseExperiement', 'doseResponseExperiement'); // Check spelling
                    }
                    if (!dbInstance.objectStoreNames.contains(ANOVA_STORE)) {
                        dbInstance.createObjectStore(ANOVA_STORE, { autoIncrement: true });
                    }
                    if (!dbInstance.objectStoreNames.contains(CURVE_FIT_STORE)) {
                        dbInstance.createObjectStore(CURVE_FIT_STORE, { autoIncrement: true });
                    }
                    if (!dbInstance.objectStoreNames.contains(ORIOGEN_STORE)) {
                        dbInstance.createObjectStore(ORIOGEN_STORE, { autoIncrement: true });
                    }
                    // ... create other stores ...
                }
            },
            blocked() { console.error(`createProjectDatabase ${projectName}: DB blocked during creation`); },
            blocking() { console.warn(`createProjectDatabase ${projectName}: DB blocking during creation`); },
            terminated() { console.error(`createProjectDatabase ${projectName}: DB terminated during creation`); },
        });

        // Now populate the newly created/opened DB using saveFullProjectData logic
        // We could pass the 'db' instance to saveFullProjectData to avoid reopening,
        // but reusing the existing function is simpler for now.
        console.log(`Populating stores for newly created DB: ${projectName}`);
        await saveFullProjectData(projectName, initialData); // Call save logic

        // Close the connection after creation and population are done
        db.close();
        console.log(`DB ${projectName} created and populated successfully.`);

    } catch (error) {
        console.error(`Failed to create or populate project database ${projectName}:`, error);
        // Attempt to close connection if open
        if (db) {
            try { db.close(); } catch (closeErr) { /* ignore */ }
        }
        // Consider deleting the potentially partially created DB for cleanup
        try {
            console.warn(`Attempting to delete partially created DB: ${projectName}`);
            await indexedDB.deleteDatabase(projectName);
        } catch (deleteErr) {
            console.error(`Failed to delete partially created DB ${projectName}:`, deleteErr);
        }
        throw error; // Re-throw error
    }
}

/**
 * Ensures the MetaDB exists and has the correct schema.
 * Should be called once during application initialization.
 */
export async function initializeMetaDatabase(): Promise<void> {
    const latestVersion = 1;
    console.log(`Initializing Meta DB ${META_DB_NAME} if needed (version ${latestVersion})`);
    let db: IDBPDatabase<MetaDB> | null = null;
    try {
        // Opening with the version/upgrade callback ensures it's created/upgraded
        db = await openDB<MetaDB>(META_DB_NAME, latestVersion, {
            upgrade(dbInstance, oldVersion) {
                console.log(`Running upgrade for Meta DB from ${oldVersion} to ${latestVersion}`);
                if (oldVersion < 1) {
                    if (!dbInstance.objectStoreNames.contains(META_PROJECTS_STORE)) {
                        dbInstance.createObjectStore(META_PROJECTS_STORE); // Key provided externally
                    }
                }
            },
            blocked() { console.error(`initializeMetaDatabase ${META_DB_NAME}: DB blocked`); },
            blocking() { console.warn(`initializeMetaDatabase ${META_DB_NAME}: DB blocking`); },
            terminated() { console.error(`initializeMetaDatabase ${META_DB_NAME}: DB terminated`); },
        });
        // Close the connection after ensuring it's created/upgraded
        db.close();
        console.log(`Meta DB ${META_DB_NAME} initialization check complete.`);
    } catch (error) {
        console.error(`Failed to initialize Meta DB ${META_DB_NAME}:`, error);
        if (db) { try { db.close(); } catch (e) { } } // Attempt close on error
        throw error; // Re-throw
    }
}
