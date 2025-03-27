// src/utils/pyodideContextInitializer.ts

// Import raw Python files using the ?raw query parameter.
// Adjust paths as needed for your project structure.
// @ts-ignore
/* import configCode from '../py/bokeh/config.py?raw';
// @ts-ignore
import utilsCode from '../py/bokeh/utils.py?raw';
// @ts-ignore
import dataFunctionsCode from '../py/bokeh/data_functions.py?raw';
// @ts-ignore
import documentSharedDataCode from '../py/bokeh/document_shared_data.py?raw';
// @ts-ignore
import stateCode from '../py/bokeh/state.py?raw'; */
// @ts-ignore
import categoryClusteringCode from '../py/categoryClustering.py?raw';
// @ts-ignore
/* import plottingCode from '../py/bokeh/plotting.py?raw';
// @ts-ignore
import browserStorageCode from '../py/browser_storage_init.py?raw';
// @ts-ignore
import referencePlotCode from '../py/bridge/reference_plot.py?raw'; */

function dedent(text: string): string {
    const lines = text.split("\n");
    while (lines.length && lines[0].trim() === "") {
        lines.shift();
    }
    const indentLengths = lines
        .filter(line => line.trim().length > 0)
        .map(line => {
            const match = line.match(/^(\s+)/);
            return match ? match[1].length : 0;
        });
    const minIndent = indentLengths.length ? Math.min(...indentLengths) : 0;
    return lines.map(line => line.substring(minIndent)).join("\n");
}

async function preloadStaticFile(remotePath: string, virtualPath: string): Promise<void> {
    console.log("Attempting to fetch:", remotePath);
    const response = await fetch(remotePath);
    if (!response.ok) {
        throw new Error(`Failed to load ${remotePath}`);
    }
    const content = await response.text();
    const lastSlashIndex = virtualPath.lastIndexOf("/");
    const dir = virtualPath.substring(0, lastSlashIndex);
    try {
        const result = window.pyodide.FS.analyzePath(dir);
        if (!result.exists) {
            window.pyodide.FS.mkdir(dir);
            console.log(`Created directory ${dir}`);
        }
    } catch (e) {
        window.pyodide.FS.mkdir(dir);
        console.log(`Created directory ${dir} (via catch)`);
    }
    window.pyodide.FS.writeFile(virtualPath, content);
    console.log(`Preloaded ${virtualPath} into Pyodide FS.`);
}

async function mountFolderFromEndpoint(remoteFolderPath: string, virtualFolderPath: string): Promise<void> {
    const endpoint = `/api/list-files?folder=${encodeURIComponent(remoteFolderPath.replace(/^\/+/, ''))}`;
    console.log("Fetching manifest from endpoint:", endpoint);
    const resp = await fetch(endpoint);
    if (!resp.ok) {
        throw new Error(`Failed to fetch manifest from ${endpoint}`);
    }
    const manifest = await resp.json();
    const fileNames: string[] = manifest.files;
    console.log(`Found files in ${remoteFolderPath}:`, fileNames);

    try {
        const result = window.pyodide.FS.analyzePath(virtualFolderPath);
        if (!result.exists) {
            window.pyodide.FS.mkdir(virtualFolderPath);
            console.log(`Created virtual folder ${virtualFolderPath}`);
        }
    } catch (e) {
        window.pyodide.FS.mkdir(virtualFolderPath);
        console.log(`Created virtual folder ${virtualFolderPath} (via catch)`);
    }

    for (const fileName of fileNames) {
        const remotePath = `${remoteFolderPath}/${fileName}`;
        const virtualPath = `${virtualFolderPath}/${fileName}`;
        await preloadStaticFile(remotePath, virtualPath);
    }
    console.log(`Mounted folder ${virtualFolderPath} from ${remoteFolderPath} using manifest endpoint.`);
}

