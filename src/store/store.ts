import { configureStore } from '@reduxjs/toolkit';
import { projectsApi } from './api/projectsApi';
import { experimentsApi } from './api/experimentsApi';
import { pyodideClusteringApi } from './api/pyodideClusteringApi';

export const store = configureStore({
    reducer: {
        [projectsApi.reducerPath]: projectsApi.reducer,
        [experimentsApi.reducerPath]: experimentsApi.reducer,
        [pyodideClusteringApi.reducerPath]: pyodideClusteringApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(projectsApi.middleware, experimentsApi.middleware)
            .concat(pyodideClusteringApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;