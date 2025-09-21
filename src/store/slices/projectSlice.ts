// src/store/slices/projectSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ProjectState, ProjectInfo } from '../models/reduxTypes';
import { RootState } from '../store';
import { isDuckDbEnabled, enumerateDuckDbDatabases } from 'bmd-express-data-service';

// --- Initial State ---
const initialState: ProjectState = {
    availableProjects: null,
    isLoadingAvailable: false,
    errorAvailable: null,
    selectedProjectName: null,
    activeProjectId: null,
    isDuckDbInitializing: false,
    isDuckDbReady: false,
    duckDbInitializationError: null,
};

// --- Async Thunk for Fetching Projects ---
export const fetchAvailableProjects = createAsyncThunk<ProjectInfo[], void, { rejectValue: string }>(
    'project/fetchAvailableProjects',
    async (_, { rejectWithValue }) => {
        try {
            console.log('[projectSlice] Thunk: Enumerating DuckDB databases in OPFS...');
            const duckDbFiles = await enumerateDuckDbDatabases();
            console.log(`[projectSlice] Thunk: Found ${duckDbFiles.length} DuckDB databases:`, duckDbFiles);

            // Convert database file info to ProjectInfo format
            const projects: ProjectInfo[] = duckDbFiles.map(dbFile => ({
                name: dbFile.name // Use filename as project name (e.g., "test_v4_with_metadata.duckdb")
            }));

            console.log('[projectSlice] Thunk fetchAvailableProjects: Success');
            return projects;
        } catch (error: unknown) {
            console.error('[projectSlice] Thunk fetchAvailableProjects: Error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to enumerate DuckDB databases';
            return rejectWithValue(errorMessage);
        }
    }
);

// --- Helper Functions for DuckDB Connection ---

// Separate connection logic
async function connectToDuckDb(projectName: string): Promise<void> {
    if (isDuckDbEnabled()) return;

    const { connectToOpfsDuckDb } = await import('bmd-express-data-service');

    // 10 second timeout instead of 60
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout (10s)')), 10000)
    );

    await Promise.race([
        connectToOpfsDuckDb(projectName),
        timeoutPromise
    ]);
}

// Separate validation logic
async function validateConnection(): Promise<void> {
    const { getDuckDbRpc } = await import('bmd-express-data-service');
    const rpc = getDuckDbRpc();

    if (!rpc?.exec) {
        throw new Error('DuckDB RPC not available after connection');
    }

    // Simple validation query
    await rpc.exec('SELECT 1');
}

