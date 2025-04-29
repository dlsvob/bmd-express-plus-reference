// src/store/slices/projectSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ProjectState, ProjectInfo } from '../models/reduxTypes'; // Correct path
// --- FIX: Import listProjectDatabaseNames ---
import { listProjectDatabaseNames } from '../../utils/myIDB'; // Import the function to get names
// -----------------------------------------
import { getValidProjectNames } from '../../utils/projectDBUtils'; // Keep this import
import { RootState } from '../store';

// --- Initial State ---
const initialState: ProjectState = {
    availableProjects: null,
    isLoadingAvailable: false,
    errorAvailable: null,
    selectedProjectName: null,
    // activeProjectId: null, // Ensure this is included if used
};

// --- Async Thunk for Fetching Projects ---
export const fetchAvailableProjects = createAsyncThunk<ProjectInfo[], void, { rejectValue: string }>(
    'project/fetchAvailableProjects',
    async (_, { rejectWithValue }) => {
        try {
            // --- FIX: Fetch names first, then validate ---
            console.log('[projectSlice] Thunk: Fetching raw DB names...');
            const rawProjectNames: string[] = await listProjectDatabaseNames(); // Fetch names
            console.log('[projectSlice] Thunk: Validating fetched names...');
            // Pass the fetched names to the validator
            const validProjectNames: string[] = getValidProjectNames(rawProjectNames);
            // ---------------------------------------------
            const projects: ProjectInfo[] = validProjectNames.map(name => ({ name }));
            console.log('[projectSlice] Thunk fetchAvailableProjects: Success');
            return projects;
        } catch (error: unknown) { // Keep unknown type
            console.error('[projectSlice] Thunk fetchAvailableProjects: Error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects from IndexedDB';
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
            console.log('[projectSlice] Setting active project:', action.payload);
            // Directly assign to the optional property defined in ProjectState
            state.activeProjectId = action.payload;
            }
        
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
            });
    },
});

// --- Export Actions ---
export const { setSelectedProjectName, setActiveProject } = projectSlice.actions;

// --- Export Reducer ---
export default projectSlice.reducer;

// --- Export Selectors ---
export const selectProjectState = (state: RootState) => state.project;
export const selectAvailableProjects = (state: RootState) => state.project.availableProjects;
export const selectIsLoadingAvailableProjects = (state: RootState) => state.project.isLoadingAvailable;
export const selectAvailableProjectsError = (state: RootState) => state.project.errorAvailable;
export const selectSelectedProjectName = (state: RootState) => state.project.selectedProjectName;
// export const selectActiveProjectId = (state: RootState) => state.project.activeProjectId;
