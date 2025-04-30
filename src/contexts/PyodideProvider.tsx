// src/contexts/PyodideProvider.tsx
import { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { PyodideInterface } from 'pyodide';
import { initializePyodideContext } from '../utils/pyodideContextInitializer';

// --- Define the shape of the context value
export interface PyodideContextState {
    pyodideInstance: PyodideInterface | null;
    isLoading: boolean;
    error: Error | null;
}

// --- Create the context object with a default value (often undefined or null initially) ---
export const PyodideContext = createContext<PyodideContextState | undefined>(undefined);

// --- Define the Provider component ---
export const PyodideProvider = ({ children }: { children: ReactNode }) => {
    console.log('[PyodideProvider.tsx] PyodideProvider component rendering...');
    const [pyodideInstance, setPyodideInstance] = useState<PyodideInterface | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        console.log('[PyodideProvider.tsx] useEffect running...');
        const init = async () => {
            console.log('[PyodideProvider.tsx] init() function called...');
            if (pyodideInstance || error) return;

            try {
                await initializePyodideContext(/* Pass setters if needed, or handle throw */);
                setPyodideInstance(window.pyodide || null);
                setError(null);
            } catch (initError: unknown) {
                console.error("[PyodideProvider] Caught error during initialization:", initError);
                setError(initError instanceof Error ? initError : new Error(String(initError)));
                setPyodideInstance(null);
            } finally {
                setIsLoading(false);
                console.log("[PyodideProvider] Setting loading to false.");
            }
        };

        void init(); // Use void to handle promise

        return () => {
            console.log("[PyodideProvider] Cleanup effect.");
        };
    }, []); // Empty dependency array to run once on mount

    const contextValue: PyodideContextState = {
        pyodideInstance,
        isLoading,
        error,
    };

    return (
        <PyodideContext.Provider value={contextValue}>
            {children}
        </PyodideContext.Provider>
    );
};

// Custom hook for using the context
export const usePyodide = (): PyodideContextState => {
    const context = useContext(PyodideContext);
    if (context === undefined) {
        throw new Error('usePyodide must be used within a PyodideProvider');
    }
    return context;
};
