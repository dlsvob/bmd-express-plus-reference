// src/store/store.ts
import { configureStore, Action, ThunkAction } from '@reduxjs/toolkit';
// We need isPlainObject for the sanitizer potentially
import { isPlainObject } from '@reduxjs/toolkit';

// Import reducers...
import navigationReducer from './slices/navigationSlice';
import projectReducer from './slices/projectSlice';
import selectedAnalysisReducer from './slices/selectedAnalysisSlice';
import uiReducer from './slices/uiSlice';
import analysisUIReducer from './slices/analysisUISlice';
import referenceDataReducer from './slices/referenceDataSlice';

// Import RTK Query API reducers...
import { projectsApi } from './apis/projectsApi';
import { experimentsApi } from './apis/experimentsApi';
import { pyodideClusteringApi } from './apis/pyodideClusteringApi';

// --- Helper function to sanitize large arrays in payloads ---
// This checks if a value looks like one of our large raw data arrays
// You might need to adjust the property names if they differ in the actual action payload
const isLargeRawDataArray = (key: string, value: any): boolean => {
  return (
    (key === 'rawExperiments' || key === 'rawBmdResults' || key === 'rawCategoryAnalyses') &&
    Array.isArray(value) &&
    value.length > 10 // Arbitrary threshold to consider it "large"
  );
}

// Sanitizer function for actions
const actionSanitizer = (action: Action) => {
  if (action.type === `${experimentsApi.reducerPath}/executeQuery/fulfilled` && action.payload) {
    // Check if the payload contains potentially large raw data arrays
    const sanitizedPayload = { ...action.payload }; // Shallow copy
    let wasSanitized = false;

    for (const key in sanitizedPayload) {
      if (isLargeRawDataArray(key, sanitizedPayload[key])) {
        sanitizedPayload[key] = `<<LARGE_ARRAY[${sanitizedPayload[key].length}]>>`;
        wasSanitized = true;
      }
    }
    // Return a new action object with the sanitized payload if changes were made
    return wasSanitized ? { ...action, payload: sanitizedPayload } : action;
  }
  return action; // Return original action if not the target type or no sanitization needed
};

// Sanitizer function for state (more complex, might need specific path targeting)
// This targets the data field within the RTK Query cache state for getRawAnalysisData
const stateSanitizer = (state: RootState) => {
  if (!state || !state.experimentsApi || !state.experimentsApi.queries) {
    return state;
  }

  const sanitizedQueries = { ...state.experimentsApi.queries };
  let stateWasSanitized = false;

  for (const queryKey in sanitizedQueries) {
    // Check if it's a 'getRawAnalysisData' query entry and has data
    if (queryKey.startsWith('getRawAnalysisData') && sanitizedQueries[queryKey]?.status === 'fulfilled' && sanitizedQueries[queryKey]?.data) {
      const currentData = sanitizedQueries[queryKey]!.data as any; // Type assertion
      const sanitizedData = { ...currentData };
      let dataWasSanitized = false;

      for (const dataKey in sanitizedData) {
        if (isLargeRawDataArray(dataKey, sanitizedData[dataKey])) {
          sanitizedData[dataKey] = `<<LARGE_ARRAY[${sanitizedData[dataKey].length}]>>`;
          dataWasSanitized = true;
        }
      }

      if (dataWasSanitized) {
        // Create a new query entry object with sanitized data
        sanitizedQueries[queryKey] = { ...sanitizedQueries[queryKey]!, data: sanitizedData };
        stateWasSanitized = true;
      }
    }
  }

  // If any query state was sanitized, return a new state object with the modified experimentsApi slice
  return stateWasSanitized
    ? {
      ...state,
      experimentsApi: {
        ...state.experimentsApi,
        queries: sanitizedQueries,
      },
    }
    : state; // Return original state if no changes needed
};


// --- Store Configuration ---
export const store = configureStore({
  reducer: {
    // Slice reducers...
    navigation: navigationReducer,
    project: projectReducer,
    selectedAnalysis: selectedAnalysisReducer,
    ui: uiReducer,
    analysisUI: analysisUIReducer,
    referenceData: referenceDataReducer,

    // API reducers...
    [projectsApi.reducerPath]: projectsApi.reducer,
    [experimentsApi.reducerPath]: experimentsApi.reducer,
    [pyodideClusteringApi.reducerPath]: pyodideClusteringApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Keep ignored actions for potentially other non-serializable issues
        ignoredActions: [
          `${experimentsApi.reducerPath}/executeQuery/pending`,
          `${experimentsApi.reducerPath}/executeQuery/fulfilled`, // Keep ignoring raw action
          `${experimentsApi.reducerPath}/executeQuery/rejected`,
          `${projectsApi.reducerPath}/executeQuery/pending`,
          `${projectsApi.reducerPath}/executeQuery/fulfilled`,
          `${projectsApi.reducerPath}/executeQuery/rejected`,
          // Add others if needed...
        ],
        // ignoredPaths: ['experimentsApi.queries'], // Can potentially ignore whole path too
        warnAfter: 100,
      },
      // immutableCheck: { warnAfter: 100 } // Optional
    }).concat(
      projectsApi.middleware,
      experimentsApi.middleware,
      pyodideClusteringApi.middleware
    ),

  // --- UPDATED: Configure Redux DevTools Extension ---
  devTools: process.env.NODE_ENV !== 'production'
    ? {
      // Options for Redux DevTools Extension
      maxAge: 100, // Limit number of actions stored
      latency: 500, // Debounce updates sent to extension
      // --- Add Sanitizers ---
      actionSanitizer: actionSanitizer as any, // Use the sanitizers defined above
      stateSanitizer: stateSanitizer as any,   // Cast as 'any' for simplicity if TS complains
      // Alternatively, more advanced config:
      // serialize: {
      //    // Handle specific types if needed, e.g., Date, Map, Set
      //    // Might be overly complex for just ignoring large arrays
      // }
    }
    : false, // Disable DevTools in production
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Optional: Define AppThunk type
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;