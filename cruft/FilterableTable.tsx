// src/components/analysis/FilterableTable.tsx
import React from 'react';
import { Card } from 'antd';
import type { Experiment } from '../../store/apis/experimentsApi'; // Adjust path if needed

// Define props based on how it's used in GOUmapAnalysisUnit
interface FilterableTableProps {
    filterState: any; // Replace 'any' with actual filter state type later
    setFilterState: (value: any) => void; // Replace 'any' later
    availableData?: Experiment[]; // Make availableData potentially optional or check it
}

const FilterableTable: React.FC<FilterableTableProps> = ({
    filterState,
    setFilterState,
    availableData, // Receive the prop
}) => {

    // FIX: Check if availableData exists and is an array before accessing length
    const dataCount = Array.isArray(availableData) ? availableData.length : 0;

    return (
        <Card title="Filterable Table">
            {/* Use the calculated count */}
            Filter controls here. Data count: {dataCount}
            <br />
            Current Filter State: {JSON.stringify(filterState)}
            <br />
            (Placeholder - Implement actual filter UI)
            {/* Example: <Select placeholder="Group by..." onChange={setFilterState} /> */}
        </Card>
    );
};

export default FilterableTable;