// src/components/analysis/controls/AnalysisControls.tsx
// Full listing - Verify against your working version before this change.
import React from 'react';
import {
    Button,
    InputNumber,
    Select,
    Space,
    Typography,
    Row,
    Col,
    Card,
    Tooltip,
} from 'antd';
import {
    CopyOutlined,
    DownloadOutlined,
    ExperimentOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

interface ClusterOption {
    value: string;
    label: string;
}

interface AnalysisControlsProps {
    isExportDisabled: boolean;
    onCopy: () => void;
    onExport: () => void;
    networkNodesCount: number;
    onNetworkNodesCountChange: (value: number | null) => void;
    availableClusterOptions: ClusterOption[];
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
                : '';

        return (
            // Border removed here
            <Card size="small" style={{ marginBottom: '16px' }} bordered={false}>
                <Row gutter={[16, 8]} align="bottom">
                    {/* Section 1: Export Controls */}
                    <Col xs={24} md={10} lg={8}>
                        <Space direction="vertical" size="small">
                            <Text strong>Export Scatter Plot Data</Text>
                            <Space>
                                <Button icon={<CopyOutlined />} onClick={onCopy} disabled={isExportDisabled} size="small"> Copy TSV </Button>
                                <Button icon={<DownloadOutlined />} onClick={onExport} disabled={isExportDisabled} size="small"> Export TSV </Button>
                            </Space>
                        </Space>
                    </Col>

                    {/* Section 2: Enrichment Analysis Config */}
                    <Col xs={24} md={14} lg={16}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <Text strong>Gene Enrichment Analysis</Text>
                            <Space wrap>
                                <Space>
                                    <Text>Network Nodes:</Text>
                                    <InputNumber min={1} max={50} value={networkNodesCount} onChange={onNetworkNodesCountChange} size="small" style={{ width: 70 }} />
                                </Space>
                                <Space>
                                    <Text>Cluster:</Text>
                                    <Select placeholder="Select Cluster..." value={selectedClusterForEnrichment} onChange={onClusterForEnrichmentChange} options={availableClusterOptions} style={{ width: 150 }} size="small" allowClear disabled={availableClusterOptions.length === 0} />
                                </Space>
                                <Space>
                                    <Text>Background:</Text>
                                    <Select placeholder="Select background..." value={enrichmentBackgroundValue} onChange={onEnrichmentBackgroundChange} style={{ width: 200 }} size="small" allowClear >
                                        <Option value="GO_Biological_Process_2023"> GO Biological Process 2023 </Option>
                                        <Option value="KEGG_2021_Human">KEGG 2021 Human</Option>
                                        <Option value="Reactome_2022">Reactome 2022</Option>
                                        <Option value="MSigDB_Hallmark_2020"> MSigDB Hallmark 2020 </Option>
                                    </Select>
                                </Space>
                                <Tooltip title={enrichmentButtonTooltip}>
                                    <span>
                                        <Button type="primary" icon={<ExperimentOutlined />} onClick={onEnrichmentSubmit} disabled={isEnrichmentSubmitDisabled || isSubmitDisabledInternally} size="small" > Run Enrichment </Button>
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

export default AnalysisControls;
