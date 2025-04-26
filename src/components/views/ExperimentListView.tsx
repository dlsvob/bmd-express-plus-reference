// src/components/views/ExperimentListView.tsx
import React, { useMemo, useCallback } from 'react';
import { Spin, Alert, Typography, Button, Checkbox, Space } from 'antd';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';

// *** UPDATED: Import the specific hook for the list ***
import { useGetSelectableAnalysesQuery } from '../../store/apis/experimentsApi'; // Adjust path if needed
// --- Types ---
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveView } from '../../store/slices/navigationSlice';
import {
    setSelectedAnalysisRefs,
    selectSelectedAnalysisRefs
} from '../../store/slices/selectedAnalysisSlice';
import { SelectableAnalysisInfo } from '../../models/applicationModel'; // Need this type again

const { Title, Text } = Typography;

interface ExperimentListViewProps {
    projectName: string;
}

const ExperimentListView: React.FC<ExperimentListViewProps> = ({ projectName }) => {
    const dispatch = useAppDispatch();

    // *** UPDATED: Call the hook for the selectable list ***
    const {
        data: selectableAnalyses, // Data is SelectableAnalysisInfo[] directly
        isLoading: isLoadingList,
        error: listError,
        isSuccess,
    } = useGetSelectableAnalysesQuery(
        { projectName },
        { skip: !projectName }
    );

    const selectedValues = useAppSelector(selectSelectedAnalysisRefs);

    const checkboxOptions = useMemo(() => {
        // *** UPDATED: Use selectableAnalyses directly ***
        const currentList = selectableAnalyses ?? [];
        console.log(`[ExperimentListView] Recalculating checkboxOptions. Selectable analyses count: ${currentList.length}`);
        // Sorting logic (optional if already sorted in transformResponse)
        const sortedData = [...currentList].sort((a, b) => (a.bmdResultName ?? '').localeCompare(b.bmdResultName ?? ''));
        return sortedData.map(item => ({
            label: item.bmdResultName,
            value: String(item.bmdResultRef), // Values are strings
        }));
        // *** UPDATED: Dependency is selectableAnalyses ***
    }, [selectableAnalyses]);

    const handleSelectionChange = useCallback((checkedValues: CheckboxValueType[]) => {
        const stringValues = checkedValues.map(String);
        console.log("[ExperimentListView] handleSelectionChange - Dispatching string values:", stringValues);
        dispatch(setSelectedAnalysisRefs(stringValues));
    }, [dispatch]);

    const handleRunAnalysis = useCallback(() => {
        // Logic remains the same
        if (!selectedValues || selectedValues.length === 0) return;
        dispatch(setActiveView('categoryAnalysis'));
    }, [dispatch, selectedValues]);

    // --- Loading State ---
    if (isLoadingList) { /* ... same Spin ... */ }

    // --- Error State ---
    if (listError) { /* ... same Alert, use listError ... */ }

    // --- Success State & Render ---
    const noDataAvailable = isSuccess && (!selectableAnalyses || selectableAnalyses.length === 0);

    return (
        <>
            {/* ... Header Row with Button ... */}
            <div style={{ marginBottom: 16, /* ... */ }}>
                <Title level={5} style={{ margin: 0 }}>Select BMD Results:</Title>
                <Button
                    type="primary"
                    onClick={handleRunAnalysis}
                    disabled={!selectedValues || selectedValues.length === 0 || noDataAvailable}
                >
                    Run Category Analysis on {selectedValues?.length > 0 ? `(${selectedValues.length})` : ''} Selected
                </Button>
            </div>
            {noDataAvailable ? (
                <Text>No BMD results found for this project.</Text>
            ) : (
                <div style={{ height: '300px', /* ... */ }}>
                    <Checkbox.Group
                        style={{ width: '100%' }}
                        value={selectedValues}
                        onChange={handleSelectionChange}
                    >
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {checkboxOptions.map(option => (
                                <Checkbox key={option.value} value={option.value}>
                                    {option.label}
                                </Checkbox>
                            ))}
                        </Space>
                    </Checkbox.Group>
                </div>
            )}
        </>
    );
};

export default ExperimentListView;