// src/store/apis/projectsApi.ts
import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';
// --- FIX: Define Project interface locally ---
interface Project {
    name: string;
    // Add other fields if necessary based on how projects are actually structured/used
}
// -------------------------------------------

// --- FIX: Remove unused parameters ---
const projectsBaseQuery: BaseQueryFn<void, Project[], string> = async (/*_arg, _api, _extraOptions*/) => {
    // -----------------------------------
    try {
        let dbList: { name?: string; version?: number }[] = [];
        if (indexedDB.databases) {
            dbList = await indexedDB.databases();
        } else {
            // Consider returning data: [] instead of error if unsupported is acceptable
            return { error: 'Browser does not support indexedDB.databases()' };
        }
        const projects: Project[] = dbList
            .filter((db) => !!db.name && !db.name.startsWith('_')) // Added filter for underscore names
            .map((db) => ({
                name: db.name!,
                // experiments: [] // Removed - Not part of simple Project type here
            }));
        return { data: projects };
        // --- FIX: Replace any with unknown ---
    } catch (error: unknown) {
        // -----------------------------------
        // --- FIX: Use instanceof Error ---
        const message = error instanceof Error ? error.message : String(error);
        return { error: message };
        // ---------------------------------
    }
};

export const projectsApi = createApi({
    reducerPath: 'projectsApi',
    baseQuery: projectsBaseQuery,
    endpoints: (builder) => ({
        getProjects: builder.query<Project[], void>({
            query: () => undefined, // No arguments needed for this query
        }),
    }),
});

export const { useGetProjectsQuery } = projectsApi;
