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

// --- Async Thunk for Initializing DuckDB Project ---
export const initializeDuckDbProject = createAsyncThunk<string, string, { rejectValue: string }>(
    'project/initializeDuckDbProject',
    async (projectName, { rejectWithValue }) => {
        try {
            console.log('[projectSlice] 🚀 STARTING DuckDB initialization for project:', projectName);

            // Only initialize if not already enabled
            if (!isDuckDbEnabled()) {
                console.log(`[projectSlice] 🦆 DuckDB not enabled, connecting to: ${projectName}`);
                try {
                    // Import the DuckDB connection function dynamically (like power-tools app)
                    const { connectToOpfsDuckDb } = await import('bmd-express-data-service');
                    // Add a timeout wrapper around the connection
                    const connectPromise = connectToOpfsDuckDb(projectName);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('DuckDB connection timeout after 60 seconds')), 60000)
                    );

                    console.log('[projectSlice] ⏱️ Waiting for DuckDB connection with 60s timeout...');
                    await Promise.race([connectPromise, timeoutPromise]);
                    console.log('[projectSlice] ✅ Successfully connected to DuckDB');
                } catch (connectError) {
                    console.error('[projectSlice] ❌ Failed to connect to DuckDB:', connectError);
                    throw connectError;
                }
            } else {
                console.log('[projectSlice] ✅ DuckDB already enabled');
            }

            // Test the connection
            console.log('[projectSlice] 🧪 Testing DuckDB connection...');
            const { getDuckDbRpc } = await import('bmd-express-data-service');

            // Check if DuckDB is now enabled
            console.log('[projectSlice] 🔍 Checking DuckDB status after connection:', {
                isDuckDbEnabled: isDuckDbEnabled(),
                hasRpc: !!getDuckDbRpc()
            });
            const rpc = getDuckDbRpc();
            console.log('[projectSlice] 🔍 RPC client details:', {
                rpc: !!rpc,
                exec: !!rpc?.exec,
                methods: rpc ? Object.keys(rpc) : 'null'
            });

            if (!rpc?.exec) {
                throw new Error(`DuckDB RPC client not available after connection. Available methods: ${rpc ? Object.keys(rpc).join(', ') : 'null'}`);
            }

            const testResult = await rpc.exec('SELECT COUNT(*) as table_count FROM information_schema.tables');
            console.log('[projectSlice] ✅ DuckDB connection test successful:', testResult);

            // Final status check
            console.log('[projectSlice] ✅ COMPLETED DuckDB initialization for project:', projectName, {
                isDuckDbEnabled: isDuckDbEnabled(),
                hasRpc: !!getDuckDbRpc()
            });

            return projectName;
        } catch (error: unknown) {
            console.error('[projectSlice] ❌ Failed to initialize DuckDB project:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to initialize DuckDB project';
            return rejectWithValue(errorMessage);
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
            // Update BOTH selectedProjectName and activeProjectId
            if (state.selectedProjectName !== newProjectName) {
                state.selectedProjectName = newProjectName;
            }
            if (state.activeProjectId !== newProjectName) {
                state.activeProjectId = newProjectName;
            }
            // Reset DuckDB state when changing projects
            if (newProjectName !== state.selectedProjectName) {
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
                state.errorAvailable = action.payload ?? 'Unknown error initializing DuckDB project';
            });
    },
});

// --- Export Actions ---
export const { setSelectedProjectName, setActiveProject } = projectSlice.actions;

// --- Thunks are automatically exported when declared with createAsyncThunk ---
// fetchAvailableProjects and initializeDuckDbProject are already exported above

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
