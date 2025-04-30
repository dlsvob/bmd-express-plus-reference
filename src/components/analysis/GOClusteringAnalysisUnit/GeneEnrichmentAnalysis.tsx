import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Spin, Alert, Row, Col, Card, Typography } from 'antd';
import Plot from 'react-plotly.js';
import cytoscape from 'cytoscape';
import type { Core,  NodeDefinition, EdgeDefinition, LayoutOptions, ElementsDefinition, } from 'cytoscape';
import type { Data, Layout } from 'plotly.js';
import { useEnrichrAnalysis } from '../../../hooks/useEnrichrAnalysis';
import { EnrichmentTerm } from '../../../store/apis/enrichrApi';

const { Title, Text } = Typography;

interface GeneEnrichmentAnalysisProps {
  geneList: string[];
  backgroundType: string;
  analysisName: string; // Name of the source analysis/cluster for context
  triggerRun: boolean; // A flag to indicate when to start the analysis
  maxNodesToShow: number; // Max terms/nodes for visualization
}

const GeneEnrichmentAnalysis: React.FC<GeneEnrichmentAnalysisProps> = ({
  geneList,
  backgroundType,
  analysisName,
  triggerRun,
  maxNodesToShow,
}) => {
  const logPrefix = `[GeneEnrichmentAnalysis ${analysisName}]`;
  const cyInstanceRef = useRef<Core | null>(null); // Use Core type
  const [cyContainer, setCyContainer] = useState<HTMLDivElement | null>(null);

  console.log(`${logPrefix} Rendering/Re-rendering. Props:`, {
    geneListLength: geneList?.length,
    backgroundType,
    triggerRun,
    maxNodesToShow,
    isContainerReady: !!cyContainer,
  });

  const cyContainerCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      console.log(
        `${logPrefix} cyContainerCallbackRef called. Node is null? ${!node}`
      );
      if (node !== null) {
        setCyContainer(node);
      } else {
        setCyContainer(null);
      }
    },
    [logPrefix]
  );

  const {
    results: enrichmentResults,
    isLoading,
    error,
    userListId,
  } = useEnrichrAnalysis({
    geneList: triggerRun ? geneList : null,
    description: `Enrichment for ${analysisName}`,
    backgroundType: triggerRun ? backgroundType : null,
    shouldRun: triggerRun,
  });

  useEffect(() => {
    console.log(`${logPrefix} Hook state update:`, {
      isLoading,
      error,
      hasResults: !!enrichmentResults,
      userListId,
    });
  }, [isLoading, error, enrichmentResults, userListId, logPrefix]);

  // Bar Chart Data & Layout
  const barChartData = useMemo((): Data[] | null => {
    console.log(
      `${logPrefix} Recalculating barChartData. Has results: ${!!enrichmentResults}`
    );
    if (
      !enrichmentResults ||
      !backgroundType ||
      !enrichmentResults[backgroundType]
    ) {
      console.log(
        `${logPrefix} barChartData: No results or background type mismatch.`
      );
      return null;
    }
    try {
      const termsData = enrichmentResults[backgroundType];
      const sortedTerms = [...termsData].sort((a, b) => a[2] - b[2]); // Sort by p-value ascending
      const topTerms = sortedTerms.slice(0, maxNodesToShow);
      if (topTerms.length === 0) {
        console.log(
          `${logPrefix} barChartData: No top terms found after slicing.`
        );
        return null;
      }
      const terms = topTerms.map((entry) => entry[1]);
      const pValues = topTerms.map((entry) => -Math.log10(entry[2]));
      const trace: Data = {
        x: pValues,
        y: terms,
        type: 'bar',
        orientation: 'h',
        marker: {
          color: 'rgba(58, 71, 80, 0.6)',
          line: { color: 'rgba(58, 71, 80, 1.0)', width: 1 },
        },
      };
      console.log(
        `${logPrefix} barChartData: Successfully created trace for ${topTerms.length} terms.`
      );
      return [trace];
    } catch (e) {
      console.error(`${logPrefix} Error processing bar chart data:`, e);
      return null;
    }
  }, [enrichmentResults, backgroundType, maxNodesToShow, logPrefix]);

  const barChartLayout = useMemo((): Partial<Layout> => {
    console.log(`${logPrefix} Recalculating barChartLayout.`);
    return {
      title: `Top ${maxNodesToShow} Enriched Terms (-log10 P-value)`,
      xaxis: { title: '-log10(P-value)', autorange: true },
      yaxis: { automargin: true, autorange: 'reversed' },
      margin: { l: 50, r: 20, t: 50, b: 40 },
      height: Math.max(400, maxNodesToShow * 20),
      autosize: true,
    };
  }, [maxNodesToShow, logPrefix]);

  // --- Memoize Cytoscape Elements ---
  // --- Explicitly type the return value as ElementsDefinition | null ---
  const cyElements = useMemo((): ElementsDefinition | null => {
    console.log(
      `${logPrefix} Recalculating cyElements. Has results: ${!!enrichmentResults}`
    );
    if (
      !enrichmentResults ||
      !backgroundType ||
      !enrichmentResults[backgroundType]
    ) {
      console.log(
        `${logPrefix} cyElements: No results or background type mismatch.`
      );
      return null;
    }
    try {
      const termsData = enrichmentResults[backgroundType];
      const sortedTerms = [...termsData].sort((a, b) => a[2] - b[2]);
      const topTerms = sortedTerms.slice(0, maxNodesToShow);
      if (topTerms.length === 0) {
        console.log(
          `${logPrefix} cyElements: No top terms found after slicing.`
        );
        return null;
      }
      // --- FIX: Use specific NodeDefinition and EdgeDefinition types ---
      const nodes: NodeDefinition[] = [];
      const edges: EdgeDefinition[] = [];
      // -------------------------------------------------------------
      const addedElements = new Set<string>();

      topTerms.forEach((term: EnrichmentTerm) => {
        const termName = term[1];
        const termId = `term-${termName}`;
        const genes = term[5];
        if (!addedElements.has(termId)) {
          nodes.push({ data: { id: termId, name: termName, type: 'term' } });
          addedElements.add(termId);
        }
        genes.forEach((gene: string) => {
          const geneId = `gene-${gene}`;
          if (!addedElements.has(geneId)) {
            nodes.push({ data: { id: geneId, name: gene, type: 'gene' } });
            addedElements.add(geneId);
          }
          // --- Ensure edge data matches EdgeDataDefinition ---
          edges.push({
            data: { id: `edge-${geneId}-${termId}`, source: geneId, target: termId },
          });
          // -------------------------------------------------------
        });
      });
      console.log(
        `${logPrefix} cyElements: Successfully created ${nodes.length} nodes and ${edges.length} edges.`
      );
      // --- Return the object matching ElementsDefinition ---
      return { nodes, edges };
    } catch (e) {
      console.error(`${logPrefix} Error processing cytoscape data:`, e);
      return null;
    }
  }, [enrichmentResults, backgroundType, maxNodesToShow, logPrefix]);

  // --- Effect to Initialize/Update Cytoscape ---
  useEffect(() => {
    console.log(
      `${logPrefix} Cytoscape Effect running. Has elements: ${!!cyElements}, Is container ready (state): ${!!cyContainer}`
    );

    if (cyElements && cyContainer) {
      console.log(
        `${logPrefix} Initializing Cytoscape instance in container (Callback Ref Ready).`
      );

      const previousInstance = cyInstanceRef.current;

      try {
        cyInstanceRef.current = cytoscape({
          container: cyContainer,
          // --- Pass cyElements directly ---
          elements: cyElements, // Type should match ElementsDefinition
          style: [
            {
              selector: 'node[type="term"]',
              style: {
                label: 'data(name)',
                width: 20,
                height: 20,
                'background-color': '#0074D9',
                color: '#000',
                'font-size': '10px',
                'text-valign': 'center',
                'text-halign': 'center',
                'text-wrap': 'wrap',
                'text-max-width': '80px',
              },
            },
            {
              selector: 'node[type="gene"]',
              style: {
                label: 'data(name)',
                width: 10,
                height: 10,
                'background-color': '#2ECC40',
                color: '#000',
                'font-size': '8px',
                'text-valign': 'center',
                'text-halign': 'center',
              },
            },
            {
              selector: 'edge',
              style: {
                width: 1,
                'line-color': '#ccc',
                'curve-style': 'bezier',
              },
            },
          ],
          // --- Wrap numeric layout options in functions ---
          layout: {
            name: 'cose',
            idealEdgeLength: () => 80,
            nodeOverlap: 10,
            padding: 20,
            animate: false,
          } as LayoutOptions,
        });
        console.log(
          `${logPrefix} Cytoscape instance created (Callback Ref Ready).`
        );

        if (previousInstance) {
          console.log(
            `${logPrefix} Destroying previous Cytoscape instance.`
          );
          previousInstance.destroy();
        }
      } catch (e) {
        console.error(
          `${logPrefix} Cytoscape initialization failed (Callback Ref):`,
          e
        );
        cyInstanceRef.current = null;
        if (previousInstance) {
          console.log(
            `${logPrefix} Destroying previous Cytoscape instance after init failure.`
          );
          previousInstance.destroy();
        }
      }
    } else {
      console.log(
        `${logPrefix} Cytoscape Effect: Skipping initialization (no elements or container not ready).`
      );
      if (!cyElements && cyInstanceRef.current) {
        console.log(
          `${logPrefix} Destroying existing Cytoscape instance because elements are null.`
        );
        cyInstanceRef.current.destroy();
        cyInstanceRef.current = null;
      }
    }

    return () => {
      const instanceToDestroy = cyInstanceRef.current;
      console.log(
        `${logPrefix} Cytoscape Effect cleanup function executing. Instance to destroy exists? ${!!instanceToDestroy}`
      );
      if (instanceToDestroy) {
        console.log(
          `${logPrefix} Cleaning up Cytoscape instance on effect cleanup.`
        );
        instanceToDestroy.destroy();
      }
    };
  }, [cyElements, cyContainer, logPrefix]);

  // --- Render Logic ---
  console.log(`${logPrefix} Determining render output. State:`, {
    isLoading,
    error,
    hasResults: !!enrichmentResults,
  });
  if (!triggerRun) {
    return (
      <Card title="Gene Enrichment Analysis">
        <Text type="secondary">
          Select a cluster and background, then click &quot;Run
          Enrichment&quot;.
        </Text>
      </Card>
    );
  }

  const spinTip = isLoading ? <>Running enrichment analysis...</> : undefined;

  if (isLoading) {
    return (
      <Card title={`Gene Enrichment for ${analysisName}`}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin tip={spinTip} />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title={`Gene Enrichment for ${analysisName}`}>
        <Alert
          message="Enrichment Error"
          description={error}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  if (
    !enrichmentResults ||
    !enrichmentResults[backgroundType] ||
    enrichmentResults[backgroundType].length === 0
  ) {
    return (
      <Card title={`Gene Enrichment for ${analysisName}`}>
        <Text>No enrichment results found for {backgroundType}.</Text>
      </Card>
    );
  }

  return (
    <Card title={`Gene Enrichment for ${analysisName} (${backgroundType})`}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={10}>
          <Title level={5}>Top Enriched Terms</Title>
          {barChartData ? (
            <Plot
              data={barChartData}
              layout={barChartLayout}
              style={{ width: '100%', minHeight: '400px' }}
              useResizeHandler={true}
              config={{ responsive: true, displaylogo: false }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Text>No data available for bar chart.</Text>
            </div>
          )}
        </Col>
        <Col xs={24} md={14}>
          <Title level={5}>Gene-Term Network</Title>
          <div
            ref={cyContainerCallbackRef}
            style={{
              width: '100%',
              height: '500px',
              border: '1px solid #d9d9d9',
              position: 'relative',
              backgroundColor: '#f9f9f9',
            }}
          >
            {(!cyElements || cyElements.nodes.length === 0) &&
              !isLoading &&
              !error && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: 'grey',
                  }}
                >
                  {cyElements
                    ? 'No nodes to display.'
                    : 'Preparing network data...'}
                </div>
              )}
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default GeneEnrichmentAnalysis;
