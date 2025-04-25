// src/store/apis/idbBaseQuery.ts
import { BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { IDBPDatabase } from 'idb';
import {
    ProjectDB,
    openProjectDB,
    CAT_ANALYSIS_STORE,
    BMD_RESULT_STORE,
} from '../../utils/myIDB'; // Adjust path if needed
import { CategoryAnalysisItem, BMDResult } from '../../models/BMDxExported'; // Adjust path/type names if needed

// --- Filter Constants ---
const MIN_PERCENTAGE = 5;
const MIN_GENES_PASSED_ALL_FILTERS = 3;
const MIN_GENE_ALL_COUNT = 40;
const MAX_GENE_ALL_COUNT = 500;
// ------------------------

interface StoredCategoryAnalysisCollection {
    bmdResult: number | string;
    categoryAnalysisResults?: CategoryAnalysisItem[];
    categoryAnalsyisResults?: CategoryAnalysisItem[];
}

export interface IdbRawDataQueryArgs { // Renamed for clarity
    projectName: string;
    stores: ReadonlyArray<'bMDResult' | 'categoryAnalysisResults'>;
    selectedBmdResultRefs?: string[]; // Now explicitly an array
}

export interface IdbQueryData {
    bMDResult?: BMDResult[]; // Changed to always be an array or null/undefined
    categoryAnalysisResults?: CategoryAnalysisItem[]; // Filtered items
    [key: string]: any;
}

interface IdbQueryError {
    status: 'IDB_ERROR' | 'MISSING_STORES' | 'UNKNOWN_ERROR' | 'NOT_FOUND' | 'INVALID_KEY';
    message: string;
    details?: any;
}

const mapArgStoreToDbStore = (storeName: string): keyof ProjectDB | null => {
    switch (storeName) {
        case 'bMDResult': return BMD_RESULT_STORE;
        case 'categoryAnalysisResults': return CAT_ANALYSIS_STORE;
        default:
            console.warn(`[idbBaseQuery v22 Multi-Fetch] Unknown store name requested: ${storeName}`);
            return null;
    }
}

export const idbBaseQuery: BaseQueryFn<
    IdbRawDataQueryArgs,
    IdbQueryData,
    IdbQueryError
> = async ({ projectName, stores: argStores, selectedBmdResultRefs = [] }, { getState, dispatch }) => {

    if (!projectName) {
        return { error: { status: 'UNKNOWN_ERROR', message: 'Project name is required' } };
    }

    const dbStoresToFetch = argStores.map(mapArgStoreToDbStore).filter(s => s !== null) as (keyof ProjectDB)[];
    const uniqueDbStores = Array.from(new Set(dbStoresToFetch));

    // --- LOGGING POINT 1: Input Arguments ---
    const logPrefix = '[idbBaseQuery v22 Multi-Fetch]';
    console.log(`${logPrefix} Executing for project: ${projectName}`);
    console.log(`${logPrefix} Requested argStores: ${argStores.join(', ')}`);
    console.log(`${logPrefix} Mapped to dbStores: ${uniqueDbStores.join(', ')}`);
    console.log(`${logPrefix} Selected Refs: [${selectedBmdResultRefs.join(', ')}]`);
    // ---------------------------------------

    let db: IDBPDatabase<ProjectDB> | null = null;

    try {
        db = await openProjectDB(projectName);
        console.log(`${logPrefix} DB opened for ${projectName}.`);

        const missingStores = uniqueDbStores.filter(storeName => !db?.objectStoreNames.contains(storeName));
        if (missingStores.length > 0) {
            console.error(`${logPrefix} Missing required DB stores: ${missingStores.join(', ')}`);
            if (db) db.close();
            return { error: { status: 'MISSING_STORES', message: `Missing DB stores: ${missingStores.join(', ')}` } };
        }

        const tx = db.transaction(uniqueDbStores, 'readonly');
        tx.onabort = (event) => console.error(`${logPrefix} Transaction ABORTED!`, event, tx?.error);
        tx.onerror = (event) => console.error(`${logPrefix} Transaction ERROR!`, event);

        // --- MODIFIED FETCH LOGIC ---
        const promisesMap = new Map<keyof ProjectDB, Promise<any>>();

        uniqueDbStores.forEach(dbStoreName => {
            const store = tx.objectStore(dbStoreName);
            let promise: Promise<any>;

            if (dbStoreName === BMD_RESULT_STORE && selectedBmdResultRefs.length > 0) {
                // Fetch BMDResult for EACH selected ref
                const getPromises = selectedBmdResultRefs.map(refStr => {
                    const numericKey = parseInt(refStr, 10);
                    if (!isNaN(numericKey)) {
                        // --- LOGGING POINT 2: Fetching specific BMDResult ---
                        console.log(`${logPrefix} Creating promise to GET ${dbStoreName} with numeric key: ${numericKey}`);
                        // ----------------------------------------------------
                        return store.get(numericKey);
                    } else {
                        console.warn(`${logPrefix} Invalid numeric key for ${dbStoreName}: ${refStr}. Skipping fetch.`);
                        return Promise.resolve(undefined); // Resolve with undefined if key is invalid
                    }
                });
                // Combine results into a single array promise
                promise = Promise.all(getPromises).then(results => results.filter(r => r !== undefined)); // Filter out undefined results from invalid keys

            } else if (dbStoreName === CAT_ANALYSIS_STORE) {
                // Fetch ALL CategoryAnalysis collections first, we'll filter later based on selected refs
                // --- LOGGING POINT 3: Fetching ALL CategoryAnalysis ---
                console.log(`${logPrefix} Creating promise to GET ALL ${dbStoreName} (will filter later)`);
                // ----------------------------------------------------
                promise = store.getAll();

            } else {
                // Default: Fetch all for other stores if needed (though currently only BMD and Cat are used)
                console.log(`${logPrefix} Creating promise to GET ALL ${dbStoreName} (default)`);
                promise = store.getAll();
            }
            promisesMap.set(dbStoreName, promise);
        });
        // --- END MODIFIED FETCH LOGIC ---

        console.log(`${logPrefix} Awaiting all store promises (${promisesMap.size})...`);
        await Promise.all(promisesMap.values()); // Wait for fetches to complete

        const dbResultsMap = new Map<keyof ProjectDB, any>();
        for (const [dbStoreName, promise] of promisesMap.entries()) {
            try {
                const resultData = await promise;
                // --- LOGGING POINT 4: Raw Fetched Data ---
                const resultSize = Array.isArray(resultData) ? resultData.length : (resultData ? 1 : 0);
                console.log(`${logPrefix} Raw data fetched for ${dbStoreName}: ${resultData === null || resultData === undefined ? 'None' : `${resultSize} item(s)`}`);
                // Optional: Log first item if array is large
                // if (Array.isArray(resultData) && resultData.length > 0) {
                //     console.log(`${logPrefix} First item sample for ${dbStoreName}:`, resultData[0]);
                // } else if (resultData) {
                //     console.log(`${logPrefix} Item sample for ${dbStoreName}:`, resultData);
                // }
                // -----------------------------------------
                dbResultsMap.set(dbStoreName, resultData);
            } catch (err) {
                console.error(`${logPrefix} Promise failed for store ${dbStoreName}:`, err);
                dbResultsMap.set(dbStoreName, undefined);
            }
        }
        console.log(`${logPrefix} All store promises resolved.`);

        // --- Filtering Logic for categoryAnalysisResults (Adjusted for multiple refs) ---
        const catAnalysisArgName = 'categoryAnalysisResults';
        const catAnalysisDbName = CAT_ANALYSIS_STORE;
        let finalFilteredNestedItems: CategoryAnalysisItem[] = [];

        if (argStores.includes(catAnalysisArgName) && dbResultsMap.has(catAnalysisDbName)) {
            const allStoredCollections = dbResultsMap.get(catAnalysisDbName) as StoredCategoryAnalysisCollection[] | undefined;

            if (allStoredCollections && selectedBmdResultRefs.length > 0) {
                console.log(`${logPrefix} Filtering CategoryAnalysis collections for selected refs: [${selectedBmdResultRefs.join(', ')}]`);
                const selectedRefsSet = new Set(selectedBmdResultRefs);
                let totalItemsBeforeFilter = 0;

                allStoredCollections.forEach(parentCollection => {
                    if (parentCollection && selectedRefsSet.has(String(parentCollection.bmdResult))) {
                        let nestedItemsToFilter: CategoryAnalysisItem[] = [];
                        let usedPropertyName: string | null = null;

                        const itemsCorrectSpelling = parentCollection?.['categoryAnalysisResults'];
                        if (Array.isArray(itemsCorrectSpelling)) {
                            nestedItemsToFilter = itemsCorrectSpelling;
                            usedPropertyName = 'categoryAnalysisResults';
                        } else {
                            const itemsLegacyTypo = parentCollection?.['categoryAnalsyisResults'];
                            if (Array.isArray(itemsLegacyTypo)) {
                                nestedItemsToFilter = itemsLegacyTypo;
                                usedPropertyName = 'categoryAnalsyisResults';
                            }
                        }

                        if (usedPropertyName) {
                            totalItemsBeforeFilter += nestedItemsToFilter.length;
                            const filteredForThisRef = nestedItemsToFilter.filter(item => {
                                const passesFilter =
                                    item &&
                                    item.percentage != null && item.percentage >= MIN_PERCENTAGE &&
                                    item.genesThatPassedAllFilters != null && item.genesThatPassedAllFilters >= MIN_GENES_PASSED_ALL_FILTERS &&
                                    item.geneAllCount != null && item.geneAllCount >= MIN_GENE_ALL_COUNT && item.geneAllCount <= MAX_GENE_ALL_COUNT;
                                return passesFilter;
                            });
                            finalFilteredNestedItems.push(...filteredForThisRef); // Add filtered items to the final list
                        }
                    }
                });
                console.log(`${logPrefix} Filtering complete. Total items before filter: ${totalItemsBeforeFilter}, Total items after filter: ${finalFilteredNestedItems.length}`);
            } else {
                console.warn(`${logPrefix} No category analysis collections fetched or no refs selected for filtering.`);
            }
        }
        // --- End Filtering Logic ---

        // --- Result Structuring ---
        const dataResult: IdbQueryData = {};

        argStores.forEach(argName => {
            const dbStoreName = mapArgStoreToDbStore(argName);
            if (!dbStoreName) {
                dataResult[argName] = undefined;
                return;
            }

            if (argName === catAnalysisArgName) {
                dataResult[argName] = finalFilteredNestedItems; // Assign the combined filtered list
            } else if (argName === 'bMDResult') {
                // Ensure bMDResult is always an array, even if only one was fetched/found
                const fetchedBmdData = dbResultsMap.get(dbStoreName);
                dataResult[argName] = Array.isArray(fetchedBmdData) ? fetchedBmdData : (fetchedBmdData ? [fetchedBmdData] : []);
            } else {
                dataResult[argName] = dbResultsMap.get(dbStoreName);
            }
        });
        // --- End Result Structuring ---

        // --- LOGGING POINT 5: Final Structured Data ---
        console.log(`${logPrefix} Successfully prepared data for ${projectName}. Returning structured data:`);
        argStores.forEach(argName => {
            const resultData = dataResult[argName];
            const size = Array.isArray(resultData) ? resultData.length : (resultData ? 1 : 0);
            console.log(`${logPrefix} -> ${argName}: ${resultData === null || resultData === undefined ? 'None' : `${size} item(s)`}`);
        });
        // ---------------------------------------------

        return { data: dataResult };

    } catch (error: unknown) {
        // ... (error handling remains the same) ...
        console.error(`${logPrefix} Error during DB operation for ${projectName}:`, error);
        const message = (error instanceof Error) ? error.message : String(error);
        if (db && typeof db.close === 'function') {
            try { db.close(); } catch (e) { console.error(`${logPrefix} Error closing DB after main error:`, e); }
        }
        return { error: { status: 'IDB_ERROR', message: `IndexedDB error: ${message}`, details: error } };
    } finally {
        if (db && typeof db.close === 'function') {
            try { db.close(); } catch (e) { console.error(`${logPrefix} Error closing DB in finally block:`, e); }
        }
        console.log(`${logPrefix} Operation finished for ${projectName}.`);
    }
};
