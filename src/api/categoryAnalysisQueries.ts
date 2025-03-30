// src/api/categoryAnalysisQueries.ts
import { IDBPDatabase } from 'idb';
import { ProjectDB } from '../utils/myIDB';
import { CategoryAnalysisResult } from '../models/BMDxExported';

export async function getCategoryAnalysisResultsByNamePrefix(
    db: IDBPDatabase<ProjectDB>,
    prefix: string
): Promise<CategoryAnalysisResult[]> {
    try {
        console.log("Querying categoryAnalysisResults with prefix:", prefix);
        const allRecords = await db.getAll('categoryAnalysisResults');
        //console.log("All categoryAnalysisResults records:", allRecords);
        const results = allRecords.filter((record: any) => {
            return record.name && record.name.startsWith(prefix);
        }) as CategoryAnalysisResult[];
        //console.log("Filtered results:", results);
        return results;
    } catch (err) {
        console.error("Error in getCategoryAnalysisResultsByNamePrefix:", err);
        return [];
    }
}