// src/models/reduxTypes.ts (Add/Ensure these types exist)

// Basic info for project selector
export interface ProjectInfo {
    name: string;
    // id?: string; // Consider adding if names aren't unique guarantees
    // Add other potential fields like date, description if fetched/needed
}

// Existing type from selectedAnalysisSlice context
export interface SelectedAnalysisDetailItem {
    ref: string; // Unique key for the analysis result
    experimentName: string; // Name of the experiment
    analysisName: string; // Name of the category analysis
    // ... other fields from the original type ...
    categoryAnalysis?: { // Assuming nested structure based on original code
        // ... fields like pValue, oddsRatio, genes, etc.
    }
}

// Modified state for selectedAnalysisSlice
export interface SelectedAnalysisState {
    selectedRefs: string[]; // Added
    selectedDetails: SelectedAnalysisDetailItem[] | null;
}

// New state slices
export interface ProjectState {
    availableProjects: ProjectInfo[] | null;
    isLoadingAvailable: boolean;
    errorAvailable: string | null;
    selectedProjectName: string | null;
}

export interface NavigationState {
    analysisDomain: string | null; // Using user's preferred name
}

export interface UIState {
    isAddProjectModalOpen: boolean;
}

// Ensure RootState type reflects all slices eventually in store.ts
// export type RootState = ReturnType<typeof store.getState>;