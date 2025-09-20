// src/components/layout/AppHeader.tsx
import React, { useState } from 'react'; // Added useState
import { Select, Button, Space, Typography, Tooltip, Upload, message } from 'antd'; // Added Upload, message
import { PlusOutlined, MenuOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveProject, fetchAvailableProjects, initializeDuckDbProject } from '../../store/slices/projectSlice'; // Added initializeDuckDbProject
import { selectSelectedProjectName } from '../../store/slices/projectSlice';
import {
    setActiveView,
} from '../../store/slices/navigationSlice';
import {
    clearSelectedAnalyses,
} from '../../store/slices/selectedAnalysisSlice';
import {
    setActiveClusteringRef,
    setGoIdInputString,
} from '../../store/slices/analysisUISlice';
import { processFileThunk } from '../../store/thunks/fileProcessingThunk'; // Added
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
    const [isUploading, setIsUploading] = useState(false); // State for upload loading

    console.log(`[AppHeader] Rendering. activeProjectName: ${activeProjectName}`);

    const handleProjectChange = (value: string | null) => {
        if (value !== activeProjectName) {
            console.log(
                `[AppHeader] Project CHANGED. Dispatching actions to switch project TO: ${value || 'None'}`
            );
            dispatch(setActiveProject(value));
            dispatch(setActiveView('experiments'));
            dispatch(clearSelectedAnalyses());
            dispatch(setActiveClusteringRef(null));
            dispatch(setGoIdInputString(''));

            // Initialize DuckDB when a project is selected
            if (value) {
                console.log(`[AppHeader] 🚀 Dispatching DuckDB initialization for project: ${value}`);
                dispatch(initializeDuckDbProject(value));
            }
        } else {
            console.log(
                `[AppHeader] handleProjectChange called with SAME value: ${value}. No state change needed.`
            );
        }
    };

    const handleFileUpload = async (file: File): Promise<boolean> => {
        setIsUploading(true);
        message.loading({ content: `Importing ${file.name}...`, key: 'uploadStatus', duration: 0 });

        try {
            const resultAction = await dispatch(processFileThunk(file));
            if (processFileThunk.fulfilled.match(resultAction)) {
                const newProjectName = resultAction.payload;
                message.success({ content: `Project "${newProjectName}" imported successfully!`, key: 'uploadStatus', duration: 3 });
                await dispatch(fetchAvailableProjects()); // Refresh project list
                // Optionally, automatically select the new project
                // dispatch(setActiveProject(newProjectName));
                // dispatch(setActiveView('experiments'));
            } else if (processFileThunk.rejected.match(resultAction)) {
                message.error({ content: `Failed to import project: ${resultAction.payload || 'Unknown error'}`, key: 'uploadStatus', duration: 5 });
                console.error("File processing thunk rejected:", resultAction.payload);
            }
        } catch (uploadError: any) {
            message.error({ content: `Upload error: ${uploadError.message || 'An unexpected error occurred.'}`, key: 'uploadStatus', duration: 5 });
            console.error("Error dispatching processFileThunk:", uploadError);
        } finally {
            setIsUploading(false);
        }
        return false; // Prevent default Upload component behavior
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
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
            }}
        >
            {/* --- Left Section --- */}
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
                <Upload
                    accept=".json"
                    beforeUpload={handleFileUpload}
                    showUploadList={false}
                    disabled={disabled || isLoading || !!error || isUploading}
                >
                    <Tooltip title="Import Project JSON File">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            loading={isUploading} // Show loading state on button
                            disabled={disabled || isLoading || !!error} // Keep original disabled conditions
                        >
                            Import Project
                        </Button>
                    </Tooltip>
                </Upload>
            </Space>

            {/* --- Center Section (REMOVED Run Analysis Button) --- */}
            <div style={{ flexGrow: 1 }}></div>


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