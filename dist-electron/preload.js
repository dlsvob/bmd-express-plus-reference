"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Example: electron/preload.ts
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel, ...args) => {
        // Define a list of allowed channels for security
        const allowedChannels = [
            'db:get-projects',
            'db:get-project-details',
            'db:add-project',
            'db:get-experiments',
            'pyodide:run-clustering',
            // Add other channels you need here...
        ];
        if (allowedChannels.includes(channel)) {
            return electron_1.ipcRenderer.invoke(channel, ...args);
        }
        // Optionally throw an error or return a rejected promise for disallowed channels
        console.error(`IPC channel "${channel}" is not allowed.`);
        return Promise.reject(new Error(`IPC channel "${channel}" is not allowed.`));
    }
    // You might add other specific methods here too
    // e.g., loadProjects: () => ipcRenderer.invoke('load-projects')
});
// To use this in your renderer, you need to declare the type globally
// Example: src/electron.d.ts
/*
export interface IElectronAPI {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
*/ 
//# sourceMappingURL=preload.js.map