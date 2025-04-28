// src/contexts/PyodideProvider.tsx
import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react'; // Add createContext
import { PyodideInterface } from 'pyodide';
import { initializePyodideContext } from '../utils/pyodideContextInitializer'; // Adjust path

// 1. Define the shape of the context value
export interface PyodideContextState {
    pyodideInstance: PyodideInterface | null;
    isLoading: boolean;
    error: Error | null;
}

// 2. Create the context object with a default value (often undefined or null initially)
//    **** EXPORT THIS ****
export const PyodideContext = createContext<PyodideContextState | undefined>(undefined);

// 3. Define the Provider component (keep your existing logic)
export const PyodideProvider = ({ children }: { children: ReactNode }) => {
    console.log('[PyodideProvider.tsx] PyodideProvider component rendering...'); 
    const [pyodideInstance, setPyodideInstance] = useState<PyodideInterface | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        console.log('[PyodideProvider.tsx] useEffect running...');
        const init = async () => {
            console.log('[PyodideProvider.tsx] init() function called...'); 
            // Check if already initialized or errored to avoid re-running unnecessarily
            // Although StrictMode will still cause double run in dev
            if (pyodideInstance || error) return;

            try {
                // Pass the state setters to the initializer
                // Assuming initializePyodideContext is adapted to take these, or handles errors by throwing
                await initializePyodideContext(/* Pass setters if needed, or handle throw */);
                // If initializePyodideContext sets window.pyodide, get it here
                setPyodideInstance(window.pyodide || null); // Or however instance is passed back
                setError(null); // Ensure error is null on success
            } catch (initError: any) {
                console.error("[PyodideProvider] Caught error during initialization:", initError);
                setError(initError instanceof Error ? initError : new Error(String(initError)));
                setPyodideInstance(null);
            } finally {
                setIsLoading(false);
                console.log("[PyodideProvider] Setting loading to false.");
            }
        };

        init();

        // Cleanup function (optional, might be needed if Pyodide has teardown)
        return () => {
            console.log("[PyodideProvider] Cleanup effect.");
            // Add any Pyodide cleanup logic if necessary
            // Be cautious with cleanup during StrictMode's double invoke
        };
        // Rerun effect shouldn't strictly depend on instance/error, only run once on mount
    }, []); // Empty dependency array to run once on mount

    // 4. Define the value provided by the context
    const contextValue: PyodideContextState = {
        pyodideInstance,
        isLoading,
        error,
    };

    // 5. Use the exported Context's Provider component
    return (
        <PyodideContext.Provider value={contextValue}>
            {children}
        </PyodideContext.Provider>
    );
};

// Optional: Custom hook for using the context
export const usePyodide = (): PyodideContextState => {
    const context = useContext(PyodideContext);
    if (context === undefined) {
        throw new Error('usePyodide must be used within a PyodideProvider');
    }
    return context;
};