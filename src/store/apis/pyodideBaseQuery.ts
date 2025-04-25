// src/store/api/pyodideBaseQuery.ts
import { BaseQueryFn } from '@reduxjs/toolkit/query/react';

const pyodideBaseQuery: BaseQueryFn<{ code: string }, any, string> = async (
    { code },
    _api,
    _extraOptions
) => {
    try {
        // Load Pyodide if it isn't loaded yet.
        if (!window.pyodide) {
            console.log("Pyodide not found, loading from CDN...");
            window.pyodide = await window.loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
            });
            console.log("Pyodide loaded successfully.");
        }

        // Load necessary packages if not already loaded.
        if (!window.__packages_loaded) {
            console.log("Loading required packages: numpy, pandas, scipy...");
            await window.pyodide.loadPackage(["numpy", "pandas", "scipy"]);
            window.__packages_loaded = true;
            console.log("Required packages loaded.");
        }

        // Load the clustering module if it hasn't been loaded yet.
        if (!window.__clustering_module_loaded) {
            if (window.__clustering_script) {
                console.log("Loading clustering module...");
                await window.pyodide.runPythonAsync(window.__clustering_script);
                window.__clustering_module_loaded = true;
                console.log("Clustering module loaded.");
            } else {
                throw new Error("Clustering script not available.");
            }
        }

        // Finally, run the provided Python code.
        const result = await window.pyodide.runPythonAsync(code);
        return { data: result };
    } catch (error: any) {
        return { error: error.message || 'An error occurred running Python code' };
    }
};

export default pyodideBaseQuery;