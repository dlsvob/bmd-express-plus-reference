import React from 'react';
import { Collapse, Card } from 'antd';
import DomainDetails from './DomainDetails';
import { IDBPDatabase } from 'idb';
import { ProjectDB } from '../utils/myIDB';

const { Panel } = Collapse;

interface DomainCardProps {
    domain: string;
    experimentName: string;
    db: IDBPDatabase<ProjectDB> | null;
}

const DomainCard: React.FC<DomainCardProps> = ({ domain, experimentName, db }) => {
    return (
        <Collapse>
        <Panel header="Category Analysis" key="1">
        <Card title={domain} style={{ marginBottom: '1rem' }}>
            <DomainDetails domain={domain} experimentName={experimentName} db={db} />
        </Card>
        </Panel>
        </Collapse>
    );
};

export default DomainCard;