# BMD Express Database Schema Documentation

## Overview

This document describes the database schema used by the `bmd-express-data-service` package, which provides the data layer for BMD Express Plus applications. The schema is implemented using **DuckDB WASM** with **OPFS** (Origin Private File System) storage for web applications.

## Technology Stack

- **Database**: DuckDB WASM 1.29.1-dev132.0
- **Storage**: OPFS (Origin Private File System) for persistence
- **Data Types**: BIGINT, VARCHAR, FLOAT, JSON, TIMESTAMP
- **Access Pattern**: Read-heavy analytical queries with bulk loading

## Core Entity Relationships

```
datasets (1) ──→ (N) bmdResults
bmdResults (1) ──→ (N) categoryAnalysisResultsSets
categoryAnalysisResultsSets (1) ──→ (N) categoryAnalysisResults
categoryAnalysisResults (N) ──→ (1) categoryIdentifiers
bmdResults (N) ──→ (1) doseResponseExperiments
doseResponseExperiments (1) ──→ (N) doseGroups
categoryIdentifiers (1) ──→ (N) umapReferences
```

## Table Catalog

### Core Analysis Tables

#### `bmdResults` (21 records)
**Purpose**: Stores benchmark dose modeling results for experiments
**Primary Key**: `id` (BIGINT)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | BIGINT | NO | Primary key |
| name | VARCHAR | YES | Human-readable result name |
| sex | VARCHAR | YES | Subject sex (Male/Female) |
| organ | VARCHAR | YES | Target organ (Thyroid, Liver, etc.) |
| species | VARCHAR | YES | Species (Rat, Mouse, etc.) |
| dataType | VARCHAR | YES | Data type (genomic, etc.) |
| platform | VARCHAR | YES | Analysis platform (S1500_Plus, etc.) |
| doseResponseExperimentId | BIGINT | YES | FK to doseResponseExperiments |
| prefilterResultSetId | BIGINT | YES | FK to prefilter results |
| bmdMethod | VARCHAR | YES | BMD calculation method |
| wAUC | FLOAT | YES | Weighted Area Under Curve |
| logwAUC | FLOAT | YES | Log-weighted AUC |
| wAUCList | JSON | YES | List of wAUC values |
| logwAUCList | JSON | YES | List of log wAUC values |
| datasetId | BIGINT | YES | FK to datasets |

**Relationships**:
- `doseResponseExperimentId` → `doseResponseExperiments.id`
- `datasetId` → `datasets.id`

---

#### `categoryAnalysisResultsSets` (42 records)
**Purpose**: Analysis sets that group category results by experimental conditions
**Primary Key**: `id` (BIGINT)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | BIGINT | NO | Primary key |
| name | VARCHAR | YES | Analysis set name |
| sex | VARCHAR | YES | Subject sex |
| organ | VARCHAR | YES | Target organ |
| species | VARCHAR | YES | Species |
| dataType | VARCHAR | YES | Data type |
| platform | VARCHAR | YES | Analysis platform |
| bmdResultId | BIGINT | YES | FK to bmdResults |
| datasetId | BIGINT | YES | FK to datasets |

**Key Insight**: Each `bmdResultId` appears exactly **2 times** in this table, indicating that each BMD result has multiple analysis sets (likely different analysis types like GO vs GENE).

**Relationships**:
- `bmdResultId` → `bmdResults.id`
- `datasetId` → `datasets.id`

---

#### `categoryAnalysisResults` (20,205 records)
**Purpose**: Individual category analysis results with statistical metrics
**Primary Key**: `id` (BIGINT)

| Column | Type | Nullable | Key Fields |
|--------|------|----------|------------|
| id | BIGINT | NO | Primary key |
| categoryAnalysisResultsId | BIGINT | YES | FK to categoryAnalysisResultsSets |
| categoryIdentifierId | VARCHAR | YES | FK to categoryIdentifiers |
| modelType | VARCHAR | YES | Analysis model type (go, gene, etc.) |
| geneAllCount | BIGINT | YES | Total gene count |
| percentage | FLOAT | YES | Percentage significance |
| genesThatPassedAllFilters | FLOAT | YES | Genes passing all filters |

**Note**: This table has 95 total columns containing extensive statistical analysis results including BMD statistics, fold changes, confidence intervals, and Fisher's exact test results.

**Relationships**:
- `categoryAnalysisResultsId` → `categoryAnalysisResultsSets.id`
- `categoryIdentifierId` → `categoryIdentifiers.id`

---

#### `categoryIdentifiers`
**Purpose**: Category definitions (GO terms, pathways, etc.)
**Primary Key**: `id` (VARCHAR)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | VARCHAR | NO | Primary key (GO:0000001, etc.) |
| title | VARCHAR | YES | Human-readable category name |
| modelType | VARCHAR | YES | Category type (go, gene, etc.) |
| goLevel | VARCHAR | YES | GO ontology level |

