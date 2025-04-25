// src/components/layout/AppHeader.tsx
import React from 'react';
import { Layout, Select, Button, Space, Typography, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks'; // Redux hooks
import { setActiveProject } from '../../store/slices/projectSlice'; // Action to set project
import { selectActiveProjectId } from '../../store/selectors/projectSelectors'; // Selector for current value

const { Header } = Layout;
const { Option } = Select;
const { Text } = Typography;

// Define the expected structure of a project item in the list
// Matches the output of projectsApi baseQuery
interface ProjectListItem {
    name: string;
    // experiments?: any[]; // experiments array might be present but likely unused here
}

// Define props expected by AppHeader
interface AppHeaderProps {
    projectList: ProjectListItem[] | undefined; // Array of projects or undefined if not loaded
    isLoading: boolean; // Loading status for the project list
    error: string | null; // Error object if loading failed
    disabled?: boolean; // General disabled state (e.g., if Pyodide failed)
}

const AppHeader: React.FC<AppHeaderProps> = ({
    projectList = [], // Default to empty array
    isLoading,
    error,
    disabled = false, // Default disabled to false
}) => {
    const dispatch = useAppDispatch();
    // Get the currently selected project name from Redux state to control the Select value
    const activeProjectName = useAppSelector(selectActiveProjectId);

    const handleProjectChange = (value: string | null) => {
        // Dispatch action to update the active project in Redux state
        dispatch(setActiveProject(value));
    };

    const handleAddNewProject = () => {
        // TODO: Implement logic to add a new project
        // This would likely involve dispatching an action to open a modal
        console.log("Add New Project clicked - Implement me!");
        // Example: dispatch(uiSlice.actions.showAddProjectModal());
    };

    // Determine placeholder text based on state
    let placeholderText = "Select Project...";
    if (isLoading) {
        placeholderText = "Loading projects...";
    } else if (error) {
        placeholderText = "Error loading projects";
    } else if (!projectList || projectList.length === 0) {
        placeholderText = "No projects found";
    }

    return (
        <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', background: '#fff' }}>
            {/* Simple Title or Logo Area */}
            <div style={{ marginRight: 'auto' }}>
                <Text strong style={{ fontSize: '1.2em' }}>BMDx Plus</Text>
            </div>

            {/* Project Selection Area */}
            <Space>
                <Text>Project:</Text>
                <Select
                    style={{ width: 200 }}
                    placeholder={placeholderText}
                    onChange={handleProjectChange}
                    value={activeProjectName} // Controlled by Redux state
                    loading={isLoading}
                    disabled={disabled || isLoading || !!error || !projectList || projectList.length === 0} // Disable based on status
                    allowClear // Allow clearing the selection
                    onClear={() => handleProjectChange(null)} // Dispatch null on clear
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
                        disabled={disabled || isLoading || !!error} // Disable if loading/error/globally disabled
                    >
                        New
                    </Button>
                </Tooltip>
            </Space>
        </Header>
    );
};

export default AppHeader;