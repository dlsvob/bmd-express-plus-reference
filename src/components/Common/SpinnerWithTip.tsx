import { Spin } from 'antd';

export const SpinnerWithTip: React.FC = () => (
    <div style={{ textAlign: 'center', padding: '2rem', minHeight: '50px' }}>
        <Spin tip="Loading experiments...">
            <div style={{ minHeight: '50px' }} />
        </Spin>
    </div>
);