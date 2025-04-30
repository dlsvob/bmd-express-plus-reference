import React, { useMemo, useCallback } from 'react';
import { Checkbox, Spin, Alert, Empty } from 'antd'; // Removed Space
import { useGetSelectableAnalysesQuery } from '../../store/apis/experimentsApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    setSelectedAnalysisRefs,
    selectSelectedAnalysisRefs,
} from '../../store/slices/selectedAnalysisSlice';
import styles from './ExperimentListView.module.css';

type CheckboxValueType = string | number;

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
        const sortedData = [...currentList].sort((a, b) =>
            (a.bmdResultName ?? '').localeCompare(b.bmdResultName ?? '')
        );
        return sortedData.map((item) => ({
            label: item.bmdResultName,
            value: String(item.bmdResultRef),
        }));
    }, [selectableAnalyses]);

    const handleSelectionChange = useCallback(
        (checkedValues: CheckboxValueType[]) => {
            const stringValues = checkedValues.map(String);
            dispatch(setSelectedAnalysisRefs(stringValues));
        },
        [dispatch]
    );

    if (isLoadingList) {
        return null;
    }

    if (listError) {
        const errorMessage =
            typeof listError === 'object' &&
                listError !== null &&
                'message' in listError
                ? String(listError.message)
                : String(listError);
        return (
            <Alert
                message="Error Loading Experiments"
                description={errorMessage}
                type="error"
                showIcon
            />
        );
    }

    const noDataAvailable =
        isSuccess && (!selectableAnalyses || selectableAnalyses.length === 0);

    console.log('[ExperimentListView] Rendering Checkbox.Group with:', {
        optionsCount: checkboxOptions.length,
        valueProp: selectedValues,
    });


    return (
        <div className={styles.viewContainer}>
            <div className={styles.flexContainer}>
                <div className={styles.listArea}>
                    {noDataAvailable ? (
                        <Empty
                            description="No BMD results found for this project."
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    ) : (
                        // <<< REVERT TO USING options PROP >>>
                        <Checkbox.Group
                            // Apply style to ensure vertical layout if needed with options prop
                            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}
                            options={checkboxOptions} // Pass the generated options array
                            value={selectedValues} // Pass the selected values from Redux
                            onChange={handleSelectionChange}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExperimentListView;
