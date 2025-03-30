// src/contexts/PyodideProvider.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';
import { initializePyodideContext } from '../utils/pyodideContextInitializer';

interface PyodideContextType {
    pyodide: any;
    pyContext: any;
    loading: boolean;
    error: any;
}

const PyodideContext = createContext<PyodideContextType | undefined>(undefined);

export const usePyodide = (): PyodideContextType => {
    const context = useContext(PyodideContext);
    if (!context) {
        throw new Error('usePyodide must be used within a PyodideProvider');
    }
    return context;
};

interface PyodideProviderProps {
    children: ReactNode;
}

export const PyodideProvider: React.FC<PyodideProviderProps> = ({ children }) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<any>(null);
    const [pyodideInstance, setPyodideInstance] = useState<any>(null);
    const [pyContext, setPyContext] = useState<any>(null);

    useEffect(() => {
        async function init() {
            try {
                await initializePyodideContext();
                setPyodideInstance(window.pyodide);
                setPyContext(window.pyContext);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    return (
        <PyodideContext.Provider
      value= {{ pyodide: pyodideInstance, pyContext, loading, error }
}
    >
    { children }
    </PyodideContext.Provider>
  );
};