// src/utils/myIDB.ts
import { openDB, IDBPDatabase, DBSchema, IDBPTransaction } from 'idb';
import {
    DoseResponseExperiment,
    CategoryAnalysisResult,
    BMDResult,
    WilliamsTrendResult,
} from '../models/BMDxExported'; // Adjust path

// --- Constants for Project DB Store Names ---
export const EXP_STORE = 'doseResponseExperiments' as const;
export const CAT_ANALYSIS_STORE = 'categoryAnalysisResults' as const;
export const BMD_RESULT_STORE = 'bMDResult' as const;
export const WILLIAMS_STORE = 'williamsTrendResults' as const;
export const ANOVA_STORE = 'oneWayANOVAResults' as const;
export const CURVE_FIT_STORE = 'curveFitPrefilterResults' as const;
export const ORIOGEN_STORE = 'oriogenResults' as const;

// --- Schema for Individual Project DBs (using idb) ---
// Stores using @ref value as an out-of-line key. NO INDEXES DEFINED.
export interface ProjectDB extends DBSchema {
    [EXP_STORE]: { key: number; value: DoseResponseExperiment; }; // Removed indexes
    [CAT_ANALYSIS_STORE]: { key: number; value: CategoryAnalysisResult; }; // Removed indexes
    [BMD_RESULT_STORE]: { key: number; value: BMDResult; }; // Removed indexes
    [WILLIAMS_STORE]: { key: number; value: WilliamsTrendResult; }; // Removed indexes
    // Stores using autoIncrement key.
    [ANOVA_STORE]: { key: number; value: any; };
    [CURVE_FIT_STORE]: { key: number; value: any; };
    [ORIOGEN_STORE]: { key: number; value: any; };
}

// --- Project DB Open Function (For Reading - No Version) ---
/**
 * Opens an existing IndexedDB database for the given project name
 * WITHOUT specifying a version. Will NOT trigger upgrade/creation.
 * Assumes the database and its stores already exist. Used for reading data.
 */
export async function openProjectDB(projectName: string): Promise<IDBPDatabase<ProjectDB>> {
    console.log(`[myIDB] Opening existing Project DB for reading: ${projectName}`);
    return openDB<ProjectDB>(projectName, undefined, { // No version specified
        blocked() { console.error(`[myIDB] openProjectDB ${projectName}: DB blocked`); },
        blocking() { console.warn(`[myIDB] openProjectDB ${projectName}: DB blocking`); },
        terminated() { console.error(`[myIDB] openProjectDB ${projectName}: DB terminated`); },
    });
}

// --- Function to Open/Create DB with Schema (For Initial Write - Uses Version 1) ---
/**
 * Opens a project database, creating or upgrading it to version 1
 * with the required object stores using out-of-line keys where appropriate.
 * **Does not create secondary indexes.**
 * Returns the open database instance.
 * Intended ONLY for use during initial project creation/streaming.
 *
 * @param projectName The name of the database to open/create.
 * @returns A promise resolving to the opened IDBPDatabase instance.
 */
export async function openAndPrepareProjectDB(projectName: string): Promise<IDBPDatabase<ProjectDB>> {
    const latestVersion = 1; // Use version 1 specifically for schema creation
    console.log(`[myIDB] Opening/Preparing Project DB ${projectName} at version ${latestVersion} for initial setup (NO INDEXES).`);

    return openDB<ProjectDB>(projectName, latestVersion, {
        upgrade(dbInstance, oldVersion, newVersion, tx) {
            console.log(`[myIDB] Running upgrade for ${projectName} from ${oldVersion} to ${newVersion ?? latestVersion}`);
            if (oldVersion < 1) {
                // Stores using @ref value as the key (out-of-line) - NO keyPath specified
                if (!dbInstance.objectStoreNames.contains(EXP_STORE)) {
                    // Just create the store, NO createIndex calls
                    dbInstance.createObjectStore(EXP_STORE);
                }
                if (!dbInstance.objectStoreNames.contains(CAT_ANALYSIS_STORE)) {
                    dbInstance.createObjectStore(CAT_ANALYSIS_STORE);
                }
                if (!dbInstance.objectStoreNames.contains(BMD_RESULT_STORE)) {
                    dbInstance.createObjectStore(BMD_RESULT_STORE);
                }
                if (!dbInstance.objectStoreNames.contains(WILLIAMS_STORE)) {
                    dbInstance.createObjectStore(WILLIAMS_STORE);
                }
                // Stores using autoIncrement key
                if (!dbInstance.objectStoreNames.contains(ANOVA_STORE)) {
                    dbInstance.createObjectStore(ANOVA_STORE, { autoIncrement: true });
                }
                if (!dbInstance.objectStoreNames.contains(CURVE_FIT_STORE)) {
                    dbInstance.createObjectStore(CURVE_FIT_STORE, { autoIncrement: true });
                }
                if (!dbInstance.objectStoreNames.contains(ORIOGEN_STORE)) {
                    dbInstance.createObjectStore(ORIOGEN_STORE, { autoIncrement: true });
                }
            }
        },
        blocked() { console.error(`[myIDB] openAndPrepareProjectDB ${projectName}: DB blocked`); },
        blocking() { console.warn(`[myIDB] openAndPrepareProjectDB ${projectName}: DB blocking`); },
        terminated() { console.error(`[myIDB] openAndPrepareProjectDB ${projectName}: DB terminated`); },
    });
}


// --- Function to List Project DB Names (Using indexedDB.databases) ---
/**
 * Lists the names of likely project databases using indexedDB.databases().
 * Filters out names starting with underscore.
 * WARNING: Relies on non-standard indexedDB.databases().
 * @returns A promise resolving to an array of potential project database names.
 */
export async function listProjectDatabaseNames(): Promise<string[]> {
    console.log('[myIDB] Attempting to list database names via indexedDB.databases()...');
    if (!indexedDB.databases) {
        console.error('[myIDB] indexedDB.databases() is not supported by this browser.');
        throw new Error('indexedDB.databases() is not supported by this browser.');
    }
    try {
        const dbList = await indexedDB.databases();
        console.log('[myIDB] Raw DB list received:', dbList);
        const projectNames = dbList
            .map(db => db.name)
            .filter((name): name is string => !!name)
            // ***** SIMPLIFIED FILTER *****
            // Only filter out names starting with underscore (common for internal DBs)
            .filter(name => !name.startsWith('_'));
        // ***************************
        console.log('[myIDB] Filtered project DB names:', projectNames);
        return projectNames;
    } catch (error) {
        console.error('[myIDB] Error calling indexedDB.databases():', error);
        throw new Error(`Failed to list databases: ${error instanceof Error ? error.message : String(error)}`);
    }
}