export async function initializePyodideContext(): Promise<void> {
    // 1. Load Pyodide if not already loaded.
    if (!window.pyodide) {
        window.pyodide = await window.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
        });
        console.log("Pyodide loaded successfully.");
    }

    // 2. Mount public folders.
    await mountFolderFromEndpoint('/txt', '/txt');
    await mountFolderFromEndpoint('/csv', '/csv');

    // 3. Load required packages.
    // @ts-ignore
    if (!window.__packages_loaded) {
        await window.pyodide.loadPackage(["pandas", "numpy", "scipy", "bokeh", "micropip"]);
        // @ts-ignore
        window.__packages_loaded = true;
        console.log("Required packages loaded.");
    }

    // 4. Install extra packages via micropip.
    // @ts-ignore
    if (!window.__xyzservices_installed) {
        await window.pyodide.runPythonAsync(`
import micropip
await micropip.install("xyzservices")
    `);
        // @ts-ignore
        window.__xyzservices_installed = true;
        console.log("xyzservices installed.");
    }

    // 5. Register Python modules.
    async function registerModule(moduleName: string, rawCode: string): Promise<void> {
        const cleanedCode = dedent(rawCode).trim();
        await window.pyodide.runPythonAsync(`
import types, sys
${moduleName}_code = r'''${cleanedCode}'''
${moduleName} = types.ModuleType("${moduleName}")
exec(${moduleName}_code, ${moduleName}.__dict__)
sys.modules["${moduleName}"] = ${moduleName}
    `);
        console.log(`${moduleName} module loaded.`);
    }

    // await registerModule("config", configCode);
    // await registerModule("utils", utilsCode);
    // await registerModule("data_functions", dataFunctionsCode);
    // await registerModule("document_shared_data", documentSharedDataCode);
    // await registerModule("state", stateCode);
    await registerModule("categoryClustering", categoryClusteringCode);
    // await registerModule("plotting", plottingCode);
    // await registerModule("browser_storage", browserStorageCode);
    // await registerModule("reference_plot", referencePlotCode);

    // 6. Create a persistent Pyodide context with renamed functions.
    window.pyContext = {
        // Expose functions from various modules as needed.
        config: window.pyodide.globals.get("config"),
        load_data: window.pyodide.globals.get("load_data"),
        get_column_data_source: window.pyodide.globals.get("get_column_data_source"),
        get_reference_plot_data: window.pyodide.globals.get("get_reference_plot_data"),
        get_overlay_data: window.pyodide.globals.get("get_overlay_data"),
        dedupulicate_column_data_source: window.pyodide.globals.get("dedupulicate_column_data_source"),
        create_unique_id: window.pyodide.globals.get("create_unique_id"),
        get_underlay_data: window.pyodide.globals.get("get_underlay_data"),
        get_aggregate_data: window.pyodide.globals.get("get_aggregate_data"),
        get_data_table_source: window.pyodide.globals.get("get_data_table_source"),
        get_document_shared_data: window.pyodide.globals.get("get_document_shared_data"),
        AppState: window.pyodide.globals.get("AppState"),
        hierarchical_clustering_pearson: window.pyodide.globals.get("hierarchical_clustering_pearson"),
        hierarchical_clustering_from_rows: window.pyodide.globals.get("hierarchical_clustering_from_rows"),
        create_plot: window.pyodide.globals.get("create_plot"),
        get_local_storage_data: window.pyodide.globals.get("get_local_storage_data"),
        get_session_storage_data: window.pyodide.globals.get("get_session_storage_data"),
        initialize_storage: window.pyodide.globals.get("initialize_storage"),
        getReferencePlotJSON: window.pyodide.globals.get("reference_plot")["get_reference_plot_json"],
        halton: window.pyodide.globals.get("halton"),
        generate_rgb_colors: window.pyodide.globals.get("generate_rgb_colors"),
        create_color_symbol_map: window.pyodide.globals.get("create_color_symbol_map"),
        prepare_axes: window.pyodide.globals.get("prepare_axes"),
        create_navigation_buttons: window.pyodide.globals.get("create_navigation_buttons"),
        create_chemicals_dropdown: window.pyodide.globals.get("create_chemicals_dropdown"),
        chemical_select_callback: window.pyodide.globals.get("chemical_select_callback"),
        create_static_title: window.pyodide.globals.get("create_static_title"),
        create_dynamic_plot_title: window.pyodide.globals.get("create_dynamic_plot_title"),
        create_dynamic_table_title: window.pyodide.globals.get("create_dynamic_table_title"),
        create_selected_cluster_info_div: window.pyodide.globals.get("create_selected_cluster_info_div"),
        //create_data_table: window.pyodide.globals.get("create_data_table"),
        //create_summary_data_table: window.pyodide.globals.get("create_summary_data_table"),
        //create_summary_row_click_callback: window.pyodide.globals.get("create_summary_row_click_callback"),
        //register_callback: window.pyodide.globals.get("register_callback"),
        //setup_initial_data: window.pyodide.globals.get("setup_initial_data"),
        //: window.pyodide.globals.get("update_data"),
        //MainLayout: window.pyodide.globals.get("MainLayout"),
    };

    console.log("Pyodide context initialized and functions stored in window.pyContext");
}