# BMD Express...Plus! - Design Specification & Build Plan

## Design Specification

**1. Overall Architecture:**

* **Type:** Single Page Application (SPA).
* **Core Framework:** React (using functional components and Hooks).
* **State Management:** Redux Toolkit (provides efficient Redux setup, Immer for immutable updates, Reselect integration).
* **Client-Side Data Storage:** IndexedDB (managed via a library like `Dexie.js` for simplified interaction).
* **Client-Side Computation:** Pyodide for running Python/SciPy (specifically hierarchical clustering) in the browser.
* **Visualization:** A robust JavaScript plotting library capable of handling scatter plots with potentially thousands of points, custom styling, interactivity (hover, click), and dynamic updates. `Plotly.js` (specifically `react-plotly.js`) is a strong candidate due to its feature set, performance, and declarative nature.
* **Styling:** CSS Modules or a CSS-in-JS library (like Styled Components or Emotion) for component-scoped styling. A UI component library (like Material UI, Ant Design) could be considered for pre-built components (buttons, sliders, tables, dropdowns) to accelerate development, but custom styling will still be needed for the core visualization.
* **Build Tool:** Vite or Create React App (Vite is generally faster).
* **Language:** TypeScript (recommended for type safety, especially with complex data structures and state).

**2. Redux State Design:**

We'll use Redux Toolkit's `createSlice` for defining reducers and actions. The state shape might look something like this:

