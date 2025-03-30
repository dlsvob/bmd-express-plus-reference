// src/components/py/HelloPyodide.tsx
// @ts-ignore
import bokehAppCode from '../bokeh_app.py?raw';

const App = () => {
    const { isReady, pyContext } = usePyodideContextInitializer({
        pythonModules: { bokeh_app: bokehAppCode },
        exposedFunctions: ["say_hello"]
    });

    const callHello = async () => {
        const result = pyContext?.say_hello("Alice");
        console.log(result); // Should log "Hello, Alice!"
    };

    if (!isReady || !pyContext) return <div>Loading Pyodide...</div>;

    return <button onClick={callHello}>Say Hello</button>;
};