---

### Experimental Design Tables

#### `doseResponseExperiments`
**Purpose**: Experiment metadata and conditions
**Primary Key**: `id` (BIGINT)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | BIGINT | NO | Primary key |
| name | VARCHAR | YES | Experiment name |
| sex | VARCHAR | YES | Subject sex |
| organ | VARCHAR | YES | Target organ |
| species | VARCHAR | YES | Species |
| dataType | VARCHAR | YES | Data type |
| platform | VARCHAR | YES | Analysis platform |
| chipId | BIGINT | YES | Microarray chip ID |
| logTransformation | VARCHAR | YES | Log transformation applied |
| columnHeader2 | JSON | YES | Additional column metadata |
| chipCreationDate | BIGINT | YES | Chip creation timestamp |

---

#### `doseGroups`
**Purpose**: Dose-response group definitions
**Primary Key**: `id` (BIGINT)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | BIGINT | NO | Primary key |
| doseResponseExperimentId | BIGINT | YES | FK to doseResponseExperiments |
| dose | FLOAT | YES | Dose level |
| count | BIGINT | YES | Number of subjects |
| responseMean | FLOAT | YES | Mean response value |

---

#### `datasets`
**Purpose**: Top-level dataset organization
**Primary Key**: `id` (BIGINT)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | BIGINT | NO | Primary key |
| name | VARCHAR | YES | Dataset name |
| created | TIMESTAMP | YES | Creation timestamp |
| groupId | BIGINT | YES | Group identifier |
| dataType | VARCHAR | YES | Data type |
| groupName | VARCHAR | YES | Group name |

---

### Visualization Tables

#### `umapReferences`
**Purpose**: UMAP coordinate reference data for visualization
**Contains**: Pre-computed UMAP coordinates for categories

---

## Service Layer Mapping

### CategoryAnalysisQueryService → Tables Used

1. **`executeMainQuery()`**:
   - `categoryAnalysisResultsSets` (main table)
   - `categoryAnalysisResults` (JOIN on categoryAnalysisResultsId)
   - `categoryIdentifiers` (JOIN on categoryIdentifierId)
   - `bmdResults` (JOIN on bmdResultId)
   - `doseResponseExperiments` (JOIN on doseResponseExperimentId)

2. **`executeDoseGroupsQuery()`**:
   - `doseGroups` (filtered by experimentIds)

3. **`executeUmapClusterQuery()`**:
   - `categoryIdentifiers` (main)
   - `umapReferences` (LEFT JOIN on categoryIdentifierId)

### UmapDataLoader → Tables Used

1. **All UMAP methods**:
   - `umapReferences` (primary table for UMAP coordinate data)

## Critical Migration Insights

### Duplicate Key Issue Resolution

**Problem**: Current implementation uses `bmdResultId` as checkbox keys, but each `bmdResultId` appears exactly **2 times** in `categoryAnalysisResultsSets`.

**Solution**: Use `categoryAnalysisResultsSets.id` (primary key) as the unique identifier instead of `bmdResultId`.

### Query Performance Patterns

1. **Main Analysis Query**: Complex 5-table JOIN with filters on:
   - `modelType = 'go'`
   - `percentage >= 5`
   - `geneAllCount BETWEEN 40 AND 500`
   - `genesThatPassedAllFilters >= 3`

2. **Pagination**: Uses LIMIT/OFFSET with ORDER BY for large result sets

3. **Related Data**: Separate queries for dose groups and UMAP data to avoid WebAssembly memory issues

## Migration Strategy

### From Current Implementation → Data Service

1. **Replace Raw SQL Queries**:
   ```typescript
   // OLD: Direct SQL in useAvailableAnalysesService
   const query = `SELECT DISTINCT cars.bmdResultId...`;

   // NEW: Service method
   const analyses = await dataService.categoryAnalysisQueryService.executeMainQuery(20);
   ```

2. **Update Data Models**:
   - Use `categoryAnalysisResultsSets.id` as unique keys
   - Leverage TypeScript interfaces from `shared-types`
   - Use service-layer data transformations

3. **Replace Custom Hooks**:
   - `useAvailableAnalysesService` → `CategoryAnalysisQueryService.executeMainQuery()`
   - Direct IndexedDB calls → Service layer abstractions

### Benefits of Migration

1. **Eliminates Duplicate Keys**: Proper primary key usage
2. **Better Performance**: Optimized DuckDB queries with pagination
3. **Type Safety**: Full TypeScript integration
4. **Maintainability**: Service layer abstractions
5. **Consistency**: Unified with main BMD Express Plus package

## Data Volume Summary

- **bmdResults**: 21 records (core experiment results)
- **categoryAnalysisResultsSets**: 42 records (2 per BMD result)
- **categoryAnalysisResults**: 20,205 records (detailed analysis data)
- **Total Database Size**: ~30MB (DuckDB file)