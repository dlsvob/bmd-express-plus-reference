// src/api/fileProcessingThunk.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { getProjectNameFromFile, loadJsonFileToIndexedDB, MyDatabase, setCurrentDB } from '../../api/indexedDbIngestion';

export const processFileThunk = createAsyncThunk<
    string, // Returned payload: the unique database name (project name + timestamp)
    File,   // File input
    { rejectValue: string }
>(
    'file/process',
    async (file, { rejectWithValue }) => {
        try {
            // Extract the base project name from the file.
            const name = await getProjectNameFromFile(file);
            // Create a human-readable timestamp.
            const now = new Date();
            const dd = String(now.getDate()).padStart(2, '0');
            const mmm = now.toLocaleString('en-US', { month: 'short' });
            const yyyy = now.getFullYear();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            const formattedTimestamp = `${dd}-${mmm}-${yyyy}-${hh}:${mm}:${ss}`;
            // Remove any trailing ".bm2" from the name and append the timestamp.
            const uniqueName = `${name.replace('.bm2', '')}_${formattedTimestamp}`;
            console.log('Unique database name:', uniqueName); // Log the unique name
            const db = new MyDatabase(uniqueName);
            setCurrentDB(db);
            // Ingest the JSON file into IndexedDB.
            await loadJsonFileToIndexedDB(file, db, (msg) => {
                // You can narrow types here if needed; for now we log the update message.
                if (msg.type === 'updateLog') {
                    console.log(`${msg.table}: ${msg.message}`);
                } else if (msg.type === 'update') {
                    console.log(`${msg.table}: count = ${msg.count}`);
                } else if (msg.type === 'log') {
                    console.log(msg.message);
                }
            });
            return uniqueName;
        } catch (err: any) {
            return rejectWithValue(err.message || 'File processing failed');
        }
    }
);