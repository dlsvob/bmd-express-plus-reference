// src/components/views/ExperimentListView.tsx
import React, { useMemo, useCallback } from 'react';
import { Typography, Button, Checkbox, Space, Spin, Alert } from 'antd'; // Added Spin, Alert
import { useGetSelectableAnalysesQuery } from '../../store/apis/experimentsApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveView } from '../../store/slices/navigationSlice';
import {
    setSelectedAnalysisRefs,
    selectSelectedAnalysisRefs
} from '../../store/slices/selectedAnalysisSlice';
import styles from './ExperimentListView.module.css'; // Import CSS module

type CheckboxValueType = string | number;

const { Title, Text } = Typography;

interface ExperimentListViewProps {
    projectName: string;
}

const ExperimentListView: React.FC<ExperimentListViewProps> = ({ projectName }) => {
    const dispatch = useAppDispatch();

    const {
        data: selectableAnalyses,
        isLoading: isLoadingList,
        error: listError,
        isSuccess,
    } = useGetSelectableAnalysesQuery(
        { projectName },
        { skip: !projectName }
    );

    const selectedValues = useAppSelector(selectSelectedAnalysisRefs);

    const checkboxOptions = useMemo(() => {
        const currentList = selectableAnalyses ?? [];
        console.log(`[ExperimentListView] Recalculating checkboxOptions. Selectable analyses count: ${currentList.length}`);
        const sortedData = [...currentList].sort((a, b) => (a.bmdResultName ?? '').localeCompare(b.bmdResultName ?? ''));
        return sortedData.map(item => ({
            label: item.bmdResultName,
            value: String(item.bmdResultRef), // Ensure value is string for Checkbox.Group
        }));
    }, [selectableAnalyses]);

    const handleSelectionChange = useCallback((checkedValues: CheckboxValueType[]) => {
        const stringValues = checkedValues.map(String);
        console.log("[ExperimentListView] handleSelectionChange - Dispatching string values:", stringValues);
        dispatch(setSelectedAnalysisRefs(stringValues));
    }, [dispatch]);

    const handleRunAnalysis = useCallback(() => {
        if (!selectedValues || selectedValues.length === 0) return;
        // Navigate to the default analysis view (e.g., UMAP)
        dispatch(setActiveView('categoryAnalysis'));
    }, [dispatch, selectedValues]);

    // --- Loading State ---
    if (isLoadingList) {
        return (
            <div className={styles.viewContainer} style={{ textAlign: 'center', paddingTop: '50px' }}>
                <Spin tip="Loading experiments..." />
            </div>
        );
    }

    // --- Error State ---
    if (listError) {
        const errorMessage = typeof listError === 'object' && listError !== null && 'message' in listError ? String(listError.message) : String(listError);
        return (
            <div className={styles.viewContainer} style={{ padding: '24px' }}>
                <Alert message="Error Loading Experiments" description={errorMessage} type="error" showIcon />
            </div>
        );
    }

    // --- Success State & Render ---
    const noDataAvailable = isSuccess && (!selectableAnalyses || selectableAnalyses.length === 0);

    return (
        // Outer container for centering
        <div className={styles.viewContainer}>
            {/* Flex container for vertical layout */}
            <div className={styles.flexContainer}>
                {/* Header Area (Button) - Fixed height */}
                <div className={styles.headerArea}>
                    <Title level={5} style={{ margin: 0, flexGrow: 1 }}>Select BMD Results:</Title>
                    <Button
                        type="primary"
                        onClick={handleRunAnalysis}
                        disabled={!selectedValues || selectedValues.length === 0 || noDataAvailable}
                    >
                        Run Category Analysis {selectedValues?.length > 0 ? `(${selectedValues.length})` : ''}
                    </Button>
                </div>

                {/* List Area - Grows and Scrolls */}
                <div className={styles.listArea}>
                    {noDataAvailable ? (
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                            <Text type="secondary">No BMD results found for this project.</Text>
                        </div>
                    ) : (
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExperimentListView;
