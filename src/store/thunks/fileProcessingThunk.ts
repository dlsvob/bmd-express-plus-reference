// src/store/thunks/fileProcessingThunk.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { IDBPDatabase } from 'idb';
import { openAndPrepareProjectDB, ProjectDB } from '../../utils/myIDB';
import { streamJsonToStores } from '../../utils/jsonStreamer';

// Helper function to get base name
const getBaseProjectName = (file: File): string => {
    const fileName = file?.name || 'untitled_project';
    const name = fileName.replace(/\.(json|bm2)$/i, '');
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
    return `${dd}-${mmm}-${yyyy}-${hh}${mm}${ss}`;
};

// --- Thunk Definition ---
export const processFileThunk = createAsyncThunk<
    string, // Return uniqueProjectName on success
    File,   // Input is the File object
    { rejectValue: string } // Type for rejection payload
>(
    'file/processAndStoreStreaming', // Action type prefix
    async (file, { rejectWithValue }) => {
        if (!file || !(file instanceof File)) {
            console.error('[ThunkStream] Invalid file object received.');
            return rejectWithValue('Invalid file provided for processing.');
        }

        let db: IDBPDatabase<ProjectDB> | null = null;
        let uniqueProjectName: string | null = null;

        try {
            console.log(`[ThunkStream] Processing file: ${file.name}`);

            // 1. Generate unique name
            const baseName = getBaseProjectName(file);
            const timestamp = createTimestamp();
            uniqueProjectName = `${baseName}_${timestamp}`;
            console.log(`[ThunkStream] Generated unique project name: ${uniqueProjectName}`);

            // 2. Open/Prepare the Database
            console.log(`[ThunkStream] Opening/Preparing project DB: ${uniqueProjectName}`);
            db = await openAndPrepareProjectDB(uniqueProjectName);
            console.log(`[ThunkStream] Project DB opened/prepared successfully.`);

            // 3. Stream JSON into the DB
            console.log(`[ThunkStream] Starting stream via jsonStreamer utility...`);
            const handleProgress = (storeName: string, count: number) => {
                if (count % 100 === 0) {
                    console.log(`[Progress] ${storeName}: ${count} items processed...`);
                }
            };
            await streamJsonToStores(file, db, handleProgress);
            console.log(`[ThunkStream] Stream finished successfully.`);

            // 4. Close DB connection (only if successfully opened)
            console.log(`[ThunkStream] Closing DB connection for ${uniqueProjectName}`);
            db.close(); // Close the connection after successful streaming

            // 5. Return the unique name on success
            if (!uniqueProjectName) {
                // This should ideally never happen if we reached here
                throw new Error("uniqueProjectName was unexpectedly null after successful processing.");
            }
            return uniqueProjectName; // SUCCESS PATH

        } catch (err: any) {
            console.error('[ThunkStream] Error during file processing and streaming:', err);

            // Attempt to close DB if it was successfully opened
            if (db) { // Check if db instance exists
                try {
                    console.log('[ThunkStream] Attempting to close DB connection after error...');
                    // *** REMOVE .closed check, just try to close ***
                    db.close();
                    // ***********************************************
                } catch (closeErr) {
                    console.error('[ThunkStream] Error closing DB after main error (ignoring):', closeErr);
                }
            }

            // Attempt to delete the partially created/populated DB on failure
            if (uniqueProjectName) {
                try {
                    console.warn(`[ThunkStream] Attempting to delete failed DB: ${uniqueProjectName}`);
                    await indexedDB.deleteDatabase(uniqueProjectName);
                    console.log(`[ThunkStream] Deleted failed DB: ${uniqueProjectName}`);
                } catch (deleteErr) {
                    console.error(`[ThunkStream] Failed to delete failed DB ${uniqueProjectName}:`, deleteErr);
                }
            }

            const errorMessage = err instanceof Error ? err.message : String(err);
            // Explicitly reject here
            return rejectWithValue(errorMessage || 'File processing and streaming failed'); // FAILURE PATH (catch block)
        }

        // *** ADD A FINAL REJECTION AS A FALLBACK (SHOULD BE UNREACHABLE) ***
        // This satisfies TypeScript's need for an explicit return/reject on all paths.
        // console.error("[ThunkStream] Reached unexpected end of thunk function.");
        // return rejectWithValue("An unexpected error occurred in the file processing thunk.");
        // *********************************************************************
        // EDIT: Let's remove the fallback reject. The try/catch structure *should*
        // guarantee either the try returns or the catch rejects. Adding the fallback
        // might mask other logic errors. Let's rely on the try/catch.
    }
);
