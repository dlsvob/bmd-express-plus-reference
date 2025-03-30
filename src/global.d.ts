declare global {
    interface Window {
        include: [ "src/**/*"];
        pyodide: any;
        loadPyodide: (options: { indexURL: string }) => Promise<any>;
        __clustering_script?: string;
        __clustering_module_loaded?: boolean;
        __packages_loaded?: boolean;
        pyContext?: {
            config: any;
            getDocumentSharedData?: Function;
            getReferencePlotData?: Function;
            load_data?: Function;
            get_column_data_source?: Function;
            get_reference_plot_data?: Function;
            get_overlay_data?: Function;
            dedupulicate_column_data_source?: Function;
            create_unique_id?: Function;
            get_underlay_data?: Function;
            get_aggregate_data?: Function;
            get_data_table_source?: Function;
            get_document_shared_data?: Function;
            AppState?: Function;
            hierarchical_clustering_pearson?: Function;
            hierarchical_clustering_from_rows?: Function;
            clustering_script?: Function;
            create_plot?: Function;
            get_local_storage_data?: Function;
            get_session_storage_data?: Function;
            initialize_storage?: Function;
            generate_rgb_colors?: Function;
            create_color_symbol_map?: Function;
            prepare_axes?: Function;
            create_navigation_buttons?: Function;
            create_chemicals_dropdown?: Function;
            chemical_select_callback?: Function;
            create_static_title?: Function;
            create_dynamic_plot_title?: Function;
            create_dynamic_table_title?: Function;
            create_selected_cluster_info_div?: Function;
            getOverlayData?: Function;
            deduplicateColumnDataSource?: Function;
            createUniqueId?: Function;
            getUnderlayData?: Function;
            getAggregateData?: Function;
            getDataTableSource?: Function;
            prepareAxes?: Function;
            halton?: Function;
            generateRgbColors?: Function;
            createColorSymbolMap?: Function;
            createPlot?: Function;
            hierarchicalClusteringPearson?: Function;
            hierarchicalClusteringFromRows?: Function;
            getReferencePlotJSON: () => Promise<string>;
        };
    }
}

declare module '*.py?raw' {
    const content: string;
    export default content;
}

export { };