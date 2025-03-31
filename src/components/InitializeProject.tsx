// src/components/InitializeProject.tsx
import React, { useState } from 'react';
import { Layout, Typography, Upload, Button, Radio, RadioChangeEvent, message, Card, Spin } from 'antd'; // Added Spin
import { UploadOutlined } from '@ant-design/icons';
import { useAppDispatch } from '../store/hooks'; // adjust the path as needed
// Import the refactored thunk
import { processFileThunk } from '../store/thunks/fileProcessingThunk'; // Adjust path

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const InitializeProject: React.FC = () => {
    // Keep state for selected store, although only 'indexeddb' is used now
    const [selectedStore, setSelectedStore] = useState<string>('indexeddb');
    // Use loading state controlled by the thunk lifecycle
    const [loading, setLoading] = useState<boolean>(false);
    const dispatch = useAppDispatch();

    const handleStoreChange = (e: RadioChangeEvent) => {
        setSelectedStore(e.target.value);
    };

    // Keep client-side file type validation
    const handleBeforeUpload = (file: File): boolean => {
        const isJson = file.type === 'application/json';
        if (!isJson) {
            message.error('You can only upload a JSON file!');
            return false; // Prevent upload
        }
        // Optional: Add file size check
        // const isLt2M = file.size / 1024 / 1024 < 2;
        // if (!isLt2M) {
        //   message.error('File must be smaller than 2MB!');
        //   return false;
        // }
        return true; // Allow upload
    };

    // Use Ant Design's customRequest to handle the upload logic via the thunk
    const handleCustomRequest = async (options: any) => {
        const { file, onSuccess, onError } = options;

        if (selectedStore === 'indexeddb') {
            setLoading(true);
            try {
                // Dispatch the thunk with the file object
                const resultAction = await dispatch(processFileThunk(file as File));

                // Check if the thunk fulfilled or rejected
                if (processFileThunk.fulfilled.match(resultAction)) {
                    const uniqueDBName = resultAction.payload;
                    message.success(`File successfully processed! Project name: ${uniqueDBName}`);
                    onSuccess?.(uniqueDBName, file); // Notify Upload component of success
                } else {
                    // Handle rejection
                    const errorMessage = resultAction.payload || 'File processing failed.';
                    console.error('Error processing file (thunk rejected):', errorMessage);
                    message.error(`Error processing file: ${errorMessage}`);
                    onError?.(new Error(errorMessage), file); // Notify Upload component of error
                }
            } catch (err: any) {
                // Catch unexpected errors during dispatch/thunk execution
                console.error('Unexpected error during file processing:', err);
                message.error('An unexpected error occurred during file processing.');
                onError?.(err, file);
            } finally {
                setLoading(false);
            }
        } else {
            message.error('Only IndexedDB is available at this time.');
            onError?.(new Error('Selected store not available'), file);
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
            <Content style={{ maxWidth: 600, margin: 'auto', padding: '2rem' }}>
                <Title level={2}>Initialize Project</Title>
                <Paragraph>
                    Select a local BMD Express JSON file to create a new project database.
                </Paragraph>
                {/* Keep Radio group for future expansion, but disable others */}
                <Radio.Group onChange={handleStoreChange} value={selectedStore} style={{ marginBottom: '2rem' }}>
                    <Radio value="indexeddb">Local Browser Sandbox (IndexedDB)</Radio>
                    <Radio value="remote" disabled>Remote API (Unavailable)</Radio>
                    {/* Add other disabled options if desired */}
                </Radio.Group>

                <Card title="Upload Project File" bordered={false}>
                    <Paragraph>
                        The selected JSON file will be processed and stored locally in an IndexedDB database.
                        A unique name based on the file and timestamp will be generated.
                    </Paragraph>
                    <Upload
                        accept=".json"
                        beforeUpload={handleBeforeUpload} // Validate file type client-side
                        showUploadList={false} // Don't show default list item
                        customRequest={handleCustomRequest} // Use custom handler
                        disabled={loading} // Disable while processing
                    >
                        <Button icon={<UploadOutlined />} size="large" loading={loading} block>
                            {loading ? "Processing..." : "Select File and Initialize"}
                        </Button>
                    </Upload>
                    {/* Optional: Add a Spin indicator separate from button */}
                    {/* {loading && <div style={{textAlign: 'center', marginTop: '1rem'}}><Spin /></div>} */}
                </Card>
            </Content>
        </Layout>
    );
};

export default InitializeProject;
