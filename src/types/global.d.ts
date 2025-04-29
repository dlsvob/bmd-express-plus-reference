// src/types/global.d.ts

// Import PyodideInterface if you haven't already in another global types file
import { PyodideInterface } from 'pyodide';

declare global {
    interface Window {
        // Pyodide instance (from PyodideProvider/initializer)
        pyodide?: PyodideInterface;

        // Custom context for Pyodide functions (from initializer)
        pyContext?: {
            hierarchical_clustering_from_rows?: (...args: unknown[]) => Promise<string>; // Use unknown[] for args
            // Add other functions if exposed...
        };

        // Flags used in pyodideBaseQuery (consider managing this state differently later)
        __packages_loaded?: boolean;
        __clustering_module_loaded?: boolean;
        __clustering_script?: string;
    }
}

// Add this export line to make it a module, which is often necessary
// for global declarations to be picked up correctly.
export { };
