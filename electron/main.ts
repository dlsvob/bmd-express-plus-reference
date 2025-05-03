// electron/main.ts
import { app, protocol, BrowserWindow } from 'electron'; // <<< Import 'protocol'
import path from 'node:path';
// pathToFileURL is no longer needed for this approach
// import { pathToFileURL } from 'node:url';

// Handle Squirrel Startup Events first
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (require('electron-squirrel-startup')) {
    console.log('[Electron Main] Squirrel startup event detected, quitting.');
    app.quit();
} else {
    // --- Main Application Logic Starts Here ---

    console.log('[Electron Main] Script starting execution...');

    // The built directory structure calculation
    // __dirname points to /dist-electron folder in packaged app (usually inside resources/app.asar)
    process.env.DIST = path.join(__dirname, '../dist'); // Path to renderer's production build files
    process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
      ? path.join(process.env.DIST, '../public') // Path to public assets in dev
      : process.env.DIST; // In prod, maybe public assets are copied to dist root? Adjust if needed.

    let mainWindow: BrowserWindow | null;
    const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

    // Define safe paths using variables from imports and process.env
    // safeDistPath is crucial for the custom protocol
    const safeDistPath = process.env.DIST || path.join(__dirname, '../dist');
    const safePublicPath = process.env.VITE_PUBLIC || safeDistPath; // Used for icon

    console.log(`[Electron Main] Calculated DIST path: ${safeDistPath}`);
    console.log(`[Electron Main] VITE_DEV_SERVER_URL from env: ${VITE_DEV_SERVER_URL}`);

    function createWindow() {
      console.log('[Electron Main] createWindow() called.');
      mainWindow = new BrowserWindow({
        icon: path.join(safePublicPath, 'electron-vite.svg'), // Adjust icon name/path if needed
        width: 1200,
        height: 800,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'), // Path relative to main.cjs
          // Keeping defaults: nodeIntegration: false, contextIsolation: true
        },
      });
      console.log(`[Electron Main] Preload path configured: ${path.join(__dirname, 'preload.js')}`);
      console.log('[Electron Main] BrowserWindow created instance.');

      mainWindow.on('closed', () => {
        console.log('[Electron Main] MainWindow "closed" event triggered.');
        mainWindow = null;
      });

      if (VITE_DEV_SERVER_URL) {
        // --- Development ---
        console.log(`[Electron Main] Attempting to load URL: ${VITE_DEV_SERVER_URL}`);
        mainWindow.loadURL(VITE_DEV_SERVER_URL).then(() => {
           console.log(`[Electron Main] Successfully loaded URL: ${VITE_DEV_SERVER_URL}`);
        }).catch(err => {
           console.error(`[Electron Main] !!! FAILED to load URL ${VITE_DEV_SERVER_URL}:`, err);
        });
        console.log('[Electron Main] loadURL called (dev mode).');
      } else {
        // --- Production ---
        const indexPath = path.join(safeDistPath, 'index.html');
        console.log(`[Electron Main] Attempting to load file: ${indexPath}`);
        // Use loadFile for the initial HTML entry point in production
        mainWindow.loadFile(indexPath).then(() => { // <<< Use loadFile here
           console.log(`[Electron Main] Successfully loaded file: ${indexPath}`);
        }).catch(err => {
           console.error(`[Electron Main] !!! FAILED to load file ${indexPath}:`, err);
        });
        console.log('[Electron Main] loadFile called (production mode).');
      }
    }

    // --- App Lifecycle ---
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        console.log('[Electron Main] Quitting app (non-darwin).');
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        console.log('[Electron Main] "activate" event triggered, creating window.');
        createWindow();
      }
    });

    // --- Register custom protocol AFTER app ready, BEFORE creating window ---
    app.whenReady().then(() => {
        console.log('[Electron Main] App ready. Registering "app://" protocol...');

        protocol.registerFileProtocol('app', (request, callback) => {
            // Strip 'app://' and './' or '/' prefix
            let relativePath = request.url.slice('app://'.length).replace(/^\.?\//, '');
            // Construct absolute path to the asset inside the packaged 'dist' folder
            const filePath = path.join(safeDistPath, relativePath);

            console.log(`[Protocol app://] Resolving ${request.url} to ${filePath}`);
            // Provide the absolute file path back to Electron
            callback({ path: filePath });
        });

        console.log('[Electron Main] Creating window after protocol registration...');
        createWindow(); // Create window AFTER protocol is ready
    }).catch(e => {
        console.error('[Electron Main] !!! app.whenReady() FAILED:', e);
    });

    console.log('[Electron Main] Main process script finished synchronous execution.');

} // Close the else block from the squirrel check