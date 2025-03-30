// src/components/AccumulationDetails.tsx

import React, { useEffect, useState } from 'react';
import { Table, Spin, Typography } from 'antd';
import { useRunHierarchicalClusteringQuery } from '../store/api/pyodideClusteringApi';
import * as Bokeh from '@bokeh/bokehjs';

const { Title, Text } = Typography;

export interface AccumulationResult {

}

interface AccumulationDetailsProps {
    // rowData is the raw data to cluster.
    rowData: any[];
    method?: string;
    numClusters?: number;
}

const AccumulationDetails: React.FC<AccumulationDetailsProps> = ({
    rowData,
}) => {

useEffect(() => {
    const [bokehLayout, setBokehLayout] = useState<AccumulationResult[]>([]);

    
})

    return {};
}

export AccumulationDetails;