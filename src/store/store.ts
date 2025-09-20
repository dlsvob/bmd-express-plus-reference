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
// import { experimentsApi } from './apis/experimentsApi'; // REMOVED - using data service instead
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
  // [experimentsApi.reducerPath]: experimentsApi.reducer, // REMOVED
  [pyodideClusteringApi.reducerPath]: pyodideClusteringApi.reducer,
  [enrichrApi.reducerPath]: enrichrApi.reducer,
});

// Define RootState based on the root reducer
export type RootState = ReturnType<typeof rootReducer>;

// Sanitizer functions removed since experimentsApi is no longer used


// --- Store Configuration ---
export const store = configureStore({
  reducer: rootReducer,

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // experimentsApi and projectsApi actions removed
        ],
        warnAfter: 100,
      },
    }).concat(
      // projectsApi.middleware, // REMOVED
      // experimentsApi.middleware, // REMOVED
      pyodideClusteringApi.middleware,
      enrichrApi.middleware,
    ),

  // Use 'as any' casts only here for the DevTools options
  devTools: process.env.NODE_ENV !== 'production'
    ? {
      maxAge: 100,
      latency: 500,
      // Sanitizers removed since experimentsApi is no longer used
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