```typescript
{
  // Metadata about projects stored locally
  projects: {
    status: 'idle' | 'loading' | 'succeeded' | 'failed',
    error: string | null,
    // List of project metadata (name, timestamp, IndexedDB key)
    available: { id: string, name: string, timestamp: number }[],
  },

  // Data for the currently selected project
  currentProject: {
    status: 'idle' | 'loading' | 'succeeded' | 'failed',
    error: string | null,
    projectId: string | null,
    data: { // Data loaded from IndexedDB for the selected project
      projectName: string,
      analyses: { // Keyed by analysis ID/name
        [analysisId: string]: {
          id: string,
          name: string,
          // ... other analysis metadata
          categoryResults: { // Keyed by GO ID
            [goId: string]: {
              goId: string,
              term: string,
              bmd: number | null,
              direction: 'up' | 'down' | 'none',
              // ... other stats (p-value, FDR, etc.)
              geneIds: string[], // Genes in this category for this analysis
              bmdRank?: number, // Calculated rank
            }
          },
        }
      },
      // Pre-computed UMAP coordinates for all relevant GO terms (reference map)
      referenceUMAP: { // Keyed by GO ID
        [goId: string]: { x: number, y: number, term: string }
      },
      // Other relevant data extracted from JSON (probes, experiments, etc.) might be stored here too
    } | null
  },

  // UI State and selections for the analysis view
  analysisView: {
    selectedAnalysisIds: string[],

    // Filtering criteria
    filters: {
      bmdRank: { // For SlidingWindowFilter
        min: number,
        max: number,
        windowSize?: number, // Optional: if it's a sliding window vs range
        enabled: boolean
      },
      highlightedGoIds: { // For GoIdFilterUI
        ids: string[],
        mode: 'exact' | 'cluster' // How to use the IDs
      }
    },

    // Styling criteria
    styling: { // For StylingSelectors
      colorBy: string, // e.g., 'Cluster', 'Experiment', 'Direction', 'BMD'
      shapeBy: string, // e.g., 'Experiment'
      sizeBy: string, // e.g., 'Percentage', 'NumGenes'
    },

    // Visibility toggles based on legends
    visibility: { // Keyed by legend type (color, shape) then by value
      [legendType: string]: {
        [value: string]: boolean // true if visible, false if hidden
      }
    },

    // Clustering state
    clustering: {
      status: 'idle' | 'loading' | 'succeeded' | 'failed',
      error: string | null,
      // Results: Map GO ID -> cluster ID for the *currently filtered* set
      results: { [goId: string]: number } | null,
      params: { // Parameters used for the last run (e.g., distance metric, linkage)
        distance: 'jaccard', // etc.
        linkage: 'ward', // etc.
      } | null
    },

    // State for interactions between plots
    interactions: {
      highlightedGoIdsFromAccumulation: string[] // GO IDs highlighted by AccumulationPlot interaction
    }
  },

  // Pyodide status
  pyodide: {
    status: 'idle' | 'loading' | 'ready' | 'failed',
    error: string | null,
  }
}
### 3. Core Components:

* **`App.tsx`**: Top-level component. Handles routing (if needed, maybe just conditional rendering based on state), initializes Pyodide loading, overall layout.
* **`ProjectInitializer.tsx`**: Handles file upload (JSON), parsing, validation, interaction with IndexedDB (via service/hook), and dispatching actions to update `projects.available`.
* **`ProjectSelector.tsx`**: Displays `projects.available`, allows user selection, dispatches action to load selected project data into `currentProject`.
* **`AnalysisWorkspace.tsx`**: Main container shown after project selection. Orchestrates fetching/displaying data, holds major UI sections.
    * **`AnalysisSelector.tsx`**: Dropdowns/multi-select to choose analyses from `currentProject.data.analyses`. Updates `analysisView.selectedAnalysisIds`.
    * **`ControlPanel.tsx`**: Sidebar/section containing interactive controls.
        * **`SlidingWindowFilter.tsx`**: Slider/input for BMD Rank filtering. Dispatches actions to update `analysisView.filters.bmdRank`. Needs min/max values derived from selected data.
        * **`StylingSelectors.tsx`**: Dropdowns for Color/Shape/Size. Dispatches actions to update `analysisView.styling`. Options populated based on available data fields.
        * **`GoIdFilterUI.tsx`**: Text area for GO IDs. Dispatches actions to update `analysisView.filters.highlightedGoIds`.
        * **`CustomLegends.tsx`**: Dynamically generates legends based on current styling (`colorBy`, `shapeBy`). Handles clicks to toggle visibility, dispatching actions to update `analysisView.visibility`.
    * **`VisualizationPanel.tsx`**: Main area for plots.
        * **`UMAPPlot.tsx`**: Renders the main UMAP visualization using `react-plotly.js`.
            * *Props:* Derived data points (filtered, styled based on Redux state), reference UMAP coordinates, interaction highlights.
            * *Logic:* Uses selectors (via `useSelector` and potentially `reselect` for memoization) to get processed data based on `currentProject.data`, `analysisView.selectedAnalysisIds`, `analysisView.filters`, `analysisView.styling`, `analysisView.visibility`, `analysisView.clustering.results`, and `analysisView.interactions`. Configures Plotly layout and traces. Handles hover/click events if needed (e.g., display tooltips with details).
        * **`AccumulationPlot.tsx`**: Renders the cumulative count vs. BMD plot (if only one analysis selected).
            * *Props:* Data for the selected analysis.
            * *Logic:* Uses Plotly or another library. Handles selection events, dispatching actions to update `analysisView.interactions.highlightedGoIdsFromAccumulation`.
    * **`DetailsPanel.tsx`**: Section for tabular data and clustering.
        * **`AnalysisDetailsList.tsx`**: Displays summary info for `analysisView.selectedAnalysisIds`.
        * **`CategoryAnalysisDetails.tsx`**: Container that displays clustering controls/results.
            * **`ClusteringTrigger.tsx`**: Button or effect hook that initiates the clustering process when the relevant data/filters change.
            * **`ClusteringRunner.tsx`**: (Potentially a hook or service) Handles Pyodide interaction.
                * Loads Pyodide if not ready.
                * Prepares data (filtered categories, gene sets).
                * Executes Python/SciPy clustering code (`scipy.cluster.hierarchy`).
                * Dispatches start/success/failure actions to update `analysisView.clustering`.
            * **`ClusteringResultsTable.tsx`**: Displays the `analysisView.clustering.results` in a sortable/filterable table, mapping cluster IDs to GO IDs/Terms.

### 4. Data Flow and Logic:

* **Initialization:** User uploads JSON -> `ProjectInitializer` parses -> Validates structure -> Stores parsed data in IndexedDB via `Dexie.js` service -> Dispatches action to add project metadata to `projects.available`.
* **Project Load:** User selects project -> `ProjectSelector` dispatches load action -> Async thunk fetches data from IndexedDB -> Dispatches success action with data -> `currentProject` state is updated.
* **Analysis Selection/Filtering/Styling:** User interacts with controls -> Components dispatch simple actions to update `analysisView` sub-states (filters, styling, selected IDs).
* **UMAP Rendering:** `UMAPPlot` uses `useSelector` hooks. Memoized selectors (`reselect`) compute the data points to plot based on `currentProject.data`, `analysisView.selectedAnalysisIds`, filters, styling, visibility, clustering results, and interaction highlights. Changes in these state slices trigger selector re-computation and re-render of the plot.
* **Clustering:** User views `CategoryAnalysisDetails` or relevant filters change -> `ClusteringTrigger` initiates -> `ClusteringRunner` (hook/service) gets current filtered GO IDs/gene sets (using selectors) -> Passes data to Pyodide -> Python code calculates Jaccard distances and performs hierarchical clustering -> Results are returned -> Async thunk dispatches success action -> `analysisView.clustering.results` is updated -> `UMAPPlot` selector re-runs to potentially apply cluster-based styling.
* **Interactions:** User selects points on `AccumulationPlot` -> Component dispatches action updating `analysisView.interactions.highlightedGoIdsFromAccumulation` -> `UMAPPlot` selector picks up this change and highlights corresponding points.

### 5. Key Implementation Details:

* **IndexedDB Schema (Dexie):** Define stores carefully, e.g., `projects` (metadata), `projectData_{projectId}` (containing analyses, categories, reference UMAP specific to that project). Use appropriate indexes for efficient querying (e.g., on GO IDs within category results).
* **Pyodide Loading:** Load Pyodide asynchronously, potentially on app start or just before first use. Provide loading feedback. Load necessary Python packages (SciPy, NumPy).
* **Python Interaction:** Design a clear interface for the Python clustering function (input format: list of gene sets, output format: list of cluster assignments). Use Pyodide's JS<->Python conversion mechanisms. Handle potential errors during Python execution.
* **Memoization:** Heavily use `reselect` or similar memoization techniques for derived data (especially the data prepared for plotting and clustering) to prevent unnecessary recalculations and improve performance.
* **Performance:**
    * Debounce/throttle frequent UI updates if they trigger expensive calculations (e.g., slider dragging).
    * Optimize selectors.
    * Consider virtualization for the UMAP plot (`Plotly.js` has some WebGL capabilities) or tables if data scales become very large.
    * Ensure IndexedDB queries are efficient.
* **Error Handling:** Implement robust error handling for file parsing, IndexedDB operations, Pyodide loading/execution, and data processing. Display informative error messages to the user.
* **Reference UMAP:** How is this generated/provided? Assume for now it's part of the input JSON structure generated by the user's external process, containing GO ID -> {x, y} mappings.

## Build Plan (Piece by Piece)

### Foundation Setup (Sprint 0/1):

* Initialize project (Vite/CRA + React + TypeScript).
* Setup Redux Toolkit store.
* Setup basic routing/layout (`App.tsx`).
* Integrate `Dexie.js`. Define initial IndexedDB schema.
* Setup basic CSS framework/styling approach.

### Project Initialization & Selection (Sprint 1/2):

* Implement `ProjectInitializer.tsx`: File input, JSON parsing (use a robust library), basic validation.
* Implement IndexedDB service/hook: Function to save parsed project data.
* Implement Redux slice (`projects`): Actions/reducers for adding/listing projects.
* Implement `ProjectSelector.tsx`: List available projects from Redux state, handle selection.
* Implement Redux slice (`currentProject`): Actions/reducers for loading selected project data from IndexedDB into state. Handle loading/error states.

### Core UMAP Display (Sprint 2/3):

* Integrate `react-plotly.js`.
* Implement `AnalysisWorkspace.tsx` structure.
* Implement basic `AnalysisSelector.tsx` (can select one analysis initially).
* Implement `UMAPPlot.tsx`:
    * Fetch reference UMAP coordinates (`currentProject.data.referenceUMAP`).
    * Fetch category results for the selected analysis (`currentProject.data.analyses[...].categoryResults`).
    * Implement basic selector to map category results onto reference coordinates.
    * Render points on the Plotly chart with default styling (e.g., all same color/size/shape).

### Filtering & Styling Controls (Sprint 3/4):

* Implement Redux slice (`analysisView`): Add state for `filters` and `styling`.
* Implement `SlidingWindowFilter.tsx`, `StylingSelectors.tsx`, `GoIdFilterUI.tsx`. Connect them to dispatch actions updating the `analysisView` state.
* Enhance `UMAPPlot.tsx` selectors:
    * Filter points based on `analysisView.filters.bmdRank`.
    * Apply color, shape, size based on `analysisView.styling` selections and category data attributes (BMD, Direction, Experiment - *need to ensure Experiment info is linked to categories*).
    * Handle highlighting based on `analysisView.filters.highlightedGoIds`.

### Legends & Visibility (Sprint 4):

* Implement `CustomLegends.tsx`: Generate legend items based on current styling (`colorBy`, `shapeBy`).
* Add `analysisView.visibility` state.
* Connect legend clicks to actions updating `visibility`.
* Enhance `UMAPPlot.tsx` selector to filter points based on `visibility` state.

### Pyodide Integration & Clustering (Sprint 5/6):

* Integrate Pyodide: Setup asynchronous loading (`pyodide` Redux slice for status).
* Write Python script (using SciPy/NumPy) for Jaccard distance calculation and hierarchical clustering.
* Implement `ClusteringRunner.tsx` (hook/service):
    * Prepare input data (gene sets for *currently filtered* categories).
    * Call Python function via Pyodide.
    * Handle async operation and errors.
* Implement `analysisView.clustering` state (status, results, error).
* Implement `CategoryAnalysisDetails.tsx`, `ClusteringTrigger.tsx`, `ClusteringResultsTable.tsx`.
* *Optional:* Update `UMAPPlot.tsx` selector to allow `colorBy='Cluster'`.

### Accumulation Plot & Interaction (Sprint 6/7):

* Implement `AccumulationPlot.tsx` (using Plotly).
* Add `analysisView.interactions` state.
* Implement interaction logic: Plot selection dispatches action to update `highlightedGoIdsFromAccumulation`.
* Enhance `UMAPPlot.tsx` selector to visually distinguish points highlighted via the accumulation plot.

### Multi-Analysis Comparison (Sprint 7):

* Update `AnalysisSelector.tsx` to support multiple selections.
* Update selectors (`UMAPPlot`, etc.) to correctly aggregate/differentiate data from multiple selected analyses (e.g., using `shapeBy='Experiment'` or similar).
* Adjust filtering/styling logic if needed for multi-analysis context.

### Refinement & Testing (Sprint 8+):

* Comprehensive Testing (Unit tests for reducers/selectors/utils, integration tests for component interactions, potentially end-to-end tests for core workflows).
* UI Polish: Improve layout, styling, responsiveness.
* Performance Optimization: Profile, optimize selectors, investigate Plotly performance settings, check IndexedDB usage.
* Error Handling: Ensure graceful error handling throughout.
* Documentation: Add comments, README.