// src/main.ts or within a UI handler
import { createDataSource } from './data/dataSourceFactory';
import { StorageType, RemoteConfig } from './data/stores'
import { ProjectService } from './services/ProjectService';

// This function is called when the user selects their storage option
function onUserSelectStorage(storageType: StorageType, remoteConfig?: RemoteConfig) {
    try {
        const dataSource = createDataSource(storageType, remoteConfig);
        const projectService = new ProjectService(dataSource);

        // Now the ProjectService is configured based on the user's choice.
        projectService.getProjects().then(projects => {
            //console.log('Projects:', projects);
            // Update your UI accordingly
        });
    } catch (error) {
        console.error('Error setting up data source:', error);
        // Display an error message to the user if necessary
    }
}

// Example calls:
// For IndexedDB (no extra config required)
onUserSelectStorage('indexeddb');

// For Remote storage (user provides configuration via UI)
onUserSelectStorage('remote', { apiUrl: 'https://api.example.com', token: 'user-token-optional' });