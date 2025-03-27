// src/api/DataStore.ts

export interface DataStore {
    save(data: any): Promise<void>;
    load(): Promise<any>;
    update?(data: any): Promise<void>;
    delete?(id: string): Promise<void>;
}