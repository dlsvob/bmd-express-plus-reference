// src/store/api/pyodideBaseQuery.ts
import { BaseQueryFn } from '@reduxjs/toolkit/query/react';

// --- FIX: Replace any with unknown/Error ---
const pyodideBaseQuery: BaseQueryFn<{ code: string }, unknown, string> = async (
    // -----------------------------------------
    { code },
    // --- FIX: Remove unused parameters ---
    /* _api, */
    /* _extraOptions */
    // -----------------------------------
) => {
    try {
        // Load Pyodide if it isn't loaded yet.
        if (!window.pyodide) {
            console.log("Pyodide not found, loading from CDN...");
            // Ensure loadPyodide exists before calling
            if (typeof window.loadPyodide !== 'function') {
                throw new Error("loadPyodide function not found on window.");
            }
            window.pyodide = await window.loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
            });
            console.log("Pyodide loaded successfully.");
        }

        // Load necessary packages if not already loaded.
        // Assumes global.d.ts declares __packages_loaded
        if (!window.__packages_loaded) {
            console.log("Loading required packages: numpy, pandas, scipy...");
            await window.pyodide.loadPackage(["numpy", "pandas", "scipy"]);
            window.__packages_loaded = true;
            console.log("Required packages loaded.");
        }

        // Load the clustering module if it hasn't been loaded yet.
        // Assumes global.d.ts declares __clustering_module_loaded and __clustering_script
        if (!window.__clustering_module_loaded) {
            if (window.__clustering_script) {
                console.log("Loading clustering module...");
                await window.pyodide.runPythonAsync(window.__clustering_script);
                window.__clustering_module_loaded = true;
                console.log("Clustering module loaded.");
            } else {
                // Consider just warning instead of throwing if script might be optional
                console.warn("Clustering script not available on window.");
                // throw new Error("Clustering script not available.");
            }
        }

        // Finally, run the provided Python code.
        const result = await window.pyodide.runPythonAsync(code);
        return { data: result };
        // --- FIX: Replace any with unknown ---
    } catch (error: unknown) {
        // -----------------------------------
        // --- FIX: Use instanceof Error ---
        const message = error instanceof Error ? error.message : String(error);
        return { error: message || 'An error occurred running Python code' };
        // ---------------------------------
    }
};

export default pyodideBaseQuery;
