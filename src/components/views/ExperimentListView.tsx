// src/components/views/ExperimentListView.tsx
import React, { useMemo, useCallback } from 'react';
import { Typography, Button, Checkbox, Space } from 'antd';
import { useGetSelectableAnalysesQuery } from '../../store/apis/experimentsApi';

// --- Types ---
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveView } from '../../store/slices/navigationSlice';
import {
    setSelectedAnalysisRefs,
    selectSelectedAnalysisRefs
} from '../../store/slices/selectedAnalysisSlice';

type CheckboxValueType = string | number;

const { Title, Text } = Typography;

interface ExperimentListViewProps {
    projectName: string;
}

const ExperimentListView: React.FC<ExperimentListViewProps> = ({ projectName }) => {
    const dispatch = useAppDispatch();

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

        const sortedData = [...currentList].sort((a, b) => (a.bmdResultName ?? '').localeCompare(b.bmdResultName ?? ''));
        return sortedData.map(item => ({
            label: item.bmdResultName,
            value: String(item.bmdResultRef),
        }));
    }, [selectableAnalyses]);

    const handleSelectionChange = useCallback((checkedValues: CheckboxValueType[]) => {
        const stringValues = checkedValues.map(String);
        console.log("[ExperimentListView] handleSelectionChange - Dispatching string values:", stringValues);
        dispatch(setSelectedAnalysisRefs(stringValues));
    }, [dispatch]);

    const handleRunAnalysis = useCallback(() => {
        if (!selectedValues || selectedValues.length === 0) return;
        dispatch(setActiveView('categoryAnalysis'));
    }, [dispatch, selectedValues]);

    // --- Loading State ---
    if (isLoadingList) {
        return <div style={{ padding: '24px', textAlign: 'center' }}>Loading experiments...</div>;
    }

    // --- Error State ---
    if (listError) {
        const errorMessage = typeof listError === 'object' && listError !== null && 'message' in listError ? String(listError.message) : String(listError);
        return <div style={{ padding: '24px' }}><Text type="danger">Error loading experiments: {errorMessage}</Text></div>;
    }

    // --- Success State & Render ---
    const noDataAvailable = isSuccess && (!selectableAnalyses || selectableAnalyses.length === 0);

    return (
        <>
            {/* Header Row with Button */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #f0f0f0', padding: '8px' }}>
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
