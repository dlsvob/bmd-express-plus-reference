// src/components/PyodideErrorNotifier.tsx
import React, { useState, useEffect, useContext } from 'react';
import { Modal, Button, Alert } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { PyodideContext } from '../../contexts/PyodideProvider'; // Keep import for useContext

const PyodideErrorNotifier: React.FC = () => {
    // --- Safely access context ---
    const pyodideCtx = useContext(PyodideContext);
    // Provide default values if context is undefined
    const isLoading = pyodideCtx?.isLoading ?? false; // Default to false if no provider
    const error = pyodideCtx?.error ?? null;         // Default to null if no provider
    // -----------------------------

    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        // Only show modal if context exists, is not loading, and has an error
        if (pyodideCtx && !isLoading && error) {
            console.log("PyodideErrorNotifier: Detected Pyodide Initialization Error.", error);
            setIsModalVisible(true);
        } else {
            // Ensure modal is hidden if context is missing or no error
            setIsModalVisible(false);
        }
        // Depend on the context object itself, isLoading, and error
    }, [pyodideCtx, isLoading, error]);

    const handleModalClose = () => {
        setIsModalVisible(false);
    };

    const handleReload = () => {
        window.location.reload();
    };

    // --- Don't render anything if context is missing or no error ---
    if (!pyodideCtx || !error || !isModalVisible) {
        return null;
    }
    // -------------------------------------------------------------

    // Modal rendering logic remains the same, but will only run if error exists
    return (
        <Modal
            title={
                <span>
                    <ExclamationCircleFilled style={{ color: '#ff4d4f', marginRight: '8px' }} />
                    Pyodide Initialization Failed
                </span>
            }
            open={isModalVisible}
            onCancel={handleModalClose}
            maskClosable={true}
            keyboard={true}
            footer={[
                <Button key="reload" onClick={handleReload}>
                    Reload Page
                </Button>,
                <Button key="ok" type="primary" onClick={handleModalClose}>
                    OK
                </Button>,
            ]}
        >
            <p>The core Python scientific environment (Pyodide) could not be initialized.</p>
            <p>Some features requiring Python execution will be unavailable.</p>
            <p>You can try reloading the page. If the problem persists, please report the following error:</p>
            <Alert
                message={error?.message || 'An unknown error occurred.'} // error is guaranteed to exist here
                type="error"
                style={{ maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '10px' }}
            />
        </Modal>
    );
};

export default PyodideErrorNotifier;
