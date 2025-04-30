import React, { useCallback } from 'react';
import { Select, Button, Space, Typography, Tooltip } from 'antd';
import {
    PlusOutlined,
    MenuOutlined,
    BarChartOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveProject } from '../../store/slices/projectSlice';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import {
    setActiveView,
    selectCurrentView,
} from '../../store/slices/navigationSlice';
import {
    clearSelectedAnalyses,
    selectSelectedAnalysisRefs,
} from '../../store/slices/selectedAnalysisSlice';
import {
    setActiveClusteringRef,
    setGoIdInputString,
} from '../../store/slices/analysisUISlice';
import styles from './AppHeader.module.css';

const { Option } = Select;
const { Text } = Typography;

interface ProjectListItem {
    name: string;
}

interface AppHeaderProps {
    projectList: ProjectListItem[] | undefined;
    isLoading: boolean;
    error: string | null;
    disabled?: boolean;
    projectSelected: boolean;
    onMenuClick: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
    projectList = [],
    isLoading,
    error,
    disabled = false,
    projectSelected,
    onMenuClick,
}) => {
    const dispatch = useAppDispatch();
    const activeProjectName = useAppSelector(selectSelectedProjectName);
    const currentViewKey = useAppSelector(selectCurrentView);
    const selectedRefs = useAppSelector(selectSelectedAnalysisRefs);

    console.log(
        `[AppHeader] Rendering. activeProjectName: ${activeProjectName}, currentView: ${currentViewKey}, selectedRefs: ${selectedRefs.length}`
    );

    const handleProjectChange = (value: string | null) => {
        if (value !== activeProjectName) {
            console.log(
                `[AppHeader] Project CHANGED. Dispatching actions to switch project TO: ${value || 'None'
                }`
            );
            dispatch(setActiveProject(value));
            dispatch(setActiveView('experiments'));
            dispatch(clearSelectedAnalyses());
            dispatch(setActiveClusteringRef(null));
            dispatch(setGoIdInputString(''));
        } else {
            console.log(
                `[AppHeader] handleProjectChange called with SAME value: ${value}. No state change needed.`
            );
        }
    };

    const handleAddNewProject = () => {
        console.log('Import Project button clicked - Implement me!');
        // TODO: Implement project import functionality
    };

    const handleRunAnalysis = useCallback(() => {
        if (!selectedRefs || selectedRefs.length === 0) return;
        console.log('[AppHeader] Run Analysis clicked, dispatching setActiveView.');
        dispatch(setActiveView('categoryAnalysis'));
    }, [dispatch, selectedRefs]);

    let placeholderText = 'Select Project...';
    if (isLoading) {
        placeholderText = 'Loading Projects...';
    } else if (error) {
        placeholderText = 'Error Loading Projects';
    } else if (!projectList || projectList.length === 0) {
        placeholderText = 'No Projects Found';
    }

    const isRunAnalysisDisabled = selectedRefs.length === 0;
    const showRunAnalysisButton = currentViewKey === 'experiments';

    // Define the fixed width for the button container
    const buttonContainerWidth = '450px'; // <<< UPDATED WIDTH

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
            }}
        >
            {/* --- Left Section (Unchanged) --- */}
            <Space align="center" style={{ flexShrink: 0 }}>
                <Button
                    type="text"
                    icon={<MenuOutlined />}
                    onClick={onMenuClick}
                    disabled={!projectSelected || disabled}
                    aria-label="Open navigation menu"
                    style={{ fontSize: '20px' }}
                />
                <Text
                    strong
                    style={{
                        fontSize: '1.4em',
                        marginLeft: '8px',
                        marginRight: '24px',
                        whiteSpace: 'nowrap',
                    }}
                >
                    BMD Express...Plus!
                </Text>
                <Select
                    className={styles.projectSelector}
                    style={{ width: 200 }}
                    placeholder={placeholderText}
                    onChange={handleProjectChange}
                    value={activeProjectName}
                    loading={isLoading}
                    disabled={
                        disabled ||
                        isLoading ||
                        !!error ||
                        !projectList ||
                        projectList.length === 0
                    }
                    allowClear
                    onClear={() => handleProjectChange(null)}
                >
                    {projectList?.map((project) => (
                        <Option key={project.name} value={project.name}>
                            {project.name}
                        </Option>
                    ))}
                </Select>
                <Tooltip title="Import Project">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddNewProject}
                        disabled={disabled || isLoading || !!error}
                    >
                        Import Project
                    </Button>
                </Tooltip>
            </Space>

            {/* --- Center Section (UPDATED) --- */}
            <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
                {showRunAnalysisButton && (
                    /* Wrapper Div with FIXED width and centering */
                    <div style={{ width: buttonContainerWidth, marginLeft: 'auto', marginRight: 'auto' }}> {/* <<< Use width instead of maxWidth */}
                        <Button
                            type="primary"
                            icon={<BarChartOutlined />}
                            onClick={handleRunAnalysis}
                            disabled={isRunAnalysisDisabled}
                            style={{ width: '100%' }} // Button fills wrapper
                        >
                            Run Category Analysis{' '}
                            {selectedRefs.length > 0 ? `(${selectedRefs.length})` : ''}
                        </Button>
                    </div>
                )}
            </div>

            {/* --- Right Section (Placeholder - Unchanged) --- */}
            <Space align="center" style={{ visibility: 'hidden', flexShrink: 0 }}>
                <Button type="text" icon={<MenuOutlined />} style={{ fontSize: '20px' }} />
                <Text strong style={{ fontSize: '1.4em', marginLeft: '8px', marginRight: '24px', whiteSpace: 'nowrap' }}>
                    BMD Express...Plus!
                </Text>
                <Select style={{ width: 200 }} />
                <Button type="primary" icon={<PlusOutlined />}>
                    Import Project
                </Button>
            </Space>
        </div>
    );
};

export default AppHeader;
