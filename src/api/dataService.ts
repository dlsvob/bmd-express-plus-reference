// src/api/dataService.ts
import { DataStore } from './DataStore';
import { IndexedDBStore } from './IndexedDBStore';
import { RemoteAPIStore } from './RemoteAPIStore';

// You might choose which store to use based on config or environment.
const store: DataStore = process.env.REACT_APP_USE_REMOTE
    ? new RemoteAPIStore()
    : new IndexedDBStore();

export async function ingestDataFromFile(file: File): Promise<void> {
    const text = await file.text();
    const jsonData = JSON.parse(text);
    await store.save(jsonData);
}

export async function ingestDataFromUrl(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch data from ${url}`);
    }
    const jsonData = await response.json();
    await store.save(jsonData);
}

export async function loadPersistedData(): Promise<any> {
    return store.load();
}