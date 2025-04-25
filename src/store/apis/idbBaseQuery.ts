// src/store/apis/idbBaseQuery.ts
import { BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { IDBPDatabase } from 'idb';
import {
    ProjectDB,
    openProjectDB,
    CAT_ANALYSIS_STORE,
    BMD_RESULT_STORE,
} from '../../utils/myIDB'; // Adjust path if needed
// Import necessary types from BMDxExported
import { CategoryAnalysisItem, BMDResult } from '../../models/BMDxExported'; // Adjust path/type names if needed

// --- Filter Constants ---
const MIN_PERCENTAGE = 5;
const MIN_GENES_PASSED_ALL_FILTERS = 3;
const MIN_GENE_ALL_COUNT = 40;
const MAX_GENE_ALL_COUNT = 500;
// ------------------------

// Define the actual structure stored in CAT_ANALYSIS_STORE
// NOTE: This interface assumes the CORRECT spelling. The code below handles the legacy typo during data access.
interface StoredCategoryAnalysisCollection {
    bmdResult: number | string; // Foreign key linking to BMDResult
    categoryAnalysisResults?: CategoryAnalysisItem[]; // Correct spelling (optional)
    categoryAnalsyisResults?: CategoryAnalysisItem[]; // Legacy typo spelling (optional)
    // Add other potential properties if they exist
}

// Arguments for the query
interface IdbRawDataQueryArgs {
    projectName: string;
    stores: ReadonlyArray<'bMDResult' | 'categoryAnalysisResults'>;
    // Expecting string refs. Treat as single selection for this query type.
    selectedBmdResultRefs?: string[];
}

// Define the structure of the successfully returned data
// Note: bMDResult can be single or array depending on how it was called
interface IdbQueryData {
    bMDResult?: BMDResult | BMDResult[] | null;
    // This will hold the FILTERED items, regardless of which property name they came from
    categoryAnalysisResults?: CategoryAnalysisItem[];
    // Add other potential stores if they can be requested
    [key: string]: any; // Allow other potential stores
}

interface IdbQueryError {
    status: 'IDB_ERROR' | 'MISSING_STORES' | 'UNKNOWN_ERROR' | 'NOT_FOUND' | 'INVALID_KEY';
    message: string;
    details?: any;
}

// Helper to map args stores to actual DB store names
const mapArgStoreToDbStore = (storeName: string): keyof ProjectDB | null => {
    switch (storeName) {
        case 'bMDResult': return BMD_RESULT_STORE;
        case 'categoryAnalysisResults': return CAT_ANALYSIS_STORE;
        default:
            // Use the updated log prefix here too
            console.warn(`[idbBaseQuery v21 Legacy Typo Check] Unknown store name requested: ${storeName}`);
            return null;
    }
}


export const idbBaseQuery: BaseQueryFn<
    IdbRawDataQueryArgs,
    IdbQueryData, // Use the more specific success type
    IdbQueryError
> = async ({ projectName, stores: argStores, selectedBmdResultRefs = [] }, { getState, dispatch }) => {

    if (!projectName) {
        return { error: { status: 'UNKNOWN_ERROR', message: 'Project name is required' } };
    }

    // Determine if a specific BMDResult ref is provided for targeted fetching
    const selectedRefString = selectedBmdResultRefs.length > 0 ? selectedBmdResultRefs[0] : null;

    const dbStoresToFetch = argStores.map(mapArgStoreToDbStore).filter(s => s !== null) as (keyof ProjectDB)[];
    const uniqueDbStores = Array.from(new Set(dbStoresToFetch));

    const logPrefix = '[idbBaseQuery v21 Legacy Typo Check]'; // Updated version
    console.log(`${logPrefix} Executing for project: ${projectName}, stores: ${argStores.join(', ')}, selectedRef: ${selectedRefString ?? 'None'}`);
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

        // Use a map to store promises, keyed by DB store name for easier retrieval
        const promisesMap = new Map<keyof ProjectDB, Promise<any>>();

        uniqueDbStores.forEach(dbStoreName => {
            const store = tx.objectStore(dbStoreName);
            let promise: Promise<any>;

            // --- Fetch Logic (Handles numeric key for BMD_RESULT_STORE) ---
            if (dbStoreName === BMD_RESULT_STORE && selectedRefString !== null) {
                let keyToGet: number | string;
                let isValidNumber = /^\d+$/.test(selectedRefString);

                if (isValidNumber) {
                    keyToGet = parseInt(selectedRefString, 10);
                    console.log(`${logPrefix} Getting specific item for ${dbStoreName} with numeric key: ${keyToGet}`);
                    promise = store.get(keyToGet);
                } else {
                    keyToGet = selectedRefString;
                    console.warn(`${logPrefix} Provided ref '${selectedRefString}' for ${dbStoreName} is not a simple integer string. Attempting get() with string key.`);
                    promise = store.get(keyToGet);
                }
            } else {
                console.log(`${logPrefix} Getting all for ${dbStoreName}`);
                promise = store.getAll();
            }
            // --------------------------
            promisesMap.set(dbStoreName, promise);
        });

        console.log(`${logPrefix} Awaiting all store promises (${promisesMap.size})...`);
        await Promise.all(promisesMap.values());

        const dbResultsMap = new Map<keyof ProjectDB, any>();
        for (const [dbStoreName, promise] of promisesMap.entries()) {
            try {
                dbResultsMap.set(dbStoreName, await promise);
            } catch (err) {
                console.error(`${logPrefix} Promise failed for store ${dbStoreName}:`, err);
                dbResultsMap.set(dbStoreName, undefined);
            }
        }
        console.log(`${logPrefix} All store promises resolved.`);

        // --- Filtering Logic for categoryAnalysisResults ---
        const catAnalysisArgName = 'categoryAnalysisResults'; // The name the CALLER uses
        const catAnalysisDbName = CAT_ANALYSIS_STORE; // The actual DB store name
        let finalFilteredNestedItems: CategoryAnalysisItem[] = []; // Holds the final filtered result

        // Check if category analysis was requested and data was fetched for its store
        if (argStores.includes(catAnalysisArgName) && dbResultsMap.has(catAnalysisDbName)) {
            const allStoredCollections = dbResultsMap.get(catAnalysisDbName) as StoredCategoryAnalysisCollection[];

            if (selectedRefString !== null && allStoredCollections) {
                console.log(`${logPrefix} Searching for Stored Collection with bmdResult matching string: '${selectedRefString}' among ${allStoredCollections.length} collections.`);

                const parentCollection = allStoredCollections.find(collection =>
                    collection && String(collection.bmdResult) === selectedRefString
                );

                // *** MODIFIED EXTRACTION LOGIC ***
                if (parentCollection) {
                    console.log(`${logPrefix} Found parent collection for ref ${selectedRefString}. Checking for nested items...`);

                    let nestedItemsToFilter: CategoryAnalysisItem[] = []; // Default to empty array
                    let usedPropertyName: string | null = null;

                    // 1. Prioritize the CORRECT spelling
                    const itemsCorrectSpelling = parentCollection?.['categoryAnalysisResults'];
                    if (Array.isArray(itemsCorrectSpelling)) {
                        nestedItemsToFilter = itemsCorrectSpelling;
                        usedPropertyName = 'categoryAnalysisResults';
                    } else {
                        // 2. If not found, check for the LEGACY TYPO spelling
                        console.log(`${logPrefix} Property 'categoryAnalysisResults' not found or not an array. Checking for legacy typo 'categoryAnalsyisResults'...`);
                        const itemsLegacyTypo = parentCollection?.['categoryAnalsyisResults']; // Use bracket notation
                        if (Array.isArray(itemsLegacyTypo)) {
                            nestedItemsToFilter = itemsLegacyTypo;
                            usedPropertyName = 'categoryAnalsyisResults'; // Note the typo
                            console.warn(`${logPrefix} Used LEGACY TYPO property 'categoryAnalsyisResults' to extract items. Consider fixing data in DB.`);
                        }
                    }

                    if (usedPropertyName) {
                        console.log(`${logPrefix} Extracted ${nestedItemsToFilter.length} nested items using property '${usedPropertyName}'.`);
                    } else {
                        console.warn(`${logPrefix} Could not find a valid array property ('categoryAnalysisResults' or 'categoryAnalsyisResults') in the parent collection for ref ${selectedRefString}.`);
                        // nestedItemsToFilter remains []
                    }

                    // Apply the property filters to the extracted items (which might be empty)
                    finalFilteredNestedItems = nestedItemsToFilter.filter(item => {
                        const passesFilter =
                            item && // Check if item exists
                            item.percentage != null && item.percentage >= MIN_PERCENTAGE &&
                            item.genesThatPassedAllFilters != null && item.genesThatPassedAllFilters >= MIN_GENES_PASSED_ALL_FILTERS &&
                            item.geneAllCount != null && item.geneAllCount >= MIN_GENE_ALL_COUNT && item.geneAllCount <= MAX_GENE_ALL_COUNT;
                        return passesFilter;
                    });
                    console.log(`${logPrefix} Filtering complete. ${finalFilteredNestedItems.length} nested items passed.`);

                } else {
                    console.warn(`${logPrefix} No parent collection found for bmdResultRef: ${selectedRefString}`);
                }
            } else if (selectedRefString === null && argStores.includes(catAnalysisArgName)) {
                console.warn(`${logPrefix} Cannot filter categoryAnalysisResults without a selectedBmdResultRef.`);
            } else {
                console.warn(`${logPrefix} No category analysis collections fetched or available.`);
            }
        }
        // ===============================================================

        // --- Result Structuring ---
        const dataResult: IdbQueryData = {};
        let bmdResultFound = true;

        argStores.forEach(argName => {
            const dbStoreName = mapArgStoreToDbStore(argName);
            if (!dbStoreName) {
                dataResult[argName] = undefined;
                return;
            }

            const fetchedData = dbResultsMap.get(dbStoreName);

            // Use the ARGUMENT name ('categoryAnalysisResults') as the key in the final result object,
            // but assign the 'finalFilteredNestedItems' which came from potentially different property names.
            if (argName === catAnalysisArgName) {
                dataResult[argName] = finalFilteredNestedItems;
            } else if (argName === 'bMDResult') {
                dataResult[argName] = fetchedData;
                if (selectedRefString !== null && (fetchedData === null || fetchedData === undefined)) {
                    console.warn(`${logPrefix} Requested bMDResult with ref ${selectedRefString} (used numeric key) but it was not found in DB.`);
                    bmdResultFound = false;
                }
            } else {
                dataResult[argName] = fetchedData;
            }
        });
        // ===================================

        console.log(`${logPrefix} Successfully prepared data for ${projectName}.`);
        argStores.forEach(argName => {
            const resultData = dataResult[argName];
            const size = Array.isArray(resultData) ? resultData.length : (resultData ? 1 : 0);
            console.log(`${logPrefix} Final result size for ${argName}: ${resultData === null || resultData === undefined ? 0 : size}`);
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
