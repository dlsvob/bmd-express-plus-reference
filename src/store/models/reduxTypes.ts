// src/store/models/reduxTypes.ts
export interface ProjectInfo {
    name: string;
    // id?: string; // Consider adding if names aren't unique guarantees
    // Add other potential fields like date, description if fetched/needed
}

// Type from selectedAnalysisSlice context
export interface SelectedAnalysisDetailItem {
    ref: string; // Unique key for the analysis result
    experimentName: string; // Name of the experiment
    analysisName: string; // Name of the category analysis
    categoryAnalysis?: Record<string, unknown> | null; 
}

export interface SelectedAnalysisState {
    selectedRefs: string[]; // Added
    selectedDetails: SelectedAnalysisDetailItem[] | null;
}

export interface ProjectState {
    availableProjects: ProjectInfo[] | null;
    isLoadingAvailable: boolean;
    errorAvailable: string | null;
    selectedProjectName: string | null;
    activeProjectId?: string | null;
}

export interface NavigationState {
    analysisDomain: string | null;
}

export interface UIState {
    isAddProjectModalOpen: boolean;
}
