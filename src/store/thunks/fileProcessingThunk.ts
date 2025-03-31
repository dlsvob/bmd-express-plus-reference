// src/store/thunks/fileProcessingThunk.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
// Import functions from our abstracted IDB utility
import { saveFullProjectData, saveProjectMetadata } from '../../utils/myIDB'; // Adjust path
// Import types
import { ProjectData } from '../../models/BMDxExported'; // Adjust path
import { ProjectInfo } from '../../hooks/useProjectData'; // Adjust path

// Helper function to safely parse JSON
const parseJsonFile = async (file: File): Promise<ProjectData> => {
    const text = await file.text();
    try {
        const data = JSON.parse(text);
        // TODO: Add validation here to ensure 'data' conforms to ProjectData structure
        if (!data || typeof data !== 'object') { // Basic check
            throw new Error('Invalid JSON structure: Root is not an object.');
        }
        // Add more specific checks based on required ProjectData fields
        if (!data.name || !Array.isArray(data.doseResponseExperiments)) {
            throw new Error('Invalid JSON structure: Missing required fields (name, doseResponseExperiments).');
        }
        return data as ProjectData;
    } catch (e) {
        console.error("JSON Parsing Error:", e);
        throw new Error(`Failed to parse JSON file: ${e instanceof Error ? e.message : String(e)}`);
    }
};

// Helper function to get base name (similar to original thunk)
const getBaseProjectName = (parsedData: ProjectData, file: File): string => {
    // Prefer name from data, fallback to filename without extension
    const name = parsedData.name || file.name.replace(/\.(json|bm2)$/i, '');
    // Remove specific suffixes if needed (like original .bm2 removal)
    return name.replace(/\.bm2$/i, '');
};

// Helper function to create timestamp
const createTimestamp = (): string => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mmm = now.toLocaleString('en-US', { month: 'short' });
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${dd}-${mmm}-${yyyy}-${hh}${mm}${ss}`; // Use hhmmss for better sorting if needed
};


export const processFileThunk = createAsyncThunk<
    string, // Return uniqueProjectName on success
    File,   // Input is the File object
    { rejectValue: string } // Type for rejection payload
>(
    'file/processAndStore', // Action type prefix
    async (file, { rejectWithValue }) => {
        try {
            console.log(`Processing file: ${file.name}`);

            // 1. Parse and Validate JSON content
            const parsedData = await parseJsonFile(file);
            console.log(`File parsed successfully. Project base name from data: ${parsedData.name}`);

            // 2. Generate unique name
            const baseName = getBaseProjectName(parsedData, file);
            const timestamp = createTimestamp();
            const uniqueProjectName = `${baseName}_${timestamp}`;
            console.log(`Generated unique project name: ${uniqueProjectName}`);

            // 3. Save full project data to its specific DB
            // saveFullProjectData handles opening/creating the project DB and populating stores
            console.log(`Saving data to project DB: ${uniqueProjectName}`);
            await saveFullProjectData(uniqueProjectName, parsedData);
            console.log(`Data saved successfully to project DB: ${uniqueProjectName}`);

            // 4. Save metadata to the Meta DB
            const projectMetadata: ProjectInfo = {
                name: uniqueProjectName,
                source: 'indexeddb', // Hardcode source for now
                // Add any other relevant metadata fields here if needed
            };
            console.log(`Saving metadata for project: ${uniqueProjectName}`);
            await saveProjectMetadata(projectMetadata);
            console.log(`Metadata saved successfully for project: ${uniqueProjectName}`);

            // 5. Return the unique name on success
            return uniqueProjectName;

        } catch (err: any) {
            console.error('Error during file processing and storage:', err);
            // Return a specific error message
            return rejectWithValue(err.message || 'File processing and storage failed');
        }
    }
);
