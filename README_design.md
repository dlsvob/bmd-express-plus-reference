# Project Design Documentation for "BMD Express...Plus!"

This document summarizes the settled-upon design and architecture of the "BMD Express...Plus!" project, and includes a project tree outlining the file structure with notes on which files are not yet implemented.

---

## 1. Overview

**"BMD Express...Plus!"** is a scientific dashboard and interactive visual analysis application. It is designed to:

- Ingest large JSON datasets from user uploads.
- Stream parse the JSON using Oboe.js and store data in IndexedDB via Dexie.
- Provide real-time progress updates in a terminal-style overlay.
- Integrate Python computations via Pyodide.
- Support clustering and further analysis (clustering component is implemented; other analysis components are planned).

---

## 2. User Workflow & UI

### Welcome Page

- **Purpose:**  
  The welcome page is the entry point where the user is greeted with the app name and two options: 
  - Initialize a project (upload a JSON file)
  - Analyze a project

- **Navigation:**  
  Routing is handled by React Router v6.

### Initialize Project Page

- **Purpose:**  
  This page allows the user to upload a JSON file that is ingested into IndexedDB.
  
- **File Ingestion Flow:**  
  1. **Uploading Phase:**  
     - Upon file selection, the upload button immediately shows "Uploading...".
  2. **Parsing Phase:**  
     - The overlay immediately shows "Parsing...".
     - The file is streamed using Oboe.js.
     - The onMessage callback captures **updateLog** events and appends them to a terminal-style overlay. Each event is formatted as:  
       `<table>: <message>`
  3. **Final Phase:**  
     - Once ingestion completes, the overlay appends "Parsing complete." followed by "Finished.".
     - The dismiss button for the overlay only appears after the final "Finished." message is logged.

### Clustering Component

- **Purpose:**  
  A simple component that demonstrates how a clustering function is invoked using a global clustering store. (Additional clustering logic and state management are planned.)

### Pyodide Integration

- **Purpose:**  
  The project includes a custom hook (`usePyodideContextInitializer.ts`) to initialize Pyodide, load required Python packages and modules, and expose selected Python functions. This enables integration of Python code into the React application.

---

## 3. Data Ingestion & Progress Logging

### IndexedDB Ingestion Module

- **Technology:**  
  - **Dexie.js** is used to implement a database (`MyDatabase`) with several object stores.
  - **Oboe.js** is used to stream-parse the JSON file.  
- **Key Functions:**  
  - `getProjectNameFromFile`: Extracts the project name from the JSON file.
  - `loadJsonFileToIndexedDB`: Streams the JSON file into IndexedDB and emits update events.
  - `setCurrentDB`: Sets the active database instance for use elsewhere.

### Progress Overlay

- **Design:**  
  - A terminal-style overlay styled to mimic a fixed-width terminal (132 columns) and fixed height (40 rows) with word wrapping and vertical scrolling.
  - The overlay logs:
    - **"Parsing..."** immediately after the file is accepted.
    - All updateLog events (formatted as `<table>: <message>`) in real time.
    - Final messages ("Parsing complete." and "Finished.") once ingestion finishes.
  - The dismiss button only appears after the final messages are logged.

---

## 4. Global Architecture & State Management

- **Modular Architecture:**  
  - **UI Components:** Implemented with React (v18+) and Ant Design.
  - **Routing:** Managed via React Router v6.
  - **Global Services:**  
    - Pyodide is initialized via a custom hook.
    - Database and clustering state (IndexedDB and clustering store) are managed in separate modules.
  - **API Layer:**  
    The IndexedDB ingestion module abstracts data persistence. Future persistence mechanisms (Remote API, mySQL, MongoDB) are planned but not yet implemented.

---

## 5. Project Tree

Below is the current file structure. Files marked with *(not yet implemented)* indicate planned features or modules that are placeholders:
<pre style="font-family: monospace; background-color:rgb(57, 55, 55); padding: 1rem;">
src
├── api
│   └── indexedDbIngestion.ts <span style="color: yellow;">*(IndexedDB ingestion module)*</span>
├── components
│   ├── WelcomePage.tsx <span style="color: yellow;">*(Welcome Page)*</span>
│   ├── InitializeProject.tsx <span style="color: yellow;">*(File upload & ingestion)*</span>
│   ├── ClusteringComponent.tsx <span style="color: yellow;">*(Clustering component)*</span>
│   └── py
│       └── HelloPyodide.tsx <span style="color: yellow;">*(Pyodide integration)*</span>
├── hooks
│   └── usePyodideContextInitializer.ts <span style="color: yellow;">*(Pyodide initialization hook)*</span>
├── schemas
│   └── umap_bokeh_plot_schema.json
├── state
│   ├── redux  <span style="color: yellow;">*(Not yet implemented)*</span>
│   ├── zustand  <span style="color: yellow;">*(Partially implemented)*</span>
│   └── xstate  <span style="color: yellow;">*(Not yet implemented)*</span>
├── types
│   └── IUmapBokehPlot.ts
├── global.d.ts
├── App.tsx
└── index.tsx
</pre>

