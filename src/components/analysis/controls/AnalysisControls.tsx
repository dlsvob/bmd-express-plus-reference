// src/components/analysis/AnalysisControls.tsx
import React from 'react';
import { Button, InputNumber, Select, Space, Typography, Row, Col, Card, Tooltip } from 'antd';
import { CopyOutlined, DownloadOutlined, ExperimentOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

interface ClusterOption {
    value: string; // Cluster ID (as string)
    label: string; // Text to display (e.g., "Cluster 1")
}

interface AnalysisControlsProps {
    // Export-related props
    isExportDisabled: boolean;
    onCopy: () => void;
    onExport: () => void;

    // --- Enrichment related props (Managed by parent) ---
    // Network Nodes Input
    networkNodesCount: number;
    onNetworkNodesCountChange: (value: number | null) => void;

    // Cluster Selection Dropdown
    availableClusterOptions: ClusterOption[]; // Options for the dropdown
    selectedClusterForEnrichment: string | null;
    onClusterForEnrichmentChange: (value: string | null) => void;

    enrichmentBackgroundValue: string | undefined;
    onEnrichmentBackgroundChange: (value: string) => void;

    onEnrichmentSubmit: () => void;
    isEnrichmentSubmitDisabled?: boolean;
}

const AnalysisControls: React.FC<AnalysisControlsProps> = React.memo(
    ({
        isExportDisabled,
        onCopy,
        onExport,
        networkNodesCount,
        onNetworkNodesCountChange,
        availableClusterOptions,
        selectedClusterForEnrichment,
        onClusterForEnrichmentChange,
        enrichmentBackgroundValue,
        onEnrichmentBackgroundChange,
        onEnrichmentSubmit,
        isEnrichmentSubmitDisabled = false,
    }) => {
        const isSubmitDisabledInternally =
            !selectedClusterForEnrichment || !enrichmentBackgroundValue;

        const enrichmentButtonTooltip = !selectedClusterForEnrichment
            ? 'Select a cluster to submit'
            : !enrichmentBackgroundValue
                ? 'Select a background gene set'
                : ''; // No tooltip if enabled

        return (
            <Card size="small" style={{ marginBottom: '16px' }}>
                <Row gutter={[16, 8]} align="bottom">
                    {/* Section 1: Export Controls */}
                    <Col xs={24} md={10} lg={8}>
                        {/* ... export buttons ... */}
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

                    {/* Section 2: Enrichment Analysis Config (UPDATED) */}
                    <Col xs={24} md={14} lg={16}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <Text strong>Gene Enrichment Analysis</Text>
                            <Space wrap>
                                {/* Input for Network Nodes Count */}
                                <Space>
                                    <Text>Number of Network Source Nodes:</Text>
                                    <InputNumber
                                        min={1}
                                        max={50}
                                        value={networkNodesCount}
                                        onChange={onNetworkNodesCountChange}
                                        size="small"
                                        style={{ width: 70 }}
                                    />
                                </Space>

                                {/* Dropdown for Cluster Selection */}
                                <Space>
                                    <Text>Submit Genes for Cluster:</Text>
                                    <Select
                                        placeholder="Select Cluster..."
                                        value={selectedClusterForEnrichment}
                                        onChange={onClusterForEnrichmentChange}
                                        options={availableClusterOptions} // Use options from props
                                        style={{ width: 150 }}
                                        size="small"
                                        allowClear
                                        disabled={availableClusterOptions.length === 0} // Disable if no clusters
                                    />
                                </Space>

                                {/* Dropdown for Enrichment Background Selection */}
                                <Space>
                                    <Text>Background:</Text>
                                    <Select
                                        placeholder="Select background..."
                                        value={enrichmentBackgroundValue}
                                        onChange={onEnrichmentBackgroundChange}
                                        style={{ width: 200 }}
                                        size="small"
                                        allowClear
                                    >
                                        <Option value="GO_Biological_Process_2023">
                                            GO Biological Process 2023
                                        </Option>
                                        <Option value="KEGG_2021_Human">KEGG 2021 Human</Option>
                                        <Option value="Reactome_2022">Reactome 2022</Option>
                                        <Option value="MSigDB_Hallmark_2020">
                                            MSigDB Hallmark 2020
                                        </Option>
                                        {/* Add more relevant options */}
                                    </Select>
                                </Space>

                                {/* Submit Button */}
                                <Tooltip title={enrichmentButtonTooltip}>
                                    <span>
                                        <Button
                                            type="primary"
                                            icon={<ExperimentOutlined />}
                                            onClick={onEnrichmentSubmit}
                                            disabled={
                                                isEnrichmentSubmitDisabled || isSubmitDisabledInternally
                                            } // Combine parent disable flag with internal check
                                            size="small"
                                        >
                                            Run Enrichment
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Space>
                        </Space>
                    </Col>
                </Row>
            </Card>
        );
    }
);

AnalysisControls.displayName = 'Analysis Controls';
export default AnalysisControls;
