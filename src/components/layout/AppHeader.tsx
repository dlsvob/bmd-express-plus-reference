// src/components/layout/AppHeader.tsx
import React from 'react';
import { Layout, Select, Button, Space, Typography, Tooltip } from 'antd';
import { PlusOutlined, MenuOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveProject } from '../../store/slices/projectSlice';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { setActiveView } from '../../store/slices/navigationSlice';
import { clearSelectedAnalyses } from '../../store/slices/selectedAnalysisSlice';
import {
    setActiveClusteringRef,
    setGoIdInputString,
    // Import other reset actions from analysisUISlice if needed
} from '../../store/slices/analysisUISlice';

const { Header } = Layout;
const { Option } = Select;
const { Text } = Typography;

interface ProjectListItem { name: string; }

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

    console.log(`[AppHeader] Rendering. activeProjectName from selector: ${activeProjectName}`);

    const handleProjectChange = (value: string | null) => {
        if (value !== activeProjectName) {
            console.log(`[AppHeader] handleProjectChange called with new value: ${value}`);

            // --- ADD LOG HERE ---
            console.log(`[AppHeader] Dispatching actions to switch project TO: ${value || 'None'}`);
            // --------------------

            // 1. Set the new active project
            dispatch(setActiveProject(value));

            // 2. Navigate back to the Experiment List view
            dispatch(setActiveView('experiments'));

            // 3. Clear selections from the previous project
            dispatch(clearSelectedAnalyses());

            // 4. Reset relevant Analysis UI state
            dispatch(setActiveClusteringRef(null));
            dispatch(setGoIdInputString(''));
            // Add other resets if necessary

        } else {
            console.log(`[AppHeader] handleProjectChange called with SAME value: ${value}. No state change needed.`);
        }
    };

    const handleAddNewProject = () => {
        console.log('Add New Project button clicked - Implement me!');
    };

    let placeholderText = 'Select Project...';
    if (isLoading) { placeholderText = 'Loading Projects...'; }
    else if (error) { placeholderText = 'Error Loading Projects'; }
    else if (!projectList || projectList.length === 0) { placeholderText = 'No Projects Found'; }

    return (
        <Header
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
            }}
        >
            {/* Left Section */}
            <Space align="center">
                <Button type="text" icon={<MenuOutlined />} onClick={onMenuClick} disabled={!projectSelected || disabled} aria-label="Open navigation menu" />
                <Text strong style={{ fontSize: '1.2em', marginLeft: '8px' }}> BMDx Plus </Text>
            </Space>

            {/* Right Section */}
            <Space style={{ marginLeft: 'auto' }}>
                <Select
                    style={{ width: 200 }}
                    placeholder={placeholderText}
                    onChange={handleProjectChange}
                    value={activeProjectName}
                    loading={isLoading}
                    disabled={disabled || isLoading || !!error || !projectList || projectList.length === 0}
                // allowClear removed for now
                >
                    {projectList?.map((project) => (
                        <Option key={project.name} value={project.name}>
                            {project.name}
                        </Option>
                    ))}
                </Select>

                <Tooltip title="Add New Project">
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNewProject} disabled={disabled || isLoading || !!error} > New </Button>
                </Tooltip>
            </Space>
        </Header>
    );
};

export default AppHeader;
