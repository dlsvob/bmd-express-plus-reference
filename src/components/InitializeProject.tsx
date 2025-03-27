// src/components/InitializeProject.tsx
import React, { useState } from 'react';
import { Layout, Typography, Upload, Button, Radio, RadioChangeEvent, message, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
//import { flushSync } from 'react-dom';
import { useAppDispatch } from '../store/hooks'; // adjust the path as needed
import { processFileThunk } from '../store/thunks/fileProcessingThunk';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* const TerminalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '132ch', // approximate width of a 132-column terminal
    height: '40em', // approximate 40 rows
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: '#0f0',
    padding: '1rem',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    overflowY: 'auto',
    borderRadius: '8px',
    zIndex: 9999,
    textAlign: 'left',
};
 */
const InitializeProject: React.FC = () => {
    const [selectedStore, setSelectedStore] = useState<string>('indexeddb');
    const [loading, setLoading] = useState<boolean>(false);
    //const [consoleMessages, setConsoleMessages] = useState<string[]>([]);
    //const [isFinished, setIsFinished] = useState<boolean>(false);
    const dispatch = useAppDispatch();

    const handleStoreChange = (e: RadioChangeEvent) => {
        setSelectedStore(e.target.value);
    };

    const handleBeforeUpload = (file: File) => {
        const isJson = file.type === 'application/json';
        if (!isJson) {
            message.error('You can only upload a JSON file!');
            return false;
        }
        return true;
    };

    // Here we delegate file processing entirely to the thunk.
    const handleFileChange = async (info: any) => {
        const { file } = info;
        if (
            file.status === 'done' ||
            file.status === 'uploading' ||
            file.status === 'error'
        ) {
            if (selectedStore === 'indexeddb') {
                setLoading(true);
/*                 flushSync(() => {
                    setConsoleMessages(["Parsing..."]);
                }); */
                const fileObj = file.originFileObj as File;
                try {
                    // Dispatch the thunk. The thunk extracts the project name,
                    // removes any trailing ".bm2", appends a timestamp, and ingests the file.
                    const uniqueDBName = await dispatch(processFileThunk(fileObj)).unwrap();
 /*                    flushSync(() => {
                        setConsoleMessages(prev => [...prev, "Parsing complete.", "Finished."]);
                    }) */;
                    //setIsFinished(true);
                    message.success(`File successfully ingested into IndexedDB! Database name: ${uniqueDBName}`);
                } catch (err: any) {
                    console.error('Error processing file:', err);
                    message.error('Error processing file.');
                }
                setLoading(false);
            } else {
                message.error('Only IndexedDB is available at this time.');
            }
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
            <Content style={{ maxWidth: 600, margin: 'auto', padding: '2rem' }}>
                <Title level={2}>Initialize Project</Title>
                <Paragraph>
                    To get started, please choose a data store and upload your BMD Express JSON file.
                </Paragraph>
                <Radio.Group onChange={handleStoreChange} value={selectedStore}>
                    <Radio value="indexeddb">Local Browser Sandbox (IndexedDB)</Radio>
                    <Radio value="remote" disabled>Remote API (Unavailable)</Radio>
                    <Radio value="mysql" disabled>mySQL (Unavailable)</Radio>
                    <Radio value="mongodb" disabled>MongoDB (Unavailable)</Radio>
                </Radio.Group>
                <br /><br />
                <Card title="File Upload Instructions" bordered={false}>
                    <Paragraph>
                        Please select your project JSON file. The file will be ingested into the local IndexedDB.
                    </Paragraph>
                    <Upload
                        accept=".json"
                        beforeUpload={handleBeforeUpload}
                        showUploadList={false}
                        onChange={handleFileChange}
/*                         customRequest={({ file, onSuccess }) => {
                            setTimeout(() => { onSuccess && onSuccess("ok"); }, 0);
                        }} */
                    >
                        <Button icon={<UploadOutlined />} size="large" loading={loading}>
                            {loading ? "Uploading..." : "Click to Upload"}
                        </Button>
                    </Upload>
                </Card>
            </Content>
{/*             {consoleMessages.length > 0 && (
                <div style={TerminalOverlayStyle}>
                    {consoleMessages.map((msg, index) => (
                        <p key={index} style={{ margin: '0.2rem 0' }}>{msg}</p>
                    ))}
                    {isFinished && (
                        <Button
                            type="primary"
                            onClick={() => setConsoleMessages([])}
                            style={{ marginTop: '1rem' }}
                        >
                            Dismiss
                        </Button>
                    )}
                </div>
            )} */}
        </Layout>
    );
};

export default InitializeProject;