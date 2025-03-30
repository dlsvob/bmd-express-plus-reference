// src/data/dataSourceFactory.ts
export type StorageType = 'indexeddb' | 'remote';

export interface RemoteConfig {
    apiUrl: string;
    token?: string;
}

import { ApiService } from '../services/ApiService';
import { RemoteRtxApi } from '../data/RemoteRtxApi';
import { IndexedDbApi } from '../data/IndexedDbApi';
import { IRtxDataSource } from '../data/IRtxDataSource';

export function createDataSource(
    storageType: StorageType,
    remoteConfig?: RemoteConfig
): IRtxDataSource {
    if (storageType === 'remote') {
        if (!remoteConfig || !remoteConfig.apiUrl) {
            throw new Error("Remote configuration is required for remote storage.");
        }
        return new RemoteRtxApi(new ApiService(remoteConfig.apiUrl, remoteConfig.token));
    } else if (storageType === 'indexeddb') {
        return new IndexedDbApi();
    }
    throw new Error("Unknown storage type.");
}