// src/api/RemoteAPIStore.ts
import { DataStore } from './DataStore';

export class RemoteAPIStore implements DataStore {
    private endpoint = 'https://api.example.com/data';

    async save(data: any): Promise<void> {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('Failed to save data');
        }
    }

    async load(): Promise<any> {
        const response = await fetch(this.endpoint);
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        return response.json();
    }
}