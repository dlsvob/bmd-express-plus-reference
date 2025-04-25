// src/components/layout/AppSidebar.tsx
import React from 'react';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd'; // Import MenuProps type
// Import icons you want to use
import { ExperimentOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
// Import actions/selectors for navigation state
import { setActiveView, selectCurrentView } from '../../store/slices/navigationSlice.ts'


const { Sider } = Layout;

// Define the type for your view keys if you haven't already
type AppViewKey = 'experiments' | 'categoryAnalysis' | 'settings' | string; // Add other keys as needed

const AppSidebar: React.FC = () => {
    const dispatch = useAppDispatch();
    // Get the current active view key from Redux state to highlight the correct item
    const currentViewKey = useAppSelector(selectCurrentView);

    // Define Menu items using the 'items' prop structure
    const items: MenuProps['items'] = [
        {
            key: 'experiments', // Matches the value dispatched by setActiveView
            icon: <ExperimentOutlined />,
            label: 'Experiments',
        },
        {
            key: 'analysis', // Key for the submenu itself (optional if not clickable)
            label: 'Analysis',
            icon: <BarChartOutlined />,
            children: [
                {
                    key: 'categoryAnalysis', // Matches the value dispatched by setActiveView
                    label: 'Category Analysis',
                },
                // Add other analysis types here if needed
            ],
        },
        {
            key: 'settings', // Matches the value dispatched by setActiveView
            icon: <SettingOutlined />,
            label: 'Project Settings',
        },
    ];

    // Handle menu item clicks
    const handleMenuClick: MenuProps['onClick'] = (e) => {
        console.log('Sidebar menu clicked:', e.key);
        // Dispatch action to update the active view in Redux state
        // Ensure the payload type matches what your setActiveView action expects
        dispatch(setActiveView(e.key as AppViewKey)); // Cast key type if necessary
    };

    return (
        // Adjust width and other Sider props as needed
        <Sider width={200} theme="light" collapsible={false}>
            <Menu
                mode="inline"
                // Set the currently selected key based on Redux state
                selectedKeys={currentViewKey ? [currentViewKey] : []}
                // Default open keys for submenus (optional)
                // defaultOpenKeys={['analysis']}
                style={{ height: '100%', borderRight: 0 }}
                items={items} // Pass the items array here
                onClick={handleMenuClick} // Handle clicks
            />
        </Sider>
    );
};

export default AppSidebar;