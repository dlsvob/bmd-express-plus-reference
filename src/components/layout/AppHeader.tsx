// src/components/layout/AppHeader.tsx
import React from 'react';
import { Layout, Select, Button, Space, Typography, Tooltip } from 'antd';
import { PlusOutlined, MenuOutlined } from '@ant-design/icons'; // Import MenuOutlined
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveProject } from '../../store/slices/projectSlice';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';

const { Header } = Layout;
const { Option } = Select;
const { Text } = Typography;

// Keep interface for project list items
interface ProjectListItem {
    name: string;
}

// Update props interface
interface AppHeaderProps {
    projectList: ProjectListItem[] | undefined;
    isLoading: boolean;
    error: string | null;
    disabled?: boolean; // General disabled state (e.g., Pyodide error)
    projectSelected: boolean; // Is a project currently selected?
    onMenuClick: () => void; // Callback to open the navigation drawer
}

const AppHeader: React.FC<AppHeaderProps> = ({
    projectList = [],
    isLoading,
    error,
    disabled = false,
    projectSelected, // Receive new prop
    onMenuClick,     // Receive new prop
}) => {
    const dispatch = useAppDispatch();
    const activeProjectName = useAppSelector(selectSelectedProjectName);

    const handleProjectChange = (value: string | null) => {
        dispatch(setActiveProject(value));
        // Optionally dispatch action to clear analysis state if needed
        // dispatch(clearSelectedAnalyses());
    };

    const handleAddNewProject = () => {
        console.log('Add New Project clicked - Implement me!');
        // Example: dispatch(uiSlice.actions.showAddProjectModal());
    };

    // Determine placeholder text based on state (same logic as before)
    let placeholderText = 'Select Project...';
    if (isLoading) {
        placeholderText = 'Loading...';
    } else if (error) {
        placeholderText = 'Error';
    } else if (!projectList || projectList.length === 0) {
        placeholderText = 'No projects';
    }

    return (
        <Header
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px', // Adjust padding as needed
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
            }}
        >
            {/* Left Section: Hamburger Menu & App Title */}
            <Space align="center">
                <Button
                    type="text" // Use text button for icon-only
                    icon={<MenuOutlined />}
                    onClick={onMenuClick}
                    // Disable hamburger if no project is selected OR header is generally disabled
                    disabled={!projectSelected || disabled}
                    aria-label="Open navigation menu"
                />
                <Text strong style={{ fontSize: '1.2em', marginLeft: '8px' }}>
                    BMDx Plus
                </Text>
            </Space>

            {/* Right Section: Controls (Pushed to the right) */}
            <Space style={{ marginLeft: 'auto' }}>
                <Select
                    style={{ width: 200 }}
                    placeholder={placeholderText}
                    onChange={handleProjectChange}
                    value={activeProjectName}
                    loading={isLoading}
                    disabled={
                        disabled || // General disabled state
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

                <Tooltip title="Add New Project">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddNewProject}
                        disabled={disabled || isLoading || !!error} // General disabled state
                    >
                        New
                    </Button>
                </Tooltip>
            </Space>
        </Header>
    );
};

export default AppHeader;
