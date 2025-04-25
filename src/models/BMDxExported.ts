// src/models/BMDxExported.ts

export interface ProjectData {
    name: string;
    doseResponseExperiments: DoseResponseExperiment[];
    oneWayANOVAResults: any[]; // Schema: array (contents not further defined)
    williamsTrendResults: WilliamsTrendResult[];
    curveFitPrefilterResults: any[]; // Schema: array (contents not further defined)
    oriogenResults: any[]; // Schema: array (contents not further defined)
    bMDResult: BMDResult[];
    categoryAnalysisResults: CategoryAnalysisResult[];
}

export interface DoseResponseExperiment {
    "@ref": number;
    "@type": string;
    name: string;
    treatments: Treatment[];
    probeResponses: ProbeResponse[];
    referenceGeneAnnotations: ReferenceGeneAnnotation[];
    chip: Chip;
    chipCreationDate: null; // as defined in schema
    logTransformation: string;
    columnHeader2: (number | string)[];
    doseGroups: DoseGroup[];
}

export interface Treatment {
    "@ref": number;
    "@type": string;
    name: string;
    dose: number;
}

export interface ProbeResponse {
    "@ref": number;
    "@type": string;
    probe: Probe;
    responses: number[];
}

export interface Probe {
    "@ref": number;
    "@type": string;
    id: string;
}

export interface ReferenceGeneAnnotation {
    "@ref": number;
    "@type": string;
    probe: number;
    referenceGenes: (number | ReferenceGene)[];
}

export interface ReferenceGene {
    "@ref": number;
    "@type": string;
    id: string;
    geneSymbol: string;
}

export interface Chip {
    "@ref": number;
    "@type": string;
    chipId: null;
    provider: string;
    species: string;
    geoID: string;
    geoName: string;
    name: string;
}

export interface DoseGroup {
    dose: number;
    count: number;
    responseMean: null;
}

// -------------------- Williams Trend --------------------
export interface WilliamsTrendResult {
    "@ref": number;
    "@type": string;
    name: string;
    williamsTrendResults: WilliamsTrendInnerResult[];
    doseResponseExperiement: number;
}

export interface WilliamsTrendInnerResult {
    "@ref": number;
    "@type": string;
    probeResponse: number;
    pValue: number;
    adjustedPValue: number;
    bestFoldChange: number;
    loelDose: null;
    noelDose: null;
    foldChanges: number[];
    noelLoelPValues: null;
}

// -------------------- BMD Result --------------------
export interface BMDResult {
    "@ref": number;
    "@type": string;
    name: string;
    probeStatResults: ProbeStatResult[];
    doseResponseExperiment: number;
    bmdMethod: string;
    prefilterResults: number;
    wAUC: null;
    logwAUC: null;
}

export interface ProbeStatResult {
    "@ref": number;
    "@type": string;
    probeResponse: number;
    bestStatResult: BestStatResult | null;
    bestPolyStatResult: number | BestPolyStatResult;
    statResults: (number | StatResult)[];
    chiSquaredResults: null;
}

export interface BestStatResult {
    "@ref": number;
    "@type": string;
    fitPValue: number;
    fitLogLikelihood: number;
    adverseDirection: number;
    success: string;
    residuals: null;
    rSquared: number;
    curveParameters: number[];
    otherParameters: null;
    isStepFunction: boolean;
    covariances: null;
    zscore: number;
    bmrCountsToTop: number;
    foldChangeToTop: number;
    bmdLowDoseRatio: number;
    bmdHighDoseRatio: number;
    bmdResponseLowDoseResponseRatio: number;
    bmdResponseHighDoseResponseRatio: number;
    kFlag: number;
    allParameters: any[];
    aic: number;
    bmdu: number;
    bmdl: number;
    bmd: number;
    stepWithBMDLessLowest: boolean;
    degree: number;
    vertext: number | string;
    option: number;
}

export interface BestPolyStatResult {
    "@ref": number;
    "@type": string;
    fitPValue: number;
    fitLogLikelihood: number;
    adverseDirection: number;
    success: string;
    residuals: null;
    rSquared: number;
    curveParameters: number[];
    otherParameters: null;
    isStepFunction: boolean;
    covariances: null;
    zscore: number;
    bmrCountsToTop: number;
    foldChangeToTop: number;
    bmdLowDoseRatio: number;
    bmdHighDoseRatio: number;
    bmdResponseLowDoseResponseRatio: number;
    bmdResponseHighDoseResponseRatio: number;
    degree: number;
    vertext: number | string;
    allParameters: any[];
    aic: number;
    bmdu: number | string;
    bmdl: number;
    bmd: number | string;
    stepWithBMDLessLowest: boolean;
}

export interface StatResult {
    "@ref": number;
    "@type": string;
    fitPValue: number;
    fitLogLikelihood: number;
    adverseDirection: number;
    success: string;
    residuals: null;
    rSquared: number;
    curveParameters: number[];
    otherParameters: null;
    isStepFunction: boolean;
    covariances: null;
    zscore: number;
    bmrCountsToTop: number;
    foldChangeToTop: number;
    bmdLowDoseRatio: number;
    bmdHighDoseRatio: number;
    bmdResponseLowDoseResponseRatio: number;
    bmdResponseHighDoseResponseRatio: number;
    allParameters: any[];
    aic: number;
    bmdu: number | string;
    bmdl: number | string;
    bmd: number | string;
    stepWithBMDLessLowest: boolean;
    degree: number;
    vertext: number | string;
    option: number;
    kFlag: number;
}

