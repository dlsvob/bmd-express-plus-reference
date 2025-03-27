import React from 'react';
import { Card, Typography } from 'antd';
import { Experiment } from '../models/Experiment';
import DomainCard from './DomainCard';
import { IDBPDatabase } from 'idb';
import { ProjectDB } from '../utils/myIDB';

const { Title } = Typography;

interface ExperimentCardProps {
    experiment: Experiment;
    db: IDBPDatabase<ProjectDB> | null;
}

const ExperimentCard: React.FC<ExperimentCardProps> = ({ experiment, db }) => {
    // Assume each experiment always has these domains
    const domains = ['Category Analysis'];

    return (
        <Card style={{ marginBottom: '2rem' }}>
            <Title level={4}>{experiment.name}</Title>
            {domains.map(domain => (
                <DomainCard key={domain} domain={domain} experimentName={experiment.name} db={db} />
            ))}
        </Card>
    );
};

export default ExperimentCard;