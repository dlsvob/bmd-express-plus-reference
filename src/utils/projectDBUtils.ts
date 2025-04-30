// src/utils/projectDBUtils.ts

/**
 * Placeholder function to validate project names.
 * In a real scenario, this might check against existing names in IndexedDB
 * or enforce naming conventions.
 *
 * @param projects - An array of potential project objects or names.
 * @returns An array of valid project names.
 */
export const getValidProjectNames = (projects: { name: string }[] | string[]): string[] => {
    // Filter out empty names and trim whitespace
    console.log("Validating project names:", projects);

    if (!Array.isArray(projects)) {
        console.warn("getValidProjectNames received non-array input");
        return [];
    }

    return projects
        .map(p => (typeof p === 'string' ? p : p?.name))
        .filter(name => typeof name === 'string' && name.trim().length > 0)
        .map(name => name.trim());
};

// Add other utility functions related to project data management as needed...
// For example, functions to interact with IndexedDB:
/*
import { openDB, DBSchema } from 'idb';

interface ProjectDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'name': string };
  };
  // other stores...
}

const dbPromise = openDB<ProjectDB>('BMDxPlusDB', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('projects')) {
      const store = db.createObjectStore('projects', { keyPath: 'id' });
      store.createIndex('name', 'name', { unique: true });
    }
    // create other stores...
  },
});

export const addProjectToDB = async (project: Project): Promise<void> => {
  const db = await dbPromise;
  await db.add('projects', project);
};

export const getAllProjectsFromDB = async (): Promise<Project[]> => {
  const db = await dbPromise;
  return db.getAll('projects');
};

export const getProjectByNameFromDB = async (name: string): Promise<Project | undefined> => {
    const db = await dbPromise;
    return db.getFromIndex('projects', 'name', name);
}
*/

// Ensure you have 'idb' installed if you use the IndexedDB parts: npm install idb