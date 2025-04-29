// src/components/analysis/AnalysisControls.tsx
import React from 'react';
import {
    Button,
    Input,
    Select,
    Space,
    Typography,
    Row,
    Col,
    Divider,
    Card
} from 'antd';
import {
    CopyOutlined,
    DownloadOutlined,
    ExperimentOutlined, // Example icon for enrichment
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

interface AnalysisControlsProps {
    // Export related props
    isExportDisabled: boolean;
    onCopy: () => void;
    onExport: () => void;

    // Enrichment related props
    enrichmentInputValue: string;
    onEnrichmentInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    enrichmentDropdownValue: string | undefined;
    onEnrichmentDropdownChange: (value: string) => void;
    onEnrichmentSubmit: () => void; // Callback for the submit button
    isEnrichmentSubmitDisabled?: boolean; // Optional: disable state for submit
}

const AnalysisControls: React.FC<AnalysisControlsProps> = React.memo(
    ({
        isExportDisabled,
        onCopy,
        onExport,
        enrichmentInputValue,
        onEnrichmentInputChange,
        enrichmentDropdownValue,
        onEnrichmentDropdownChange,
        onEnrichmentSubmit,
        isEnrichmentSubmitDisabled = false, // Default to enabled
    }) => {
        return (
            <Card size="small" style={{ marginBottom: '16px' }}>
                <Row gutter={[16, 8]} align="bottom">
                    {/* Section 1: Export Controls */}
                    <Col xs={24} md={10} lg={8}>
                        <Space direction="vertical" size="small">
                            <Text strong>Export Scatter Plot Data</Text>
                            <Space>
                                <Button
                                    icon={<CopyOutlined />}
                                    onClick={onCopy}
                                    disabled={isExportDisabled}
                                    size="small"
                                >
                                    Copy TSV
                                </Button>
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={onExport}
                                    disabled={isExportDisabled}
                                    size="small"
                                >
                                    Export TSV
                                </Button>
                            </Space>
                        </Space>
                    </Col>

                    {/* Optional Divider */}
                    {/* <Col xs={0} md={1} style={{ textAlign: 'center' }}>
            <Divider type="vertical" style={{ height: '100%' }} />
          </Col> */}

                    {/* Section 2: Enrichment Analysis Config */}
                    <Col xs={24} md={14} lg={16}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <Text strong>Gene Enrichment Analysis</Text>
                            <Space wrap>
                                <Space>
                                    <Text>Genes:</Text>
                                    <Input
                                        placeholder="Enter gene list..."
                                        value={enrichmentInputValue}
                                        onChange={onEnrichmentInputChange}
                                        style={{ width: 200 }}
                                        size="small"
                                    />
                                </Space>
                                <Space>
                                    <Text>Background:</Text>
                                    <Select
                                        placeholder="Select background..."
                                        value={enrichmentDropdownValue}
                                        onChange={onEnrichmentDropdownChange}
                                        style={{ width: 200 }}
                                        size="small"
                                        allowClear
                                    >
                                        {/* Replace with actual background options */}
                                        <Option value="genome">Whole Genome</Option>
                                        <Option value="platform">Array Platform</Option>
                                        <Option value="custom">Custom List</Option>
                                    </Select>
                                </Space>
                                <Button
                                    type="primary"
                                    icon={<ExperimentOutlined />}
                                    onClick={onEnrichmentSubmit}
                                    disabled={isEnrichmentSubmitDisabled}
                                    size="small"
                                >
                                    Run Enrichment
                                </Button>
                            </Space>
                        </Space>
                    </Col>
                </Row>
            </Card>
        );
    }
);

export default AnalysisControls;