---

## Appendix: Code Samples

### WelcomePage.tsx

This component serves as the landing page and provides navigation to initialize or analyze a project.

```tsx
// src/components/WelcomePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Button } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const WelcomePage: React.FC = () => {
    const navigate = useNavigate();

    const handleInitializeProject = () => {
        navigate('/initialize');
    };

    const handleAnalyzeProject = () => {
        navigate('/analyze');
    };

    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
            <Content style={{ padding: '2rem', textAlign: 'center' }}>
                <Title>BMD Express...Plus!</Title>
                <Paragraph>
                    Welcome to BMD Express...Plus! Please choose an option to get started:
                </Paragraph>
                <Button
                    type="primary"
                    size="large"
                    style={{ marginRight: '1rem' }}
                    onClick={handleInitializeProject}
                >
                    Initialize Project
                </Button>
                <Button size="large" onClick={handleAnalyzeProject}>
                    Analyze Project
                </Button>
            </Content>
        </Layout>
    );
};

export default WelcomePage;
```

## InitializeProject.tsx

### This component handles JSON file uploads, streams the file into IndexedDB using Dexie/Oboe, and displays a terminal-style progress overlay. The overlay logs the updateLog events from Oboe and, upon completion, appends “Parsing complete.” and “Finished.” The overlay is styled to mimic a terminal (132 columns by 40 rows) and the dismiss button only appears once processing is finished.

```tsx
// src/components/InitializeProject.tsx
import React, { useState } from 'react';
import { Layout, Typography, Upload, Button, Radio, message, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { flushSync } from 'react-dom';
import {
    getProjectNameFromFile,
    MyDatabase,
    loadJsonFileToIndexedDB,
    setCurrentDB,
    LoadingMessage,
} from '../api/indexedDbIngestion';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const TerminalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '132ch', // fixed width of 132 columns
    height: '40em', // fixed height of 40 rows
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: '#0f0',
    padding: '1rem',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    overflowY: 'auto',
    borderRadius: '8px',
    zIndex: 9999,
    textAlign: 'left',
};

const InitializeProject: React.FC = () => {
    const [selectedStore, setSelectedStore] = useState<string>('indexeddb');
    const [loading, setLoading] = useState<boolean>(false);
    const [consoleMessages, setConsoleMessages] = useState<string[]>([]);
    const [isFinished, setIsFinished] = useState<boolean>(false);

    const handleStoreChange = (e: any) => {
        setSelectedStore(e.target.value);
    };

    const handleBeforeUpload = (file: File) => {
        const isJson = file.type === 'application/json';
        if (!isJson) {
            message.error('You can only upload a JSON file!');
            return false;
        }
        return true;
    };

    // onMessage callback: process updateLog events.
    const onMessage = (msg: LoadingMessage) => {
        if (msg.type === 'updateLog') {
            flushSync(() => {
                setConsoleMessages(prev => [...prev, `${msg.table}: ${msg.message}`]);
            });
        }
    };

    const handleFileChange = async (info: any) => {
        const { file } = info;
        if (file.status === 'done' || file.status === 'uploading' || file.status === 'error') {
            if (selectedStore === 'indexeddb') {
                setLoading(true);
                // Immediately update overlay to "Parsing..."
                flushSync(() => {
                    setConsoleMessages(["Parsing..."]);
                });
                const fileObj = file.originFileObj as File;
                getProjectNameFromFile(fileObj)
                    .then((projectName) => {
                        const dbName = projectName || 'BMDExpress_Default';
                        const db = new MyDatabase(dbName);
                        setCurrentDB(db);
                        loadJsonFileToIndexedDB(fileObj, db, onMessage)
                            .then(() => {
                                flushSync(() => {
                                    setConsoleMessages(prev => [...prev, "Parsing complete.", "Finished."]);
                                });
                                setIsFinished(true);
                                message.success('File successfully ingested into IndexedDB!');
                                setLoading(false);
                            })
                            .catch((err) => {
                                console.error('Error ingesting file into IndexedDB:', err);
                                message.error('Error ingesting file into IndexedDB.');
                                setLoading(false);
                            });
                    })
                    .catch((err) => {
                        console.error('Error extracting project name:', err);
                        message.error('Error extracting project name from file.');
                        setLoading(false);
                    });
            } else {
                message.error('Only IndexedDB is available at this time.');
            }
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
            <Content style={{ maxWidth: 600, margin: 'auto', padding: '2rem' }}>
                <Title level={2}>Initialize Project</Title>
                <Paragraph>
                    To get started, please choose a data store and upload your BMD Express JSON file.
                </Paragraph>
                <Radio.Group onChange={handleStoreChange} value={selectedStore}>
                    <Radio value="indexeddb">Local Browser Sandbox (IndexedDB)</Radio>
                    <Radio value="remote" disabled>Remote API (Unavailable)</Radio>
                    <Radio value="mysql" disabled>mySQL (Unavailable)</Radio>
                    <Radio value="mongodb" disabled>MongoDB (Unavailable)</Radio>
                </Radio.Group>
                <br /><br />
                <Card title="File Upload Instructions" variant="borderless">
                    <Paragraph>
                        Please select your project JSON file. The file will be ingested into the local IndexedDB.
                    </Paragraph>
                    <Upload
                        accept=".json"
                        beforeUpload={handleBeforeUpload}
                        showUploadList={false}
                        onChange={handleFileChange}
                        customRequest={({ file, onSuccess }) => {
                            setTimeout(() => { onSuccess && onSuccess("ok"); }, 0);
                        }}
                    >
                        <Button icon={<UploadOutlined />} size="large" loading={loading}>
                            {loading ? "Uploading..." : "Click to Upload"}
                        </Button>
                    </Upload>
                </Card>
            </Content>
            {consoleMessages.length > 0 && (
                <div style={TerminalOverlayStyle}>
                    {consoleMessages.map((msg, index) => (
                        <p key={index} style={{ margin: '0.2rem 0' }}>{msg}</p>
                    ))}
                    {isFinished && (
                        <Button
                            type="primary"
                            onClick={() => setConsoleMessages([])}
                            style={{ marginTop: '1rem' }}
                        >
                            Dismiss
                        </Button>
                    )}
                </div>
            )}
        </Layout>
    );
};

export default InitializeProject;
```

