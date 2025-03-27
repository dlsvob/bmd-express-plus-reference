// src/components/WelcomePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Button } from 'antd';
//import logo from '../assets/logo.png';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const WelcomePage: React.FC = () => {
    const navigate = useNavigate();

    const handleInitializeProject = () => {
        navigate('/initialize');
    };

    const handleAnalyzeProject = () => {
        navigate('/analyze');
    };

    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
            <Content style={{ padding: '2rem', textAlign: 'center' }}>
{/*                 <img
                    src={logo}
                    alt="BMD Express...Plus! Logo"
                    style={{ width: '150px', marginBottom: '1rem' }}
                /> */}
                <Title>BMD Express...Plus!</Title>
                <Paragraph>
                    Welcome to BMD Express...Plus! Please choose an option to get started:
                </Paragraph>
                <Button
                    type="primary"
                    size="large"
                    style={{ marginRight: '1rem' }}
                    onClick={handleInitializeProject}
                >
                    Initialize Project
                </Button>
                <Button size="large" onClick={handleAnalyzeProject}>
                    Analyze Project
                </Button>
            </Content>
        </Layout>
    );
};

export default WelcomePage;