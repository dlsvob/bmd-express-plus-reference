// scripts/build-electron.js
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const distElectronDir = path.resolve(__dirname, '../dist-electron');
const mainJsPath = path.join(distElectronDir, 'main.js');
const mainCjsPath = path.join(distElectronDir, 'main.cjs');
const mainJsMapPath = mainJsPath + '.map';
const mainCjsMapPath = mainCjsPath + '.map';

try {
  console.log('Build Script: Ensuring dist-electron directory exists...');
  fs.mkdirSync(distElectronDir, { recursive: true });

  console.log('Build Script: Compiling electron/main.ts...');
  execSync('npx tsc electron/main.ts --outDir dist-electron --module CommonJS --target ES2020 --esModuleInterop true --skipLibCheck true --sourceMap true --types node,electron', { stdio: 'inherit' });

  console.log('Build Script: Compiling electron/preload.ts...');
  execSync('npx tsc electron/preload.ts --outDir dist-electron --module CommonJS --target ES2020 --esModuleInterop true --skipLibCheck true --sourceMap true --types node', { stdio: 'inherit' });

  // --- Rename main.js to main.cjs ---
  console.log(`Build Script: Checking for source: ${mainJsPath}`);
  const sourceExists = fs.existsSync(mainJsPath);
  console.log(`Build Script: Source exists? ${sourceExists}`);

  if (sourceExists) {
    console.log(`Build Script: Attempting rename: ${mainJsPath} -> ${mainCjsPath}`);
    try {
      fs.renameSync(mainJsPath, mainCjsPath); // Original rename attempt
      console.log(`Build Script: fs.renameSync successful.`);
      // Explicitly check if target exists NOW
      const targetExists = fs.existsSync(mainCjsPath);
      console.log(`Build Script: Target ${mainCjsPath} exists after rename? ${targetExists}`);
      if (!targetExists) {
           console.error(`Build Script ERROR: Target file missing immediately after rename!`);
           process.exit(1);
      }
      // Handle map file...
      const mapSourceExists = fs.existsSync(mainJsMapPath);
      if (mapSourceExists) {
          console.log(`Build Script: Renaming map file ${mainJsMapPath} -> ${mainCjsMapPath}`);
          fs.renameSync(mainJsMapPath, mainCjsMapPath);
      } else {
          console.log(`Build Script: Source map ${mainJsMapPath} not found, skipping map rename.`);
      }

    } catch (renameError) {
       console.error(`Build Script ERROR during fs.renameSync:`, renameError);
       process.exit(1);
    }
  } else {
    // Check if main.cjs already exists (maybe tsc outputted it directly?)
    if (fs.existsSync(mainCjsPath)) {
        console.log(`Build Script: ${mainCjsPath} already exists. Skipping rename.`);
    } else {
        console.error(`Build Script ERROR: Source file ${mainJsPath} not found! Cannot rename.`);
        process.exit(1); // Exit with error
    }
  }
  console.log("Build Script: Electron build steps completed successfully.");

} catch (error) { // Catch errors from tsc commands too
  console.error('Build Script Error:', error);
  process.exit(1);
}