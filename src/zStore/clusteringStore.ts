// src/zstore/clusteringStore.ts

import create from 'zustand';
import { usePyodideStore } from './pyodideStore'; // Assume you already have a Pyodide store

export interface ClusteringResult {
    clusterAssignments?: number[];
    leavesOrder?: number[];
    orderedLabels?: string[];
    orderedClusters?: number[];
    linkageMatrix?: any[];
    error?: string;
}

interface ClusteringState {
    isClustering: boolean;
    result: ClusteringResult | null;
    error: string | null;
    runClustering: (rowData: any, method?: string, numClusters?: number) => Promise<void>;
}

export const useClusteringStore = create<ClusteringState>((set, get) => ({
    isClustering: false,
    result: null,
    error: null,
    runClustering: async (rowData: any, method = "average", numClusters = 0) => {
        set({ isClustering: true, error: null, result: null });
        try {
            // Retrieve the Pyodide context from the pyodideStore
            const { context, isReady } = usePyodideStore.getState();
            if (!isReady || !context) {
                throw new Error("Pyodide is not ready");
            }

            // Convert the rowData (JSON object) to a JSON string.
            // Make sure rowData is in the expected format.
            const rowDataJson = JSON.stringify(rowData);

            // Assume that when initializing Pyodide you have exposed
            // the clustering function. For example, you might have done:
            //    context.hierarchical_clustering_from_rows = pyodide.globals.get("hierarchical_clustering_from_rows")
            // Now, call the clustering function:
            const clusteringFn = context.getGlobal("hierarchical_clustering_from_rows");
            if (!clusteringFn) {
                throw new Error("Clustering function not available in Pyodide globals");
            }

            // Call the Python function with the JSON data.
            // This function is expected to return a JSON string.
            const resultJson: string = await clusteringFn(rowDataJson, method, numClusters);

            // Parse the result JSON from Python.
            const result = JSON.parse(resultJson);

            set({ result, isClustering: false });
        } catch (err: any) {
            set({
                error: err.message || "Clustering failed",
                isClustering: false,
                result: null,
            });
        }
    },
}));