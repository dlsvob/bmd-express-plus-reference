// src/store/apis/enrichrApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// --- Interfaces for Enrichr API ---

// Args for submitting a list
interface EnrichrAddListArgs {
    geneList: string[];
    description: string;
}

// Response from submitting a list
interface EnrichrAddListResponse {
    userListId: number;
    shortId: string;
}

// Args for fetching results
interface EnrichrResultsArgs {
    userListId: number;
    backgroundType: string; // e.g., 'GO_Biological_Process_2023'
}

// Structure of a single enrichment term result (adjust based on actual Enrichr response)
// Example for GO_Biological_Process_2023
// [rank, term_name, p_value, z_score, combined_score, overlapping_genes, adj_p_value, old_p_value, old_adj_p_value]
type EnrichmentTerm = [
    number, // Rank
    string, // Term Name
    number, // P-value
    number, // Z-score
    number, // Combined Score
    string[], // Overlapping Genes
    number, // Adjusted P-value
    number, // Old P-value
    number, // Old Adjusted P-value
];

// Response from fetching results (key is the backgroundType)
interface EnrichrResultsResponse {
    [backgroundType: string]: EnrichmentTerm[];
}

// --- API Slice Definition ---
export const enrichrApi = createApi({
    reducerPath: 'enrichrApi',
    baseQuery: fetchBaseQuery({ baseUrl: 'https://maayanlab.cloud/Enrichr' }),
    endpoints: (builder) => ({
        // --- Mutation to add a gene list ---
        addList: builder.mutation<EnrichrAddListResponse, EnrichrAddListArgs>({
            query: ({ geneList, description }) => {
                const formData = new FormData();
                formData.append('list', geneList.join('\n'));
                formData.append('description', description);
                return {
                    url: '/addList',
                    method: 'POST',
                    body: formData,
                    // No 'Content-Type' header needed; browser sets it for FormData
                };
            },
        }),
        // --- Query to get enrichment results ---
        getEnrichmentResults: builder.query<
            EnrichrResultsResponse,
            EnrichrResultsArgs
        >({
            query: ({ userListId, backgroundType }) =>
                `/enrich?userListId=${userListId}&backgroundType=${backgroundType}`,
        }),
    }),
});

// --- Export hooks for use in components ---
export const { useAddListMutation, useLazyGetEnrichmentResultsQuery } =
    enrichrApi;

// --- Export types if needed elsewhere ---
export type {
    EnrichrAddListArgs,
    EnrichrAddListResponse,
    EnrichrResultsArgs,
    EnrichrResultsResponse,
    EnrichmentTerm,
};
