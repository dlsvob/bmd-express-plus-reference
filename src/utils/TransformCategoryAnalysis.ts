// src/utils/transformCategoryAnalysis.ts
import { ColumnMapping } from './categoryAnalysisMapping';

// Helper: Extract a nested property using a dotted field path.
export const extractField = (obj: any, fieldPath: string): any => {
    const parts = fieldPath.split('.');
    let value = obj;
    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part];
        } else {
            return ''; // or null if you prefer
        }
    }
    return value;
};

/**
 * Transform a single parent record into an array of rows.
 * Each row corresponds to one element in the categoryAnalsyisResults array.
 * Fields that begin with "categoryAnalsyisResults." are extracted from the detail object,
 * while other fields are extracted from the parent record.
 */
export const transformCategoryAnalysisRecord = (
    record: any,
    mapping: ColumnMapping[]
): { [header: string]: any }[] => {
    const rows: { [header: string]: any }[] = [];
    // Get the array of detail items.
    const details = Array.isArray(record.categoryAnalsyisResults)
        ? record.categoryAnalsyisResults
        : [];

    // For each detail item, create a row.
    details.forEach((detail: any) => {
        const row: { [header: string]: any } = {};
        mapping.forEach((map) => {
            if (map.field.startsWith("categoryAnalsyisResults.")) {
                // Remove the prefix and extract from the detail object.
                const fieldPath = map.field.replace(/^categoryAnalsyisResults\./, "");
                row[map.header] = extractField(detail, fieldPath);
            } else {
                // For fields not in the detail array, extract from the parent.
                row[map.header] = extractField(record, map.field);
            }
        });
        rows.push(row);
    });
    return rows;
};

/**
 * Transform an array of parent records into a flat array of rows.
 */
export const transformCategoryAnalysis = (
    records: any[],
    mapping: ColumnMapping[]
): { [header: string]: any }[] => {
    return records.flatMap(record =>
        transformCategoryAnalysisRecord(record, mapping)
    );
};