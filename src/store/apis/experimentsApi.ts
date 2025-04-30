// src/store/apis/experimentsApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { idbBaseQuery, IdbQueryData, IdbRawDataQueryArgs } from './idbBaseQuery';
import { BMDResult,CategoryAnalysisItem } from '../../models/BMDxExported';
import { SelectableAnalysisInfo } from '../../models/applicationModel'; // Expects number ref

export interface RawDataQueryArgs {
    projectName: string | null;
    selectedBmdResultRefs?: string[];
}

type SelectableAnalysesQueryResult = SelectableAnalysisInfo[];

export interface RawDataQueryResult {
    rawBmdResults: BMDResult[];
    rawCategoryAnalysisItems: Array<{ bmdResultRef: number | string; item: CategoryAnalysisItem }>;
    selectedBmdResultRefs?: number[];
}

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
            transformResponse: (response: IdbQueryData | undefined, _meta, arg: RawDataQueryArgs | undefined): SelectableAnalysisInfo[] => {
                const logPrefix = '[experimentsApi getSelectableAnalyses transform v8 Final Fix]';
                const currentProjectName = arg?.projectName ?? 'Unknown Project';
                if (!arg?.projectName) {
                    console.warn(`${logPrefix} 'arg' or 'arg.projectName' is missing/invalid in transformResponse. Returning empty array.`);
                    return [];
                }
                console.log(`${logPrefix} Transforming data for ${currentProjectName}`);
                const rawBmdResultsInput = response?.bMDResult || [];
                const rawBmdResults = Array.isArray(rawBmdResultsInput) ? rawBmdResultsInput : [];
                const selectable: SelectableAnalysisInfo[] = [];
                rawBmdResults.forEach((bmdRes) => {
                    const bmdKey = bmdRes?.['@ref'];
                    const bmdName = bmdRes?.name;
                    if (bmdKey == null || bmdName == null) return;
                    const bmdKeyNum = Number(bmdKey);
                    if (isNaN(bmdKeyNum)) {
                        console.warn(`${logPrefix} Skipping BMD result due to non-numeric or missing @ref:`, bmdRes);
                        return;
                    }
                    selectable.push({
                        bmdResultRef: bmdKeyNum, // Assign number
                        bmdResultName: bmdName || 'Unnamed BMD Result',
                        doseResponseExperimentRef: String(bmdRes.doseResponseExperiment),
                        doseResponseExperimentName: 'Unknown Experiment',
                    });
                });
                selectable.sort((a, b) => a.bmdResultName.localeCompare(b.bmdResultName));
                return selectable;
            },
            keepUnusedDataFor: 60 * 60 * 24 * 7,
            providesTags: (_result, _error, args: RawDataQueryArgs | undefined) =>
                args?.projectName
                    ? [{ type: 'SelectableList', id: args.projectName }]
                    : [],
        }),

        getRawAnalysisData: builder.query<RawDataQueryResult, RawDataQueryArgs>({
            query: ({ projectName, selectedBmdResultRefs }) => ({
                projectName: projectName ?? '',
                stores: ['bMDResult', 'categoryAnalysisResults'],
                selectedBmdResultRefs: selectedBmdResultRefs
            } as IdbRawDataQueryArgs),
            transformResponse: (response: IdbQueryData | undefined, _meta, arg: RawDataQueryArgs | undefined): RawDataQueryResult => {

                const logPrefix = '[experimentsApi getRawAnalysisData transform v31 Final Fix]'; // Version Bump
                const currentProjectName = arg?.projectName ?? 'Unknown Project';
                const currentSelectedRefs = (arg && Array.isArray(arg.selectedBmdResultRefs)) ? arg.selectedBmdResultRefs : [];
                if (!arg?.projectName) {
                    console.warn(`${logPrefix} 'arg' or 'arg.projectName' is missing/invalid in transformResponse. Returning empty result.`);
                    return { rawBmdResults: [], rawCategoryAnalysisItems: [], selectedBmdResultRefs: [] };
                }
                console.log(`${logPrefix} Received response from idbBaseQuery for project ${currentProjectName}, refs [${currentSelectedRefs?.join(', ')}]:`);

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
                    selectedBmdResultRefs: currentSelectedRefs?.map((ref: string) => parseInt(ref, 10)).filter((num: number) => !isNaN(num)),
                };
                return rawData;
            },
            keepUnusedDataFor: 60 * 60 * 24 * 7,
            providesTags: (_result, _error, args: RawDataQueryArgs | undefined) =>
                args?.projectName
                    ? [{ type: 'RawData', id: args.projectName }]
                    : [],
        }),

    }),
});

export const { useGetSelectableAnalysesQuery, useGetRawAnalysisDataQuery } = experimentsApi;
