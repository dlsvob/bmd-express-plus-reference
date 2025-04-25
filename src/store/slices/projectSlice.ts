// src/store/slices/projectSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ProjectState, ProjectInfo } from '../../models/reduxTypes'; // Adjust path
import { getValidProjectNames } from '../../utils/projectDBUtils'; // Adjust path - IMPORTANT: Assumes this function exists and returns string[]
import { RootState } from '../store'; // Adjust path

// --- Initial State ---
const initialState: ProjectState = {
    availableProjects: null,
    isLoadingAvailable: false,
    errorAvailable: null,
    selectedProjectName: null,
};

// --- Async Thunk for Fetching Projects ---
export const fetchAvailableProjects = createAsyncThunk<ProjectInfo[], void, { rejectValue: string }>(
    'project/fetchAvailableProjects',
    async (_, { rejectWithValue }) => {
        try {
            // IMPORTANT: Replace with your actual IndexedDB utility function call
            // Assuming getValidProjectNames returns an array of strings (project names)
            const projectNames: string[] = await getValidProjectNames();
            // Map names to ProjectInfo objects
            const projects: ProjectInfo[] = projectNames.map(name => ({ name }));
            console.log('[projectSlice] Thunk fetchAvailableProjects: Success');
            return projects;
        } catch (error: any) {
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
                // NOTE: Clearing dependent state (like selected analyses) when project changes
                // should ideally be handled either via extraReducers here listening to this action,
                // or dispatched manually from the component triggering project selection.
                // Keeping it simple for now.
            }
        },
        setActiveProject(state, action: PayloadAction<string | null>) {
            console.log('[projectSlice] Setting active project:', action.payload);
            state.activeProjectId = action.payload;
            // Potentially reset other state related to the previous project here
        },
        // Add other reducers if needed, e.g., for manually adding/removing projects from the list
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
// It's often good practice to put selectors in their own file, e.g., projectSelectors.ts
export const selectProjectState = (state: RootState) => state.project;
export const selectAvailableProjects = (state: RootState) => state.project.availableProjects;
export const selectIsLoadingAvailableProjects = (state: RootState) => state.project.isLoadingAvailable;
export const selectAvailableProjectsError = (state: RootState) => state.project.errorAvailable;
export const selectSelectedProjectName = (state: RootState) => state.project.selectedProjectName;