## 3. usePyodideContextInitializer.ts

### This custom hook initializes Pyodide, loads required packages, and registers Python modules. It returns a Pyodide context that can be used by other components to call Python functions.

```tsx
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
  [key: string]: any;
}

export function usePyodideContextInitializer({
  pythonModules,
  exposedFunctions = [],
  packages = ["pandas", "numpy", "scipy", "bokeh", "micropip"],
}: {
  pythonModules: Record<string, string>;
  exposedFunctions?: string[];
  packages?: string[];
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
        if (packages.includes("micropip")) {
          await pyodide.runPythonAsync(`
import micropip
await micropip.install("xyzservices")
          `);
        }
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
        const context: PyodideContext = {
          runPython: async (code: string) => await pyodide.runPythonAsync(code),
          getGlobal: (name: string) => pyodide.globals.get(name),
        };
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
```

## 4. App.tsx

### This file sets up routing using React Router v6. The WelcomePage is shown at the root route, and the InitializeProject page is shown at /initialize.

```tsx
// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WelcomePage from './components/WelcomePage';
import InitializeProject from './components/InitializeProject';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/initialize" element={<InitializeProject />} />
      </Routes>
    </Router>
  );
};

export default App;
```

## 6. index.tsx

### This file is the entry point for the React application, using React 18’s createRoot API.

```tsx
// src/index.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

declare global {
    interface Window {
        pyContext: any;
        pyodide: any;
        __packages_loaded?: boolean;
        __xyzservices_installed?: boolean;
        loadPyodide?: any;
    }
}

export {};
```

# Summary

The design for “BMD Express…Plus!” is structured as follows:

- **Project Vision:**  
  A scientific dashboard for interactive visual analysis that integrates Python via Pyodide for computations and uses IndexedDB for data persistence. Users can upload JSON files to initialize projects, and progress is tracked in real time.

- **User Workflow:**
  - **Welcome Page:**  
    Provides navigation to either initialize or analyze a project.
  - **Initialize Project Page:**
    - Supports file uploads (JSON) with IndexedDB as the selected storage option.
    - Immediately displays progress messages in a terminal-style overlay.
    - The overlay initially shows “Parsing…” then logs all updateLog events (formatted as `<table>: <message>`) as received.
    - After ingestion finishes, final messages “Parsing complete.” and “Finished.” are appended.
    - The overlay is styled like a fixed 132‑column terminal with 40 rows, supports word wrapping and scrolling, and displays a dismiss button only when processing is complete.

- **Data Ingestion:**
  - Implemented via a Dexie-based IndexedDB module and Oboe.js for streaming JSON parsing.
  - The module provides helper functions for extracting the project name, ingesting data, and managing the current database instance.

- **Global Architecture:**
  - **Pyodide Integration:**  
    Managed via a custom hook (`usePyodideContextInitializer.ts`) that initializes Pyodide and exposes Python functions.
  - **State Management & Routing:**  
    The project uses React Router v6 for navigation, React (v18+) for UI components, and Ant Design for pre-built UI components.

- **Future Enhancements:**
  Additional state management solutions (Redux, xState) and persistence methods (Remote API, mySQL, MongoDB) are planned but not yet implemented.

- **Project Tree:**
  The current filesystem layout is as follows (files marked with *(not yet implemented)* are placeholders for future development):