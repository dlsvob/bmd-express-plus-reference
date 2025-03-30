// src/zStore/pyodideStore.ts

import { create } from 'zustand';

interface PyodideContext {
    runPython: (code: string) => Promise<any>;
    getGlobal: (name: string) => any;
    // Additional exposed Python functions can be added dynamically:
    [key: string]: any;
}

interface PyodideState {
    isReady: boolean;
    context: PyodideContext | null;
    error: string | null;
    initialize: (
        csvData: string,
        pythonModules: Record<string, string>,
        exposedFunctions?: string[]
    ) => Promise<void>;
}

export const usePyodideStore = create<PyodideState>((set) => ({
    isReady: false,
    context: null,
    error: null,
    initialize: async (
        csvData: string,
        pythonModules: Record<string, string>,
        exposedFunctions: string[] = []
    ) => {
        try {
            // Load Pyodide from the CDN.
            const pyodide = await window.loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
            });

            // Load required packages.
            await pyodide.loadPackage([
                'pandas',
                'numpy',
                'scipy',
                'bokeh',
                'micropip',
            ]);

            // Optionally install extra packages via micropip.
            await pyodide.runPythonAsync(`
import micropip
await micropip.install("xyzservices")
      `);

            // Helper function to dedent Python code.
            const dedent = (text: string): string => {
                const lines = text.split("\n");
                while (lines.length && lines[0].trim() === "") {
                    lines.shift();
                }
                const indentLengths = lines
                    .filter((line) => line.trim().length > 0)
                    .map((line) => {
                        const match = line.match(/^(\s+)/);
                        return match ? match[1].length : 0;
                    });
                const minIndent = indentLengths.length ? Math.min(...indentLengths) : 0;
                return lines.map((line) => line.substring(minIndent)).join("\n");
            };

            // Register the provided Python modules.
            for (const [moduleName, rawCode] of Object.entries(pythonModules)) {
                const cleanedCode = dedent(rawCode).trim();
                await pyodide.runPythonAsync(`
import types, sys
${moduleName}_code = r'''${cleanedCode}'''
${moduleName} = types.ModuleType("${moduleName}")
exec(${moduleName}_code, ${moduleName}.__dict__)
sys.modules["${moduleName}"] = ${moduleName}
        `);
            }

            // Build the context object.
            const context: PyodideContext = {
                runPython: async (code: string) =>
                    await pyodide.runPythonAsync(code),
                getGlobal: (name: string) => pyodide.globals.get(name),
            };

            // Expose additional Python functions as requested.
            for (const funcName of exposedFunctions) {
                context[funcName] = pyodide.globals.get(funcName);
            }

            // Update the store.
            set({ context, isReady: true, error: null });
        } catch (err: any) {
            console.error('Error initializing Pyodide:', err);
            set({ error: err.message || 'Initialization failed', isReady: false });
        }
    },
}));