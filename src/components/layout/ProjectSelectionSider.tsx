// src/components/layout/ProjectSelectionSider.tsx
import React from 'react';
import { Layout, Select, Button, Space, Typography, Tooltip, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveProject } from '../../store/slices/projectSlice';
import { selectSelectedProjectName } from '../../store/slices/projectSlice';

const { Sider } = Layout;
const { Option } = Select;
const { Text } = Typography;

// Define the expected structure of a project item in the list
interface ProjectListItem {
    name: string;
}

// Define props expected by this Sider component
interface ProjectSelectionSiderProps {
    projectList: ProjectListItem[] | undefined;
    isLoading: boolean;
    error: string | null;
    disabled?: boolean;
    width?: number;
}

const ProjectSelectionSider: React.FC<ProjectSelectionSiderProps> = ({
    projectList = [],
    isLoading,
    error,
    disabled = false,
    width = 200, // Default width
}) => {
    const dispatch = useAppDispatch();
    const activeProjectName = useAppSelector(selectSelectedProjectName);

    const handleProjectChange = (value: string | null) => {
        dispatch(setActiveProject(value));
    };

    const handleAddNewProject = () => {
        console.log('Add New Project clicked - Implement me!');
        // Example: dispatch(uiSlice.actions.showAddProjectModal());
    };

    // Determine placeholder text based on state
    let placeholderText = 'Select Project...';
    if (isLoading) {
        placeholderText = 'Loading...';
    } else if (error) {
        placeholderText = 'Error';
    } else if (!projectList || projectList.length === 0) {
        placeholderText = 'No projects';
    }

    return (
        <Sider
            width={width}
            theme="light" // Or "dark"
            style={{
                padding: '16px',
                borderLeft: '1px solid #f0f0f0',
                overflow: 'auto',
                height: '100vh',
                position: 'sticky',
                top: 0,
            }}
        >
            <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Project Selection</Text>
                {isLoading && <Spin size="small" />}
                {error && <Text type="danger">Error loading</Text>}
                <Select
                    style={{ width: '100%' }}
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

                <Tooltip title="Add New Project">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddNewProject}
                        disabled={disabled || isLoading || !!error}
                        style={{ width: '100%' }}
                    >
                        New Project
                    </Button>
                </Tooltip>
            </Space>
        </Sider>
    );
};

export default ProjectSelectionSider;
