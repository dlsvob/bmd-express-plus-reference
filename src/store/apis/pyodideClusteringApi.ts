// src/store/api/pyodideClusteringApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import pyodideBaseQuery from './pyodideBaseQuery';
import categoryClusteringScript from '../../py/categoryClustering.py?raw';

// (Optional) Store the clustering script globally so it’s available in the base query.
if (!window.__clustering_script) {
    window.__clustering_script = categoryClusteringScript;
}

export interface ClusteringParams {
    rowData: any[];
    method?: string;
    numClusters?: number;
}

export const pyodideClusteringApi = createApi({
    reducerPath: 'pyodideClusteringApi',
    baseQuery: pyodideBaseQuery,
    endpoints: (builder) => ({
        runHierarchicalClustering: builder.query<string, ClusteringParams>({
            query: ({ rowData, method = 'average', numClusters = 0 }) => {
                // Convert rowData to a JSON string, then double-stringify it.
                const rowDataStr = JSON.stringify(rowData);
                const doubleString = JSON.stringify(rowDataStr);
                const code = `
result = hierarchical_clustering_from_rows(
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