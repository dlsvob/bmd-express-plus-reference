import React, { useMemo, useCallback } from 'react';
import { Typography, Button, Checkbox, Space, Spin, Alert, Empty } from 'antd';
import { useGetSelectableAnalysesQuery } from '../../store/apis/experimentsApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveView } from '../../store/slices/navigationSlice';
import {
    setSelectedAnalysisRefs,
    selectSelectedAnalysisRefs,
} from '../../store/slices/selectedAnalysisSlice';
import styles from './ExperimentListView.module.css';

type CheckboxValueType = string | number;

const { Title, Text } = Typography;

interface ExperimentListViewProps {
    projectName: string;
}

const ExperimentListView: React.FC<ExperimentListViewProps> = ({
    projectName,
}) => {
    const dispatch = useAppDispatch();

    const {
        data: selectableAnalyses,
        isLoading: isLoadingList,
        error: listError,
        isSuccess,
    } = useGetSelectableAnalysesQuery({ projectName }, { skip: !projectName });

    const selectedValues = useAppSelector(selectSelectedAnalysisRefs);

    const checkboxOptions = useMemo(() => {
        const currentList = selectableAnalyses ?? [];
        console.log(
            `[ExperimentListView] Recalculating checkboxOptions. Selectable analyses count: ${currentList.length}`
        );
        const sortedData = [...currentList].sort((a, b) =>
            (a.bmdResultName ?? '').localeCompare(b.bmdResultName ?? '')
        );
        return sortedData.map((item) => ({
            label: item.bmdResultName,
            value: String(item.bmdResultRef),
        }));
    }, [selectableAnalyses]);

    const availableCount = selectableAnalyses?.length ?? 0;

    const handleSelectionChange = useCallback(
        (checkedValues: CheckboxValueType[]) => {
            const stringValues = checkedValues.map(String);
            console.log(
                '[ExperimentListView] handleSelectionChange - Dispatching string values:',
                stringValues
            );
            dispatch(setSelectedAnalysisRefs(stringValues));
        },
        [dispatch]
    );

    const handleRunAnalysis = useCallback(() => {
        if (!selectedValues || selectedValues.length === 0) return;
        dispatch(setActiveView('categoryAnalysis'));
    }, [dispatch, selectedValues]);

    if (isLoadingList) {
        return (
            <div
                className={styles.viewContainer}
                style={{ textAlign: 'center', paddingTop: '50px' }}
            >
                <Spin tip="Loading experiments..." />
            </div>
        );
    }

    if (listError) {
        const errorMessage =
            typeof listError === 'object' &&
                listError !== null &&
                'message' in listError
                ? String(listError.message)
                : String(listError);
        return (
            <div className={styles.viewContainer} style={{ padding: '24px' }}>
                <Alert
                    message="Error Loading Experiments"
                    description={errorMessage}
                    type="error"
                    showIcon
                />
            </div>
        );
    }

    const noDataAvailable =
        isSuccess && (!selectableAnalyses || selectableAnalyses.length === 0);

    let titleText = 'Select BMD Results Set:';
    if (isSuccess) {
        titleText = `Select BMD Results Set (${availableCount} available):`;
    } else if (isLoadingList) {
        titleText = 'Loading BMD Results...';
    }

    return (
        <div className={styles.viewContainer}>
            <div className={styles.flexContainer}>
                <div className={styles.headerArea}>
                    <Title
                        level={5}
                        style={{
                            margin: 0,
                            flexGrow: 1,
                            fontSize: '1.4em', // <<< ADJUSTED FONT SIZE
                        }}
                    >
                        {titleText}
                    </Title>
                </div>

                <div className={styles.listArea}>
                    <div className={styles.fixedButtonContainer}>
                        <Button
                            type="primary"
                            onClick={handleRunAnalysis}
                            disabled={
                                !selectedValues || selectedValues.length === 0 || noDataAvailable
                            }
                        >
                            Run Category Analysis{' '}
                            {selectedValues?.length > 0 ? `(${selectedValues.length})` : ''}
                        </Button>
                    </div>

                    <div className={styles.scrollableCheckboxes}>
                        {noDataAvailable ? (
                            <Empty
                                description="No BMD results found for this project."
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        ) : (
                            <Checkbox.Group
                                style={{ width: '100%' }}
                                value={selectedValues}
                                onChange={handleSelectionChange}
                            >
                                    <Space
                                        direction="vertical"
                                        style={{ width: '100%' }}
                                        className={styles.checkboxListContent} // <<< ADDED CLASSNAME
                                    >
                                    {checkboxOptions.map((option) => (
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
        </div>
    );
};

export default ExperimentListView;
