// src/components/layout/AppSidebar.tsx
import React from 'react';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { ExperimentOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveView, selectCurrentView } from '../../store/slices/navigationSlice';

const { Sider } = Layout;

type AppViewKey = 'experiments' | 'categoryAnalysis' | 'settings' | string;

interface AppSidebarProps {
    projectSelected: boolean;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ projectSelected }) => {
    const dispatch = useAppDispatch();
    const currentViewKey = useAppSelector(selectCurrentView);

    const items: MenuProps['items'] = [
        {
            key: 'experiments',
            icon: <ExperimentOutlined />,
            label: 'Experiments',
        },
        {
            key: 'analysis',
            label: 'Analysis',
            icon: <BarChartOutlined />,
            children: [
                {
                    key: 'categoryAnalysis',
                    label: 'Category Analysis',
                },
                // Add other analysis types here if needed
            ],
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Project Settings',
        },
    ];

    const handleMenuClick: MenuProps['onClick'] = (e) => {
        // Only dispatch if the menu is actually enabled (project is selected)
        if (projectSelected) {
            console.log('Sidebar menu clicked:', e.key);
            dispatch(setActiveView(e.key as AppViewKey));
        }
    };

    return (
        <Sider width={200} theme="light" collapsible={false}>
            <Menu
                mode="inline"
                selectedKeys={currentViewKey ? [currentViewKey] : []}
                style={{ height: '100%', borderRight: 0 }}
                items={items}
                onClick={handleMenuClick}
                // --- Disable the entire menu if no project is selected ---
                disabled={!projectSelected}
            // ---------------------------------------------------------
            />
        </Sider>
    );
};

export default AppSidebar;
