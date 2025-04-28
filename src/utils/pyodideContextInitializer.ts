// src/utils/pyodideContextInitializer.ts

import { PyodideInterface } from 'pyodide'; // Assuming types are available

// @ts-ignore - Assuming Vite handles this import type
import categoryClusteringCode from '../py/categoryClustering.py?raw';

console.log('[pyodideContextInitializer.ts] File loaded, starting execution...'); 

// --- Helper Functions ---

// Helper for delayed promise
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function dedent(text: string): string {
    const lines = text.split("\n");
    while (lines.length && lines[0].trim() === "") { lines.shift(); }
    const indentLengths = lines.filter(line => line.trim().length > 0).map(line => {
        const match = line.match(/^(\s+)/);
        return match ? match[1].length : 0;
    });
    const minIndent = indentLengths.length ? Math.min(...indentLengths) : 0;
    return lines.map(line => line.substring(minIndent)).join("\n");
}

async function registerModule(moduleName: string, rawCode: string): Promise<void> {
    // Ensure window.pyodide exists before using it
    if (!window.pyodide) {
        throw new Error("Pyodide instance not available for module registration.");
    }
    const cleanedCode = dedent(rawCode).trim();
    const valid_module_name = moduleName.replace('-', '_');
    // Check if module is already loaded to avoid re-execution errors
    const alreadyLoaded = await window.pyodide.runPythonAsync(`import sys; '${moduleName}' in sys.modules`);
    if (!alreadyLoaded) {
        await window.pyodide.runPythonAsync(`
import types, sys
${valid_module_name}_code = r'''${cleanedCode}'''
${valid_module_name} = types.ModuleType("${moduleName}")
exec(${valid_module_name}_code, ${valid_module_name}.__dict__)
sys.modules["${moduleName}"] = ${valid_module_name}
`);
        console.log(`[PyodideInit] ${moduleName} module loaded.`);
    } else {
        console.log(`[PyodideInit] ${moduleName} module already registered.`);
    }
}

// --- Main Initialization Function with Retries ---
export async function initializePyodideContext(): Promise<void> {
    console.log('[PyodideInit] Starting initialization...');

    // --- Retry constants ---
    const MAX_RETRIES = 2; // Try initial + 2 retries = 3 attempts total
    const RETRY_DELAY_MS = 1000; // Wait 1 second between retries

    // --- Phase 1: Load Pyodide Core (Attempt only once) ---
    if (!window.pyodide) {
        const pyodideIndexURL = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/';
        console.log(`[PyodideInit] Pyodide not found. Loading from: ${pyodideIndexURL}`);
        try {
            // Ensure loadPyodide function itself exists
            if (typeof window.loadPyodide !== "function") {
                throw new Error("window.loadPyodide is not available. Check index.html script import.");
            }
            window.pyodide = await window.loadPyodide({ indexURL: pyodideIndexURL });
            console.log('[PyodideInit] window.loadPyodide call successful.');
        } catch (err) {
            console.error('[PyodideInit] CRITICAL ERROR during window.loadPyodide:', err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            // If core loading fails, we cannot proceed. Throw immediately.
            throw new Error(`Failed during window.loadPyodide: ${errorMessage}`);
        }
    } else {
        console.log('[PyodideInit] Pyodide instance already exists.');
    }
    // Double check after potential load
    if (!window.pyodide) {
        throw new Error('[PyodideInit] window.pyodide is still not defined after load attempt!');
    }
    console.log('[PyodideInit] Pyodide instance confirmed.');

    // --- Phase 2: Post-load Setup (Packages, Modules, Context) with Retries ---
    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
        try {
            console.log(`[PyodideInit] Post-load setup attempt ${attempt} of ${MAX_RETRIES + 1}...`);

            // 2a. Load required packages
            // Note: loadPackage is generally idempotent (won't reload if already present)
            console.log('[PyodideInit] Loading packages...');
            const packages = ["numpy", "pandas", "scipy"];
            await window.pyodide.loadPackage(packages);
            console.log("[PyodideInit] Required packages (numpy, pandas, scipy) loaded/confirmed.");

            // 2b. Explicit Pre-Import (Attempting Scipy module)
            // This is where the consistent error occurred previously
            console.log('[PyodideInit] Pre-importing scipy.spatial.transform._rotation...');
            await window.pyodide.runPythonAsync("import scipy.spatial.transform._rotation");
            console.log('[PyodideInit] Pre-import successful.');

            // 2c. Register the necessary Python module
            console.log('[PyodideInit] Registering Python modules...');
            await registerModule("categoryClustering", categoryClusteringCode);
            console.log('[PyodideInit] Python modules registered/confirmed.');

            // 2d. Create simplified, persistent Pyodide context
            console.log('[PyodideInit] Setting up simplified window.pyContext...');
            const categoryClusteringModule = window.pyodide.globals.get("categoryClustering");

            window.pyContext = {
                hierarchical_clustering_from_rows: categoryClusteringModule?.hierarchical_clustering_from_rows,
            };

            if (!window.pyContext || typeof window.pyContext.hierarchical_clustering_from_rows !== 'function') {
                console.error("[PyodideInit] FAILED to find or assign 'hierarchical_clustering_from_rows' to pyContext!");
                // Throw specific error to be caught by the retry mechanism
                throw new Error("Clustering function failed to load onto pyContext.");
            } else {
                console.log("[PyodideInit] Successfully mapped 'hierarchical_clustering_from_rows'.");
            }
            console.log('[PyodideInit] Simplified window.pyContext created.');

            // --- Success ---
            console.log(`[PyodideInit] Post-load setup succeeded on attempt ${attempt}.`);
            console.log("[PyodideInit] Initialization process completed successfully.");
            return; // Exit the function successfully

        } catch (err) {
            console.error(`[PyodideInit] Error during post-load setup attempt ${attempt}:`, err);

            if (attempt > MAX_RETRIES) {
                // Max retries reached, throw final error
                console.error("[PyodideInit] Max retries reached for post-load setup. Initialization failed.");
                const errorMessage = err instanceof Error ? err.message : String(err);
                // Re-throw the error to be caught by the caller (e.g., PyodideProvider)
                throw new Error(`Failed post-load setup after ${MAX_RETRIES + 1} attempts: ${errorMessage}`);
            }

            // Wait before retrying
            console.log(`[PyodideInit] Retrying post-load setup after ${RETRY_DELAY_MS}ms...`);
            await delay(RETRY_DELAY_MS);
        }
    }
    // If loop finishes without success or throwing final error (shouldn't happen with return/throw)
    throw new Error("[PyodideInit] Initialization loop exited unexpectedly.");
}


// --- Global declarations ---
// Make sure window.pyodide and window.pyContext are declared globally
// (e.g., in a *.d.ts file or using declare global)
declare global {
    interface Window {
        loadPyodide: (options?: { indexURL: string }) => Promise<PyodideInterface>;
        pyodide?: PyodideInterface;
        pyContext?: {
            hierarchical_clustering_from_rows?: (...args: any[]) => any; // Add more specific types if known
            // other functions...
        };
    }
}