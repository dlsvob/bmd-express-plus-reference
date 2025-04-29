// src/store/api/pyodideClusteringApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import pyodideBaseQuery from './pyodideBaseQuery';
import categoryClusteringScript from '../../py/categoryClustering.py?raw';
// --- FIX: Import the specific type for rowData ---
import type { ApiClusteringInputItem } from '../../utils/clusteringUtils'; // Adjust path if needed
// -------------------------------------------------

// Assumes global.d.ts declares __clustering_script
if (!window.__clustering_script) {
    window.__clustering_script = categoryClusteringScript;
}

export interface ClusteringParams {
    // --- FIX: Replace any[] with specific type ---
    rowData: ApiClusteringInputItem[];
    // --------------------------------------------
    method?: string;
    numClusters?: number;
}

export const pyodideClusteringApi = createApi({
    reducerPath: 'pyodideClusteringApi',
    baseQuery: pyodideBaseQuery,
    endpoints: (builder) => ({
        // Consider using mutation if it has side effects or isn't idempotent
        runHierarchicalClustering: builder.query<string, ClusteringParams>({
            query: ({ rowData, method = 'average', numClusters = 0 }) => {
                // Convert rowData to a JSON string, then double-stringify it.
                // This double stringify seems unusual - verify if Python side expects this.
                // If Python expects a direct list/object, pass rowData directly
                // and adjust pyodideBaseQuery or the Python script.
                // Assuming double stringify is currently required:
                const rowDataStr = JSON.stringify(rowData);
                const doubleString = JSON.stringify(rowDataStr);
                const code = `
# Ensure the Python function is available (might be better handled in base query/context)
import js
if 'categoryClustering' not in js.globals:
    raise Exception("categoryClustering module not loaded")
clustering_func = js.globals.get('categoryClustering').hierarchical_clustering_from_rows

# Call the function
result = clustering_func(
  ${doubleString},
  method="${method}",
  num_clusters=${numClusters}
)
result
`;
                return { code };
            },
        }),
    }),
});

export const { useRunHierarchicalClusteringQuery } = pyodideClusteringApi;
