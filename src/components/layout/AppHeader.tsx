import React, { useCallback } from 'react';
import { Select, Button, Space, Typography, Tooltip } from 'antd';
import {
    PlusOutlined,
    MenuOutlined,
    BarChartOutlined, // Icon for the Run Analysis button
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveProject } from '../../store/slices/projectSlice';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import {
    setActiveView,
    selectCurrentView, // <<< Import selector for current view
} from '../../store/slices/navigationSlice';
import {
    clearSelectedAnalyses, // <<< Keep this import
    selectSelectedAnalysisRefs, // <<< Import selector for selected refs
} from '../../store/slices/selectedAnalysisSlice';
import {
    setActiveClusteringRef,
    setGoIdInputString,
} from '../../store/slices/analysisUISlice';
import styles from './AppHeader.module.css'; // Import CSS module

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
    const currentViewKey = useAppSelector(selectCurrentView); // <<< Get current view
    const selectedRefs = useAppSelector(selectSelectedAnalysisRefs); // <<< Get selected refs

    console.log(
        `[AppHeader] Rendering. activeProjectName: ${activeProjectName}, currentView: ${currentViewKey}, selectedRefs: ${selectedRefs.length}`
    );

    const handleProjectChange = (value: string | null) => {
        // <<< Only dispatch if the project name actually changes >>>
        if (value !== activeProjectName) {
            console.log(
                `[AppHeader] Project CHANGED. Dispatching actions to switch project TO: ${value || 'None'
                }`
            );
            dispatch(setActiveProject(value));
            dispatch(setActiveView('experiments')); // Reset view on project change
            dispatch(clearSelectedAnalyses()); // <<< Clear selections on project change
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
        // TODO: Implement project import functionality (e.g., open modal)
    };

    // --- Callback for the Run Analysis button ---
    const handleRunAnalysis = useCallback(() => {
        if (!selectedRefs || selectedRefs.length === 0) return;
        console.log('[AppHeader] Run Analysis clicked, dispatching setActiveView.');
        dispatch(setActiveView('categoryAnalysis')); // Navigate to the first analysis view
    }, [dispatch, selectedRefs]);
    // --- End Callback ---

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

    return (
        // Use Flexbox for 3-section layout (Left, Center, Right)
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between', // Distribute space
                alignItems: 'center',
                width: '100%',
            }}
        >
            {/* --- Left Section --- */}
            <Space align="center" style={{ flexShrink: 0 }}> {/* Prevent shrinking */}
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
                        whiteSpace: 'nowrap', // Prevent title wrapping
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
                    allowClear // Allow clearing selection
                    onClear={() => handleProjectChange(null)} // Handle clear event
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

            {/* --- Center Section (Conditional Button) --- */}
            {/* This div will be centered between the left and right sections */}
            <div style={{ textAlign: 'center' }}>
                {showRunAnalysisButton && (
                    <Button
                        type="primary"
                        icon={<BarChartOutlined />}
                        onClick={handleRunAnalysis}
                        disabled={isRunAnalysisDisabled}
                    >
                        Run Category Analysis{' '}
                        {selectedRefs.length > 0 ? `(${selectedRefs.length})` : ''}
                    </Button>
                )}
            </div>

            {/* --- Right Section (Placeholder for balance) --- */}
            {/* Use a Space component matching the left side for better width calculation */}
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
