import { Spin } from 'antd';

export const LoadingSpinner: React.FC = () => (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Spin tip="Loading experiments...">
            <div style={{ height: '100px', lineHeight: '100px' }}>
                &nbsp;
            </div>
        </Spin>
    </div>
);
