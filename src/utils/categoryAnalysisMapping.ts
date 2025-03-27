// src/config/categoryAnalysisMapping.ts
export interface ColumnMapping {
    header: string;
    field: string;
}

export const categoryAnalysisMapping: ColumnMapping[] = [
    { header: "BMD Result", field: "bmdResult" },
    { header: "Category Ref", field: "categoryAnalsyisResults.categoryIdentifier.@ref" },
    { header: "Category Type", field: "categoryAnalsyisResults.categoryIdentifier.@type" },
    { header: "Category ID", field: "categoryAnalsyisResults.categoryIdentifier.id" },
    { header: "Category Title", field: "categoryAnalsyisResults.categoryIdentifier.title" },
    { header: "Genes Passed Filters", field: "categoryAnalsyisResults.genesThatPassedAllFilters" },
    { header: "Gene All Count", field: "categoryAnalsyisResults.geneAllCount" },
    { header: "Gene All Count From Experiment", field: "categoryAnalsyisResults.geneAllCountFromExperiment" },
    { header: "Genes", field: "categoryAnalsyisResults.genesIds" },
    { header: "Probe IDs", field: "categoryAnalsyisResults.probeIds" },
    { header: "Genes Up", field: "categoryAnalsyisResults.genesUp" },
    { header: "Probes Up", field: "categoryAnalsyisResults.probesUp" },
    { header: "Genes Down", field: "categoryAnalsyisResults.genesDown" },
    { header: "Percentage", field: "categoryAnalsyisResults.percentage" },
];