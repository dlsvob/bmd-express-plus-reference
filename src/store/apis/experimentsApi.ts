// src/store/apis/experimentsApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { idbBaseQuery, IdbQueryData, IdbRawDataQueryArgs } from './idbBaseQuery'; // Ensure correct path
import {
    ProjectDB,
    BMD_RESULT_STORE,
    CAT_ANALYSIS_STORE,
} from '../../utils/myIDB'; // Ensure correct path
import {
    BMDResult,
    CategoryAnalysisItem,
} from '../../models/BMDxExported'; // Ensure correct path
import { SelectableAnalysisInfo } from '../../models/applicationModel'; // Ensure correct path

// --- Type Definitions ---

export interface RawDataQueryArgs {
    projectName: string | null;
    selectedBmdResultRefs?: string[];
}

type SelectableAnalysesQueryResult = SelectableAnalysisInfo[];

// --- UPDATE RawDataQueryResult ---
export interface RawDataQueryResult {
    rawBmdResults: BMDResult[];
    // This should be the array of { ref, item } objects
    rawCategoryAnalysisItems: Array<{ bmdResultRef: number | string; item: CategoryAnalysisItem }>;
    selectedBmdResultRefs?: number[]; // Parsed numeric refs
}
// -----------------------------

const SELECTABLE_LIST_STORES: ReadonlyArray<keyof ProjectDB> = [BMD_RESULT_STORE] as const;
const RAW_DATA_STORES: ReadonlyArray<keyof ProjectDB> = [
    BMD_RESULT_STORE, CAT_ANALYSIS_STORE
] as const;

export const experimentsApi = createApi({
    reducerPath: 'experimentsApi',
    baseQuery: idbBaseQuery,
    tagTypes: ['SelectableList', 'RawData'],
    endpoints: (builder) => ({

        getSelectableAnalyses: builder.query<SelectableAnalysesQueryResult, RawDataQueryArgs>({
            query: ({ projectName }) => ({
                projectName: projectName ?? '',
                stores: ['bMDResult'],
                selectedBmdResultRefs: [],
            } as IdbRawDataQueryArgs),
            transformResponse: (response: IdbQueryData | undefined, meta, arg): SelectableAnalysisInfo[] => {
                const logPrefix = '[experimentsApi getSelectableAnalyses transform v2]'; // Keep version consistent if only this part was correct
                console.log(`${logPrefix} Transforming data for ${arg.projectName}`);
                const rawBmdResultsInput = response?.bMDResult || [];
                const rawBmdResults = Array.isArray(rawBmdResultsInput) ? rawBmdResultsInput : [];
                console.log(`${logPrefix} Found ${rawBmdResults.length} raw BMD results.`);
                const selectable: SelectableAnalysisInfo[] = [];
                rawBmdResults.forEach((bmdRes) => {
                    const bmdKey = bmdRes?.['@ref'];
                    const bmdName = bmdRes?.name;
                    if (bmdKey == null || bmdName == null) {
                        console.warn(`${logPrefix} Skipping BMD result due to missing @ref or name:`, bmdRes);
                        return;
                    }
                    if (typeof bmdKey !== 'number' || isNaN(bmdKey)) {
                        console.warn(`${logPrefix} Skipping BMD result due to non-numeric or missing @ref:`, bmdRes);
                        return;
                    }
                    selectable.push({
                        bmdResultRef: bmdKey,
                        bmdResultName: bmdName || 'Unnamed BMD Result',
                    });
                });
                selectable.sort((a, b) => a.bmdResultName.localeCompare(b.bmdResultName));
                console.log(`${logPrefix} Complete. Selectable: ${selectable.length}`);
                return selectable;
            },
            // --- ADDED BACK MISSING CONFIG ---
            keepUnusedDataFor: 60 * 60 * 24 * 7, // Keep list data cached for a week
            refetchOnFocus: false,
            refetchOnReconnect: false,
            providesTags: (result, error, args) =>
                args.projectName
                    ? [{ type: 'SelectableList', id: args.projectName }]
                    : [],
            // ---------------------------------
        }),

        getRawAnalysisData: builder.query<RawDataQueryResult, RawDataQueryArgs>({
            query: ({ projectName, selectedBmdResultRefs }) => ({
                projectName: projectName ?? '',
                stores: ['bMDResult', 'categoryAnalysisResults'],
                selectedBmdResultRefs: selectedBmdResultRefs
            } as IdbRawDataQueryArgs),
            transformResponse: (response: IdbQueryData | undefined, meta, arg): RawDataQueryResult => {
                const logPrefix = '[experimentsApi getRawAnalysisData transform v24 Multi-Fetch]'; // Use latest version
                console.log(`${logPrefix} Received response from idbBaseQuery for project ${arg.projectName}, refs [${arg.selectedBmdResultRefs?.join(', ')}]:`);

                const catItemsReceived = response?.categoryAnalysisResults;
                const catItemCount = Array.isArray(catItemsReceived) ? catItemsReceived.length : 0;
                console.log(`${logPrefix} -> categoryAnalysisResults type: ${typeof catItemsReceived}, isArray: ${Array.isArray(catItemsReceived)}, length: ${catItemCount}`);
                if (Array.isArray(catItemsReceived) && catItemsReceived.length > 0) {
                    console.log(`${logPrefix} -> First categoryAnalysisResults item sample:`, catItemsReceived[0]);
                }
                const bmdResultInput = response?.bMDResult;
                console.log(`${logPrefix} -> bMDResult type: ${typeof bmdResultInput}, isArray: ${Array.isArray(bmdResultInput)}, length: ${Array.isArray(bmdResultInput) ? bmdResultInput.length : (bmdResultInput ? 1 : 0)}`);

                const categoryAnalysisItemsInput = response?.categoryAnalysisResults || [];
                const normalizedBmdResults: BMDResult[] = Array.isArray(bmdResultInput)
                    ? bmdResultInput
                    : (bmdResultInput ? [bmdResultInput] : []);
                const normalizedCategoryItems = categoryAnalysisItemsInput as Array<{ bmdResultRef: number | string; item: CategoryAnalysisItem }>;

                const rawData: RawDataQueryResult = {
                    rawBmdResults: normalizedBmdResults,
                    rawCategoryAnalysisItems: normalizedCategoryItems,
                    selectedBmdResultRefs: arg.selectedBmdResultRefs?.map(ref => parseInt(ref, 10)).filter(num => !isNaN(num)),
                };

                console.log(`${logPrefix} Complete. Final Bmd count: ${rawData.rawBmdResults.length}, Final Cat object count: ${rawData.rawCategoryAnalysisItems.length}`);
                return rawData;
            },
            // --- ADDED BACK MISSING CONFIG ---
            keepUnusedDataFor: 60 * 60 * 24 * 7, // Keep raw data cached for a week
            refetchOnFocus: false,
            refetchOnReconnect: false,
            providesTags: (result, error, args) =>
                args.projectName
                    ? [{ type: 'RawData', id: args.projectName }]
                    : [],
            // ---------------------------------
        }),

    }),
});

export const { useGetSelectableAnalysesQuery, useGetRawAnalysisDataQuery } = experimentsApi;
