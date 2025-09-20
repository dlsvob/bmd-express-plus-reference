import React, { useMemo, useCallback } from 'react';
// Removed Button, BarChartOutlined
import { Checkbox, Spin, Alert, Empty, Tooltip } from 'antd';
import { useAvailableAnalysesService } from '../../hooks/useAvailableAnalysesService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    setSelectedAnalysisRefs,
    selectSelectedAnalysisRefs,
} from '../../store/slices/selectedAnalysisSlice';
// Removed setActiveView
import styles from './ExperimentListView.module.css';

type CheckboxValueType = string | number;

interface ExperimentListViewProps {
    projectName: string;
}

// This component now ONLY renders the list part
const ExperimentListView: React.FC<ExperimentListViewProps> = ({
    projectName,
}) => {
    const dispatch = useAppDispatch();

    const {
        data: selectableAnalyses,
        isLoading: isLoadingList,
        error: listError,
        isSuccess,
    } = useAvailableAnalysesService(projectName);

    // Keep selector for checkbox values
    const selectedValues = useAppSelector(selectSelectedAnalysisRefs);

    // Checkbox options generation (with Tooltip for ellipsis)
    const checkboxOptions = useMemo(() => {
        const currentList = selectableAnalyses ?? [];
        const sortedData = [...currentList].sort((a, b) =>
            (a.bmdResultName ?? '').localeCompare(b.bmdResultName ?? '')
        );
        return sortedData.map((item) => {
            const labelText = item.bmdResultName || `Analysis ${item.bmdResultRef}`;
            return {
                label: (
                    <Tooltip title={labelText} placement="top">
                        {/* This span will be targeted by CSS for ellipsis */}
                        <span>{labelText}</span>
                    </Tooltip>
                ),
                value: String(item.bmdResultRef),
            };
        });
    }, [selectableAnalyses]);


    const handleSelectionChange = useCallback(
        (checkedValues: CheckboxValueType[]) => {
            const stringValues = checkedValues.map(String);
            dispatch(setSelectedAnalysisRefs(stringValues));
        },
        [dispatch]
    );

    // handleRunAnalysis removed

    // --- Loading State ---
    if (isLoadingList) {
        return (
            <div className={styles.viewContainer}>
                <div className={styles.flexContainer}>
                    <div className={styles.listArea} style={{ textAlign: 'center', paddingTop: '20px' }}>
                        <Spin />
                    </div>
                </div>
            </div>
        );
    }

    // --- Error State ---
    if (listError) {
        const errorMessage =
            typeof listError === 'object' &&
                listError !== null &&
                'message' in listError
                ? String(listError.message)
                : String(listError);
        return (
            <div className={styles.viewContainer}>
                <div className={styles.flexContainer}>
                    <Alert
                        message="Error Loading Experiments"
                        description={errorMessage}
                        type="error"
                        showIcon
                        style={{ maxWidth: '450px', margin: '16px auto 0' }}
                    />
                </div>
            </div>
        );
    }

    // --- Determine Empty State ---
    const noDataAvailable =
        isSuccess && (!selectableAnalyses || selectableAnalyses.length === 0);
    // isRunAnalysisDisabled removed

    // --- Render View (No Button, just list container) ---
    return (
        <div className={styles.viewContainer}>
            <div className={styles.flexContainer}>
                {/* listArea no longer scrolls or has max-height */}
                <div className={styles.listArea}>
                    {noDataAvailable ? (
                        <Empty
                            description="No BMD results found for this project."
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    ) : (
                        // Render Checkbox.Group directly
                        <Checkbox.Group
                            style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                            }}
                            options={checkboxOptions}
                            value={selectedValues}
                            onChange={handleSelectionChange}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExperimentListView;