// -------------------- Category Analysis --------------------
export interface CategoryAnalysisResult {
    "@ref": number;
    "@type": string;
    name: string;
    bmdResult: number;
    categoryAnalsyisResults: CategoryAnalysisItem[];
}

export interface CategoryAnalysisItem {
    "@ref": number;
    "@type": string;
    categoryIdentifier: CategoryIdentifier;
    referenceGeneProbeStatResults: ReferenceGeneProbeStatResult[] | null;
    geneAllCountFromExperiment: number | null,
    geneAllCount: number | null,
    geneCountSignificantANOVA: number | null,
    percentage: number | null,
    genesWithBMDLessEqualHighDose: number | null,
    genesWithBMDpValueGreaterEqualValue: number | null,
    genesWithBMDRSquaredValueGreaterEqualValue: number | null,
    genesWithBMDBMDLRatioBelowValue: number | null,
    genesWithBMDUBMDLRatioBelowValue: number | null,
    genesWithBMDUBMDRatioBelowValue: number | null,
    genesWithNFoldBelowLowPostiveDoseValue: number | null,
    genesWithFoldChangeAboveValue: number | null,
    genesWithPrefilterPValueAboveValue: number | null,
    genesWithPrefilterAdjustedPValueAboveValue: number | null,
    genesNotStepFunction: number | null,
    genesNotStepFunctionWithBMDLower: number | null,
    genesNotAdverseDirection: number | null,
    genesThatPassedAllFilters: number | null,
    fishersA: number | null,
    fishersB: number | null,
    fishersC: number | null,
    fishersD: number | null,
    fishersExactLeftPValue: number | null,
    fishersExactRightPValue: number | null,
    fishersExactTwoTailPValue: number | null,
    genesWithConflictingProbeSets: string,
    bmdMean: number | null,
    bmdMedian: number | null,
    bmdMinimum: number | null,
    bmdSD: number | null,
    bmdWMean: number | null,
    bmdWSD: number | null,
    bmdlMean: number | null,
    bmdlMedian: number | null,
    bmdlMinimum: number | null,
    bmdlSD: number | null,
    bmdlWMean: number | null,
    bmdlWSD: number | null,
    bmduMean: number | null,
    bmduMedian: number | null,
    bmduMinimum: number | null,
    bmduSD: number | null,
    bmduWMean: number | null,
    bmduWSD: number | null,
    fifthPercentileIndex: number | null,
    bmdFifthPercentileTotalGenes: number | null,
    tenthPercentileIndex: number | null,
    bmdTenthPercentileTotalGenes: number | null,
    bmdlFifthPercentileTotalGenes: number | null,
    bmdlTenthPercentileTotalGenes: number | null,
    bmduFifthPercentileTotalGenes: number | null,
    bmduTenthPercentileTotalGenes: number | null,
    genesUpBMDMean: number | null,
    genesUpBMDMedian: number | null,
    genesUpBMDSD: number | null,
    genesUpBMDLMean: number | null,
    genesUpBMDLMedian: number | null,
    genesUpBMDLSD: number | null,
    genesUpBMDUMean: number | null,
    genesUpBMDUMedian: number | null,
    genesUpBMDUSD: number | null,
    genesDownBMDMean: number | null,
    genesDownBMDMedian: number | null,
    genesDownBMDSD: number | null,
    genesDownBMDLMean: number | null,
    genesDownBMDLMedian: number | null,
    genesDownBMDLSD: number | null,
    genesDownBMDUMean: number | null,
    genesDownBMDUMedian: number | null,
    genesDownBMDUSD: number | null,
    overallDirection: string,
    totalFoldChange: number | null,
    meanFoldChange: number | null,
    medianFoldChange: number | null,
    maxFoldChange: number | null,
    minFoldChange: number | null,
    stdDevFoldChange: number | null,
    bmdLower95: number | null,
    bmdUpper95: number | null,
    bmdlLower95: number | null,
    bmdlUpper95: number | null,
    bmduUpper95: number | null,
    bmduLower95: number | null,
    bmdFifthPercentile: number | null,
    bmdlFifthPercentile: number | null,
    bmduFifthPercentile: number | null,
    bmdTenthPercentile: number | null,
    bmdlTenthPercentile: number | null,
    bmduTenthPercentile: number | null,
    ivive: string | null,
    bmddown: string | null,
    bmdlup: string | null,
    bmduup: string | null,
    bmdup: string | null,
    genesUp: string | null,
    bmdlist: string | null,
    genesAdverseUpCount: number | null,
    probesAdverseDownCount: number | null,
    adverseConflictCount: number | null,
    bmdconflictList: string | null,
    probesDown: string | null,
    genesDown: string | null,
    bmdudown: string | null,
    probesConflictList: string | null,
    bmdulist: string | null,
    geneSymbolsPrivate: string | null,
    genesAdverseDownCount: number | null,
    probeIds: string | null,
    bmduconflictList: string | null,
    genesIds: string | null,
    genesConflictList: string | null,
    probesAdversUpCount: number | null,
    probesUp: string | null,
    bmdllist: string | null,
    bmdlconflictList: string | null,
    bmdldown: string | null,
}

export interface CategoryIdentifier {
    "@ref": number;
    "@type": string;
    id: string;
    title: string;
    goLevel: string; // schema indicates goLevel is string here.
}

export interface ReferenceGeneProbeStatResult {
    "@ref": number;
    "@type": string;
    referenceGene: number;
    probeStatResults: number[];
    adverseDirection: string;
    conflictMinCorrelation: number | null;
}