// src/components/layout/AppHeader.tsx
// Reverted to the simpler version - Title is NOT displayed here.

import React from 'react';
import { Layout, Select, Button, Space, Typography, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveProject } from '../../store/slices/projectSlice';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';

const { Header } = Layout;
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
}

const AppHeader: React.FC<AppHeaderProps> = ({
    projectList = [],
    isLoading,
    error,
    disabled = false,
}) => {
    const dispatch = useAppDispatch();
    const activeProjectName = useAppSelector(selectSelectedProjectName);

    const handleProjectChange = (value: string | null) => {
        dispatch(setActiveProject(value));
    };

    const handleAddNewProject = () => {
        console.log('Add New Project clicked - Implement me!');
    };

    let placeholderText = 'Select Project...';
    if (isLoading) {
        placeholderText = 'Loading projects...';
    } else if (error) {
        placeholderText = 'Error loading projects';
    } else if (!projectList || projectList.length === 0) {
        placeholderText = 'No projects found';
    }

    return (
        <Header
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
            }}
        >
            {/* Left Section: App Title */}
            <div style={{ marginRight: 'auto' }}> {/* Pushes controls to the right */}
                <Text strong style={{ fontSize: '1.2em' }}>
                    BMDx Plus
                </Text>
            </div>

            {/* Right Section: Controls */}
            <div>
                <Space>
                    <Select
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

                    <Tooltip title="Add New Project">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAddNewProject}
                            disabled={disabled || isLoading || !!error}
                        >
                            New
                        </Button>
                    </Tooltip>
                </Space>
            </div>
        </Header>
    );
};

export default AppHeader;
