// src/data/stores.ts
export type StorageType = 'indexeddb' | 'remote';

export interface RemoteConfig {
    apiUrl: string;
    token?: string;
}