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
    categoryAnalsyisResults?: CategoryAnalysisItem[]; // Legacy typo support
}

export interface IdbRawDataQueryArgs {
    projectName: string;
    stores: ReadonlyArray<'bMDResult' | 'categoryAnalysisResults'>;
    selectedBmdResultRefs?: string[];
}

// --- UPDATE IdbQueryData Interface ---
export interface IdbQueryData {
    bMDResult?: BMDResult[];
    // This will now hold the array of { ref, item } objects
    categoryAnalysisResults?: Array<{ bmdResultRef: number | string; item: CategoryAnalysisItem }>;
    [key: string]: any;
}
// -----------------------------------

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
            console.warn(`[idbBaseQuery v23 Multi-Fetch] Unknown store name requested: ${storeName}`); // <<< Version Bump
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

    const logPrefix = '[idbBaseQuery v23 Multi-Fetch]'; // <<< Version Bump
    console.log(`${logPrefix} Executing for project: ${projectName}`);
    console.log(`${logPrefix} Requested argStores: ${argStores.join(', ')}`);
    console.log(`${logPrefix} Mapped to dbStores: ${uniqueDbStores.join(', ')}`);
    console.log(`${logPrefix} Selected Refs: [${selectedBmdResultRefs.join(', ')}]`);

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

        const promisesMap = new Map<keyof ProjectDB, Promise<any>>();

        uniqueDbStores.forEach(dbStoreName => {
            const store = tx.objectStore(dbStoreName);
            let promise: Promise<any>;

            if (dbStoreName === BMD_RESULT_STORE && selectedBmdResultRefs.length > 0) {
                const getPromises = selectedBmdResultRefs.map(refStr => {
                    const numericKey = parseInt(refStr, 10);
                    if (!isNaN(numericKey)) {
                        console.log(`${logPrefix} Creating promise to GET ${dbStoreName} with numeric key: ${numericKey}`);
                        return store.get(numericKey);
                    } else {
                        console.warn(`${logPrefix} Invalid numeric key for ${dbStoreName}: ${refStr}. Skipping fetch.`);
                        return Promise.resolve(undefined);
                    }
                });
                promise = Promise.all(getPromises).then(results => results.filter(r => r !== undefined));

            } else if (dbStoreName === CAT_ANALYSIS_STORE) {
                console.log(`${logPrefix} Creating promise to GET ALL ${dbStoreName} (will filter later)`);
                promise = store.getAll();

            } else {
                console.log(`${logPrefix} Creating promise to GET ALL ${dbStoreName} (default)`);
                promise = store.getAll();
            }
            promisesMap.set(dbStoreName, promise);
        });

        console.log(`${logPrefix} Awaiting all store promises (${promisesMap.size})...`);
        await Promise.all(promisesMap.values());

        const dbResultsMap = new Map<keyof ProjectDB, any>();
        for (const [dbStoreName, promise] of promisesMap.entries()) {
            try {
                const resultData = await promise;
                const resultSize = Array.isArray(resultData) ? resultData.length : (resultData ? 1 : 0);
                console.log(`${logPrefix} Raw data fetched for ${dbStoreName}: ${resultData === null || resultData === undefined ? 'None' : `${resultSize} item(s)`}`);
                dbResultsMap.set(dbStoreName, resultData);
            } catch (err) {
                console.error(`${logPrefix} Promise failed for store ${dbStoreName}:`, err);
                dbResultsMap.set(dbStoreName, undefined);
            }
        }
        console.log(`${logPrefix} All store promises resolved.`);

        // --- Filtering Logic for categoryAnalysisResults ---
        const catAnalysisArgName = 'categoryAnalysisResults';
        const catAnalysisDbName = CAT_ANALYSIS_STORE;
        // --- ENSURE THIS TYPE IS CORRECT ---
        let finalFilteredNestedItems: Array<{ bmdResultRef: number | string; item: CategoryAnalysisItem }> = [];
        // -----------------------------------

        if (argStores.includes(catAnalysisArgName) && dbResultsMap.has(catAnalysisDbName)) {
            const allStoredCollections = dbResultsMap.get(catAnalysisDbName) as StoredCategoryAnalysisCollection[] | undefined;

            if (allStoredCollections && selectedBmdResultRefs.length > 0) {
                console.log(`${logPrefix} Filtering CategoryAnalysis collections for selected refs: [${selectedBmdResultRefs.join(', ')}]`);
                const selectedRefsSet = new Set(selectedBmdResultRefs);
                let totalItemsBeforeFilter = 0;

                allStoredCollections.forEach(parentCollection => {
                    const parentRef = parentCollection?.bmdResult;
                    if (parentRef == null || !selectedRefsSet.has(String(parentRef))) {
                        return;
                    }

                    let nestedItemsToFilter: CategoryAnalysisItem[] = [];
                    if (Array.isArray(parentCollection.categoryAnalysisResults)) {
                        nestedItemsToFilter = parentCollection.categoryAnalysisResults;
                    } else if (Array.isArray(parentCollection.categoryAnalsyisResults)) {
                        nestedItemsToFilter = parentCollection.categoryAnalsyisResults;
                    }

                    if (nestedItemsToFilter.length > 0) {
                        totalItemsBeforeFilter += nestedItemsToFilter.length;
                        const filteredForThisRef = nestedItemsToFilter.filter(item => {
                            const passesFilter =
                                item &&
                                item.percentage != null && item.percentage >= MIN_PERCENTAGE &&
                                item.genesThatPassedAllFilters != null && item.genesThatPassedAllFilters >= MIN_GENES_PASSED_ALL_FILTERS &&
                                item.geneAllCount != null && item.geneAllCount >= MIN_GENE_ALL_COUNT && item.geneAllCount <= MAX_GENE_ALL_COUNT;
                            return passesFilter;
                        });

                        // --- PUSH OBJECT WITH REF AND ITEM ---
                        filteredForThisRef.forEach(filteredItem => {
                            finalFilteredNestedItems.push({
                                bmdResultRef: parentRef, // Use the ref from the parent collection
                                item: filteredItem
                            });
                        });
                        // --------------------------------------
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
                // --- Assign the array of {ref, item} objects ---
                dataResult[argName] = finalFilteredNestedItems;
                // ---------------------------------------------
            } else if (argName === 'bMDResult') {
                const fetchedBmdData = dbResultsMap.get(dbStoreName);
                dataResult[argName] = Array.isArray(fetchedBmdData) ? fetchedBmdData : (fetchedBmdData ? [fetchedBmdData] : []);
            } else {
                dataResult[argName] = dbResultsMap.get(dbStoreName);
            }
        });
        // --- End Result Structuring ---

        console.log(`${logPrefix} Successfully prepared data for ${projectName}. Returning structured data:`);
        argStores.forEach(argName => {
            const resultData = dataResult[argName];
            const size = Array.isArray(resultData) ? resultData.length : (resultData ? 1 : 0);
            console.log(`${logPrefix} -> ${argName}: ${resultData === null || resultData === undefined ? 'None' : `${size} item(s)`}`);
        });

        return { data: dataResult };

    } catch (error: unknown) {
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