// Connection with retry logic
async function connectWithRetry(projectName: string, maxRetries = 3): Promise<void> {
    console.log(`[projectSlice] 🔗 connectWithRetry starting for ${projectName}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[projectSlice] 🔗 Attempt ${attempt}/${maxRetries} - calling connectToDuckDb`);
            await connectToDuckDb(projectName);
            console.log(`[projectSlice] 🔗 Connection successful on attempt ${attempt}`);
            return; // Success
        } catch (error) {
            console.error(`[projectSlice] 🔗 Attempt ${attempt} failed:`, error);
            if (attempt === maxRetries) {
                console.error(`[projectSlice] 🔗 All ${maxRetries} attempts failed, throwing error`);
                throw error;
            }

            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 1s, 2s, 4s max
            console.log(`[projectSlice] Connection attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Centralized error handling
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        if (error.message.includes('timeout')) {
            return 'Database connection timed out. Please check your connection and try again.';
        }
        if (error.message.includes('not found')) {
            return 'Database file not found. Please verify the project exists.';
        }
        return error.message;
    }
    return 'Unknown database connection error';
}

// --- Async Thunk for Checking DuckDB Health ---
export const checkDuckDbHealth = createAsyncThunk<boolean, void>(
    'project/checkDuckDbHealth',
    async () => {
        if (!isDuckDbEnabled()) return false;

        try {
            const { getDuckDbRpc } = await import('bmd-express-data-service');
            const rpc = getDuckDbRpc();
            await rpc.exec('SELECT 1');
            return true;
        } catch {
            return false;
        }
    }
);

// --- Async Thunk for Initializing DuckDB Project ---
export const initializeDuckDbProject = createAsyncThunk<string, string, {
    rejectValue: string;
}>(
    'project/initializeDuckDbProject',
    async (projectName, { rejectWithValue }) => {
        console.log(`[projectSlice] 🔍 THUNK START: initializeDuckDbProject for ${projectName}`);
        console.log(`[projectSlice] 🔍 DuckDB service state: isDuckDbEnabled=${isDuckDbEnabled()}`);

        try {
            console.log(`[projectSlice] Initializing DuckDB for project: ${projectName}`);

            await connectWithRetry(projectName);
            await validateConnection();

            console.log(`[projectSlice] Successfully initialized DuckDB for: ${projectName}`);
            return projectName;

        } catch (error) {
            console.error('[projectSlice] DuckDB initialization failed:', error);
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// --- Slice Definition ---
const projectSlice = createSlice({
    name: 'project',
    initialState,
    reducers: {
        setSelectedProjectName(state, action: PayloadAction<string | null>) {
            console.log(`[projectSlice] Reducer: setSelectedProjectName - Payload: ${action.payload}`);
            if (state.selectedProjectName !== action.payload) {
                state.selectedProjectName = action.payload;
            }
        },
        setActiveProject(state, action: PayloadAction<string | null>) {
            const newProjectName = action.payload;
            console.log('[projectSlice] Reducer: setActiveProject - Payload:', newProjectName);
            // Only update activeProjectId (remove selectedProjectName to break IndexedDB hook connection)
            if (state.activeProjectId !== newProjectName) {
                state.activeProjectId = newProjectName;
            }
            // Reset DuckDB state when changing projects
            if (newProjectName !== state.activeProjectId) {
                state.isDuckDbInitializing = false;
                state.isDuckDbReady = false;
                state.duckDbInitializationError = null;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAvailableProjects.pending, (state) => {
                console.log('[projectSlice] Thunk fetchAvailableProjects: Pending');
                state.isLoadingAvailable = true;
                state.errorAvailable = null;
            })
            .addCase(fetchAvailableProjects.fulfilled, (state, action: PayloadAction<ProjectInfo[]>) => {
                console.log(`[projectSlice] Thunk fetchAvailableProjects: Fulfilled - Count: ${action.payload.length}`);
                state.isLoadingAvailable = false;
                state.availableProjects = action.payload;
            })
            .addCase(fetchAvailableProjects.rejected, (state, action) => {
                console.log(`[projectSlice] Thunk fetchAvailableProjects: Rejected - Error: ${action.payload}`);
                state.isLoadingAvailable = false;
                state.errorAvailable = action.payload ?? 'Unknown error fetching projects';
            })
            .addCase(initializeDuckDbProject.pending, (state) => {
                console.log('[projectSlice] Thunk initializeDuckDbProject: Pending');
                state.isDuckDbInitializing = true;
                state.isDuckDbReady = false;
                state.duckDbInitializationError = null;
            })
            .addCase(initializeDuckDbProject.fulfilled, (state, action: PayloadAction<string>) => {
                console.log(`[projectSlice] Thunk initializeDuckDbProject: Fulfilled - Project: ${action.payload}`);
                state.isDuckDbInitializing = false;
                state.isDuckDbReady = true;
                state.duckDbInitializationError = null;
            })
            .addCase(initializeDuckDbProject.rejected, (state, action) => {
                console.log(`[projectSlice] Thunk initializeDuckDbProject: Rejected - Error: ${action.payload}`);
                state.isDuckDbInitializing = false;
                state.isDuckDbReady = false;
                state.duckDbInitializationError = action.payload ?? 'Unknown error initializing DuckDB project';
                // REMOVED: Don't duplicate error in errorAvailable
            });
    },
});

// --- Export Actions ---
export const { setSelectedProjectName } = projectSlice.actions;

// --- Thunks are automatically exported when declared with createAsyncThunk ---
// fetchAvailableProjects, initializeDuckDbProject, and checkDuckDbHealth are already exported above

// --- Export Reducer ---
export default projectSlice.reducer;

// --- Export Selectors ---
export const selectProjectState = (state: RootState) => state.project;
export const selectAvailableProjects = (state: RootState) => state.project.availableProjects;
export const selectIsLoadingAvailableProjects = (state: RootState) => state.project.isLoadingAvailable;
export const selectAvailableProjectsError = (state: RootState) => state.project.errorAvailable;
export const selectSelectedProjectName = (state: RootState) => state.project.selectedProjectName;
export const selectActiveProjectId = (state: RootState) => state.project.activeProjectId;
export const selectIsDuckDbInitializing = (state: RootState) => state.project.isDuckDbInitializing;
export const selectIsDuckDbReady = (state: RootState) => state.project.isDuckDbReady;
export const selectDuckDbInitializationError = (state: RootState) => state.project.duckDbInitializationError;

// Composite selector to find the active project object by activeProjectId
export const selectActiveProject = (state: RootState): ProjectInfo | null => {
    const projects = selectAvailableProjects(state);
    const activeId = selectActiveProjectId(state);

    if (!activeId || !projects) {
        return null;
    }

    return projects.find(p => p.name === activeId) || null;
};
