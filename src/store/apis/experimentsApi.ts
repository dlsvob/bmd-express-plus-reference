// src/store/apis/experimentsApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
// Import the specific types from idbBaseQuery
import { idbBaseQuery, IdbQueryData, IdbRawDataQueryArgs } from './idbBaseQuery';
import {
    ProjectDB,
    BMD_RESULT_STORE,
    CAT_ANALYSIS_STORE,
} from '../../utils/myIDB';
import {
    BMDResult,
    // Assuming CategoryAnalysisItem is the type within the filtered array
    CategoryAnalysisItem,
} from '../../models/BMDxExported';
import { SelectableAnalysisInfo } from '../../models/ApplicationModel'; // Keep this

// --- Type Definitions ---

// Args type for the RAW DATA endpoint needs selectedBmdResultRefs
export interface RawDataQueryArgs {
    projectName: string | null;
    // Make selectedBmdResultRefs optional as it might not always be passed
    selectedBmdResultRefs?: string[];
}

// Return type for the LIST endpoint
type SelectableAnalysesQueryResult = SelectableAnalysisInfo[];

// Return type for the RAW DATA endpoint
export interface RawDataQueryResult {
    // Ensure this is always an array
    rawBmdResults: BMDResult[];
    // This should be the filtered list of items
    rawCategoryAnalysisItems: CategoryAnalysisItem[];
    // Keep this if needed downstream, though maybe redundant now
    selectedBmdResultRefs?: string[];
}

// Stores needed only for the selectable list
const SELECTABLE_LIST_STORES: ReadonlyArray<keyof ProjectDB> = [BMD_RESULT_STORE] as const;

// Stores needed for the full raw data
const RAW_DATA_STORES: ReadonlyArray<keyof ProjectDB> = [
    BMD_RESULT_STORE, CAT_ANALYSIS_STORE
] as const;


// --- API Slice Definition ---
export const experimentsApi = createApi({
    reducerPath: 'experimentsApi',
    baseQuery: idbBaseQuery,
    tagTypes: ['SelectableList', 'RawData'],
    endpoints: (builder) => ({

        // --- Endpoint 1: Fetch ONLY the Selectable List ---
        getSelectableAnalyses: builder.query<SelectableAnalysesQueryResult, RawDataQueryArgs>({
            query: ({ projectName }) => ({
                projectName: projectName ?? '',
                stores: ['bMDResult'], // Request only bMDResult store as arg name
                selectedBmdResultRefs: [], // Explicitly empty for list view
            } as IdbRawDataQueryArgs),
            // *** CORRECTED transformResponse ***
            transformResponse: (response: IdbQueryData | undefined, meta, arg): SelectableAnalysisInfo[] => {
                const logPrefix = '[experimentsApi getSelectableAnalyses transform v2]'; // New version log
                console.log(`${logPrefix} Transforming data for ${arg.projectName}`);

                const rawBmdResultsInput = response?.bMDResult || [];
                const rawBmdResults = Array.isArray(rawBmdResultsInput) ? rawBmdResultsInput : [];

                console.log(`${logPrefix} Found ${rawBmdResults.length} raw BMD results.`);

                const selectable: SelectableAnalysisInfo[] = [];

                rawBmdResults.forEach((bmdRes) => {
                    // *** FIX: Access '@ref' instead of 'id' ***
                    const bmdKey = bmdRes?.['@ref']; // Use bracket notation for '@ref'
                    const bmdName = bmdRes?.name;

                    // Check for null/undefined for both key and name
                    if (bmdKey == null || bmdName == null) {
                        // Update warning message slightly
                        console.warn(`${logPrefix} Skipping BMD result due to missing @ref or name:`, bmdRes);
                        return;
                    }

                    // Key '@ref' seems to be numeric based on logs (e.g., 566940)
                    // Ensure it's treated as a number
                    if (typeof bmdKey !== 'number' || isNaN(bmdKey)) {
                        console.warn(`${logPrefix} Skipping BMD result due to non-numeric or missing @ref:`, bmdRes);
                        return;
                    }

                    selectable.push({
                        bmdResultRef: bmdKey, // Use the numeric key directly
                        bmdResultName: bmdName || 'Unnamed BMD Result',
                    });
                });

                selectable.sort((a, b) => a.bmdResultName.localeCompare(b.bmdResultName));

                console.log(`${logPrefix} Complete. Selectable: ${selectable.length}`);
                return selectable;
            },
            keepUnusedDataFor: 60 * 60 * 24 * 7,
            refetchOnFocus: false,
            refetchOnReconnect: false,
            providesTags: (result, error, args) =>
                args.projectName
                    ? [{ type: 'SelectableList', id: args.projectName }]
                    : [],
        }),

        // --- Endpoint 2: Fetch ONLY the Raw Data Arrays ---
        // (Keep the previously corrected version of getRawAnalysisData)
        getRawAnalysisData: builder.query<RawDataQueryResult, RawDataQueryArgs>({
            query: ({ projectName, selectedBmdResultRefs }) => ({
                projectName: projectName ?? '',
                stores: ['bMDResult', 'categoryAnalysisResults'],
                selectedBmdResultRefs: selectedBmdResultRefs
            } as IdbRawDataQueryArgs),
            transformResponse: (response: IdbQueryData | undefined, meta, arg): RawDataQueryResult => {
                const logPrefix = '[experimentsApi getRawAnalysisData transform v2]'; // New version log
                console.log(`${logPrefix} Structuring raw data for ${arg.projectName}, selectedRefs: ${arg.selectedBmdResultRefs?.join(',') ?? 'None'}`);
                console.log(`${logPrefix} Received response from idbBaseQuery:`, response);

                const bmdResultInput = response?.bMDResult;
                const categoryAnalysisItemsInput = response?.categoryAnalysisResults || [];

                let normalizedBmdResults: BMDResult[] = [];
                if (Array.isArray(bmdResultInput)) {
                    normalizedBmdResults = bmdResultInput;
                    console.log(`${logPrefix} Received BMD results as array.`);
                } else if (typeof bmdResultInput === 'object' && bmdResultInput !== null) {
                    normalizedBmdResults = [bmdResultInput];
                    console.log(`${logPrefix} Received single BMD result object.`);
                } else {
                    console.log(`${logPrefix} Received no BMD result (null/undefined).`);
                }

                const normalizedCategoryItems = Array.isArray(categoryAnalysisItemsInput)
                    ? categoryAnalysisItemsInput
                    : [];

                const rawData: RawDataQueryResult = {
                    rawBmdResults: normalizedBmdResults,
                    rawCategoryAnalysisItems: normalizedCategoryItems,
                    selectedBmdResultRefs: arg.selectedBmdResultRefs?.map(ref => parseInt(ref, 10)).filter(num => !isNaN(num)),
                };

                console.log(`${logPrefix} Complete. Final Bmd count: ${rawData.rawBmdResults.length}, Final Cat count: ${rawData.rawCategoryAnalysisItems.length}`);
                return rawData;
            },
            keepUnusedDataFor: 60 * 60 * 24 * 7,
            refetchOnFocus: false,
            refetchOnReconnect: false,
            providesTags: (result, error, args) =>
                args.projectName
                    ? [{ type: 'RawData', id: args.projectName }]
                    : [],
        }),

    }),
});

// Export hooks for both endpoints
export const { useGetSelectableAnalysesQuery, useGetRawAnalysisDataQuery } = experimentsApi;
