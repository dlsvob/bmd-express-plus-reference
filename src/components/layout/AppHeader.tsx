// src/components/layout/AppHeader.tsx
import React, { useState } from 'react'; // Added useState
import { Select, Button, Space, Typography, Tooltip, Upload, message } from 'antd'; // Added Upload, message
import { PlusOutlined, MenuOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAvailableProjects, initializeDuckDbProject, setSelectedProjectName } from '../../store/slices/projectSlice'; // Added initializeDuckDbProject
import { selectSelectedProjectName, selectIsDuckDbInitializing, selectIsDuckDbReady } from '../../store/slices/projectSlice';
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
// REMOVED: import { processFileThunk } from '../../store/thunks/fileProcessingThunk'; // Legacy IndexedDB system
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
    const isDuckDbInitializing = useAppSelector(selectIsDuckDbInitializing);
    const isDuckDbReady = useAppSelector(selectIsDuckDbReady);
    const [isUploading, setIsUploading] = useState(false); // State for upload loading

    console.log(`[AppHeader] Rendering. activeProjectName: ${activeProjectName}`);

    const handleProjectChange = async (value: string | null) => {
        if (!value) {
            console.log('[AppHeader] Project cleared');
            return;
        }

        console.log(`[AppHeader] Project selected: ${value}`);
        message.loading({ content: `Connecting to project: ${value}...`, key: 'projectStatus', duration: 0 });

        try {
            // Set the selected project name in Redux first
            console.log(`[AppHeader] Setting selected project: ${value}`);
            dispatch(setSelectedProjectName(value));

            // PROPER GUARD: Only initialize if not already in progress or ready
            if (isDuckDbInitializing) {
                console.log(`[AppHeader] DuckDB already initializing for another project, waiting...`);
                message.info({
                    content: `DuckDB is initializing, please wait...`,
                    key: 'projectStatus',
                    duration: 3
                });
                return;
            }

            if (isDuckDbReady) {
                console.log(`[AppHeader] DuckDB already ready, skipping initialization`);
                message.success({
                    content: `Already connected to project: ${value}`,
                    key: 'projectStatus',
                    duration: 2
                });
                return;
            }

            // Initialize DuckDB connection to the selected project
            console.log(`[AppHeader] Initializing DuckDB project: ${value}`);
            const result = await dispatch(initializeDuckDbProject(value));

            if (initializeDuckDbProject.fulfilled.match(result)) {
                console.log(`[AppHeader] ✅ Successfully connected to project: ${value}`);

                message.success({
                    content: `Connected to project: ${value}`,
                    key: 'projectStatus',
                    duration: 3
                });
            } else {
                throw new Error(result.payload || 'Failed to initialize project');
            }

        } catch (error: any) {
            console.error(`[AppHeader] ❌ Failed to connect to project ${value}:`, error);
            message.error({
                content: `Failed to connect to project: ${error.message || 'Unknown error'}`,
                key: 'projectStatus',
                duration: 5
            });
        }
    };

    const handleDuckDbUpload = async (file: File): Promise<boolean> => {
        setIsUploading(true);
        message.loading({ content: `Uploading ${file.name} to OPFS...`, key: 'uploadStatus', duration: 0 });

        try {
            // Import the upload function from bmd-express-data-service
            const { uploadDuckDbToOpfs } = await import('bmd-express-data-service');

            // Upload the file to OPFS
            console.log(`[AppHeader] Uploading ${file.name} to OPFS...`);
            const result = await uploadDuckDbToOpfs(file);
            console.log(`[AppHeader] Upload result:`, result);

            message.success({
                content: `Database "${file.name}" uploaded successfully to OPFS!`,
                key: 'uploadStatus',
                duration: 3
            });

            // Refresh project list to show the new database
            console.log(`[AppHeader] Refreshing project list...`);
            await dispatch(fetchAvailableProjects());

        } catch (error: any) {
            message.error({
                content: `Failed to upload database: ${error.message || 'Unknown error'}`,
                key: 'uploadStatus',
                duration: 5
            });
            console.error('DuckDB upload error:', error);
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
                    accept=".duckdb"
                    beforeUpload={handleDuckDbUpload}
                    showUploadList={false}
                    disabled={disabled || isLoading || !!error || isUploading}
                >
                    <Tooltip title="Import DuckDB Database File">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            loading={isUploading} // Show loading state on button
                            disabled={disabled || isLoading || !!error} // Keep original disabled conditions
                        >
                            Import Database
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