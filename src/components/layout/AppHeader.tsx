import React from 'react';
import { Select, Button, Space, Typography, Tooltip } from 'antd';
import { PlusOutlined, MenuOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveProject } from '../../store/slices/projectSlice';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { setActiveView } from '../../store/slices/navigationSlice';
import { clearSelectedAnalyses } from '../../store/slices/selectedAnalysisSlice';
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

    console.log(
        `[AppHeader] Rendering. activeProjectName from selector: ${activeProjectName}`
    );

    const handleProjectChange = (value: string | null) => {
        if (value !== activeProjectName) {
            console.log(
                `[AppHeader] handleProjectChange dispatching actions to switch project TO: ${value || 'None'
                }`
            );
            dispatch(setActiveProject(value));
            dispatch(setActiveView('experiments')); // Reset view on project change
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
        // TODO: Implement project import functionality (e.g., open modal)
    };

    let placeholderText = 'Select Project...';
    if (isLoading) {
        placeholderText = 'Loading Projects...';
    } else if (error) {
        placeholderText = 'Error Loading Projects';
    } else if (!projectList || projectList.length === 0) {
        placeholderText = 'No Projects Found';
    }

    return (
        <Space align="center">
            {' '}
            {/* Single Space for left alignment */}
            <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={onMenuClick}
                disabled={!projectSelected || disabled}
                aria-label="Open navigation menu"
                style={{ fontSize: '20px' }} // Increased icon size
            />
            <Text
                strong
                style={{
                    fontSize: '1.4em', // Increased font size
                    marginLeft: '8px',
                    marginRight: '24px', // Added right margin
                }}
            >
                BMD Express...Plus!
            </Text>
            <Select
                className={styles.projectSelector} // Added className
                style={{ width: 200 }} // Keep width
                placeholder={placeholderText}
                onChange={handleProjectChange}
                value={activeProjectName} // Use value for controlled component
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
                {' '}
                {/* Updated tooltip */}
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddNewProject}
                    disabled={disabled || isLoading || !!error}
                >
                    Import Project {/* Updated text */}
                </Button>
            </Tooltip>
            {/* --- Right Section (can be added later if needed, outside this Space) --- */}
        </Space>
    );
};

export default AppHeader;
