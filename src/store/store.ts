// src/store/store.ts
import {
  configureStore, Action, ThunkAction, combineReducers, AnyAction
} from '@reduxjs/toolkit';

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
import { enrichrApi } from './apis/enrichrApi';

// Define the root reducer first
const rootReducer = combineReducers({
  navigation: navigationReducer,
  project: projectReducer,
  selectedAnalysis: selectedAnalysisReducer,
  ui: uiReducer,
  analysisUI: analysisUIReducer,
  referenceData: referenceDataReducer,
  [projectsApi.reducerPath]: projectsApi.reducer,
  [experimentsApi.reducerPath]: experimentsApi.reducer,
  [pyodideClusteringApi.reducerPath]: pyodideClusteringApi.reducer,
  [enrichrApi.reducerPath]: enrichrApi.reducer,
});

// Define RootState based on the root reducer
export type RootState = ReturnType<typeof rootReducer>;

// Helper function to sanitize large arrays
const isLargeRawDataArray = (key: string, value: unknown): boolean => {
  return (
    (key === 'rawExperiments' || key === 'rawBmdResults' || key === 'rawCategoryAnalyses' || key === 'rawCategoryAnalysisItems') &&
    Array.isArray(value) &&
    value.length > 10
  );
}

// Sanitizer function for actions
const actionSanitizer = (action: AnyAction): AnyAction => {
  if (action.type === `${experimentsApi.reducerPath}/executeQuery/fulfilled` && action.payload) {
    const sanitizedPayload: Record<string, unknown> = { ...action.payload };
    let wasSanitized = false;

    for (const key in sanitizedPayload) {
      if (isLargeRawDataArray(key, sanitizedPayload[key])) {
        const currentPayloadValue = sanitizedPayload[key];
        sanitizedPayload[key] = `<<LARGE_ARRAY[${(currentPayloadValue as unknown[]).length}]>>`;
        wasSanitized = true;
      }
    }
    return wasSanitized ? { ...action, payload: sanitizedPayload } : action;
  }
  return action;
};

// Sanitizer function for state
const stateSanitizer = (state: RootState): RootState => {
  if (!state?.experimentsApi?.queries) {
    return state;
  }

  const sanitizedQueries = { ...state.experimentsApi.queries };
  let stateWasSanitized = false;

  for (const queryKey in sanitizedQueries) {
    const queryEntry = sanitizedQueries[queryKey];

    if (queryKey.startsWith('getRawAnalysisData') && queryEntry?.status === 'fulfilled' && queryEntry?.data) {
      const currentData = queryEntry.data as Record<string, unknown>;
      const sanitizedData = { ...currentData };
      let dataWasSanitized = false;

      for (const dataKey in sanitizedData) {
        if (isLargeRawDataArray(dataKey, sanitizedData[dataKey])) {
          sanitizedData[dataKey] = `<<LARGE_ARRAY[${(sanitizedData[dataKey] as unknown[]).length}]>>`;
          dataWasSanitized = true;
        }
      }

      if (dataWasSanitized) {
        sanitizedQueries[queryKey] = { ...queryEntry, data: sanitizedData };
        stateWasSanitized = true;
      }
    }
  }

  return stateWasSanitized
    ? {
      ...state,
      experimentsApi: {
        ...state.experimentsApi,
        queries: sanitizedQueries,
      },
    }
    : state;
};


// --- Store Configuration ---
export const store = configureStore({
  reducer: rootReducer,

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          `${experimentsApi.reducerPath}/executeQuery/pending`,
          `${experimentsApi.reducerPath}/executeQuery/fulfilled`,
          `${experimentsApi.reducerPath}/executeQuery/rejected`,
          `${projectsApi.reducerPath}/executeQuery/pending`,
          `${projectsApi.reducerPath}/executeQuery/fulfilled`,
          `${projectsApi.reducerPath}/executeQuery/rejected`,
        ],
        warnAfter: 100,
      },
    }).concat(
      projectsApi.middleware,
      experimentsApi.middleware,
      pyodideClusteringApi.middleware,
      enrichrApi.middleware,
    ),

  // Use 'as any' casts only here for the DevTools options
  devTools: process.env.NODE_ENV !== 'production'
    ? {
      maxAge: 100,
      latency: 500,
      // --- FIX: Disable eslint rule for these specific lines ---
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actionSanitizer: actionSanitizer as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stateSanitizer: stateSanitizer as any,
      // -------------------------------------------------------
    }
    : false,
});

export type AppDispatch = typeof store.dispatch;

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
