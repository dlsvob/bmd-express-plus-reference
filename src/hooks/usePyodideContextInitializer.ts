// src/hooks/usePyodideContextInitializer.ts
import { useEffect, useState } from 'react';

function dedent(text: string): string {
  const lines = text.split("\n");
  while (lines.length && lines[0].trim() === "") {
    lines.shift();
  }
  const indentLengths = lines
    .filter(line => line.trim().length > 0)
    .map(line => {
      const match = line.match(/^(\s+)/);
      return match ? match[1].length : 0;
    });
  const minIndent = indentLengths.length ? Math.min(...indentLengths) : 0;
  return lines.map(line => line.substring(minIndent)).join("\n");
}

export interface PyodideContext {
  runPython: (code: string) => Promise<any>;
  getGlobal: (name: string) => any;
  [key: string]: any; // dynamically added Python functions
}

export function usePyodideContextInitializer({
  pythonModules,
  exposedFunctions = [],
  packages = ["pandas", "numpy", "scipy", "bokeh", "micropip"],
}: {
  pythonModules: Record<string, string>; // { moduleName: rawPythonCode }
  exposedFunctions?: string[]; // Python functions to expose by name
  packages?: string[]; // Optional Pyodide packages to load
}): {
  isReady: boolean;
  pyContext: PyodideContext | null;
} {
  const [isReady, setIsReady] = useState(false);
  const [pyContext, setPyContext] = useState<PyodideContext | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const pyodide = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
        });

        await pyodide.loadPackage(packages);

        // Optional extra install via micropip
        if (packages.includes("micropip")) {
          await pyodide.runPythonAsync(`
import micropip
await micropip.install("xyzservices")
          `);
        }

        // Register all passed Python modules
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

        // Create the context with helpers
        const context: PyodideContext = {
          runPython: async (code: string) => await pyodide.runPythonAsync(code),
          getGlobal: (name: string) => pyodide.globals.get(name),
        };

        // Optionally expose specific Python functions to context
        for (const funcName of exposedFunctions) {
          context[funcName] = pyodide.globals.get(funcName);
        }

        setPyContext(context);
        setIsReady(true);
      } catch (err) {
        console.error("Error initializing Pyodide:", err);
      }
    })();
  }, [pythonModules, exposedFunctions]);

  return { isReady, pyContext };
}