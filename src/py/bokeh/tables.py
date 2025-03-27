from bokeh.models import DataTable, TableColumn, InlineStyleSheet, ColumnDataSource, CustomJS

def create_data_table(state):
    columns = [
        TableColumn(field='rank', title='Rank', width=150),
        TableColumn(field='cluster_id', title='Cluster ID', width=100),
        TableColumn(field='GO_id', title='GO ID', width=130),
        TableColumn(field='go_term', title='GO Term', width=1200)
    ]
    
    data_table = DataTable(source=state.overlay_data_source, columns=columns,
                           width=1180, height=400, margin=(-60, 0, 0, 20),
                           fit_columns=False)
    
    table_style = InlineStyleSheet(css="""
        .slick-header-columns {
            background-color: #17648D !important;
            font-family: arial;
            font-weight: normal;
            font-size: 20pt;
            color: #FFFFFF;
            text-align: right;
        }
        .slick-row {
            font-size: 20pt;
            font-family: arial;
            text-align: right;
            height: 50px;
        }
    """)
    
    data_table.stylesheets = [table_style]
    data_table.css_classes = ["wrapped-text"]
    return data_table

def create_summary_data_table(state):
    columns = [
        TableColumn(field='rank', title='Rank', width=150),
        TableColumn(field='cluster_id', title='Cluster ID', width=100),
        TableColumn(field='go_term', title='GO Term', width=35000)
    ]  
    summary_source =state.aggregate_data_source
    summary_table = DataTable(source=summary_source, columns=columns,
                              width=2400, height=400, margin=(-60, 0, 0, 20),
                              fit_columns=False, selectable=True)
    
    table_style = InlineStyleSheet(css="""
        .slick-header-columns {
            background-color: #17648D !important;
            font-family: arial;
            font-weight: normal;
            font-size: 20pt;
            color: #FFFFFF;
            text-align: right;
        }
        .slick-row {
            font-size: 20pt;
            font-family: arial;
            text-align: right;
        }
    """)
    summary_table.stylesheets = [table_style]
    summary_table.selectable = True
    source = state.overlay_data_source
    source_copy = ColumnDataSource(dict(source.data))
    # callback = create_summary_row_click_callback(source, source_copy, summary_source)
    # summary_source.selected.js_on_change('indices', callback)
    register_callback(summary_table, source, source_copy, summary_source)
    return summary_table

def create_summary_row_click_callback(source, source_copy, summary_source):
    return CustomJS(args=dict(main_source=source, original_source=source_copy, summary_source=summary_source), code="""
        var selected_indices = summary_source.selected.indices;

        
        // Initialize new_data with empty arrays for each column
        var new_data = {};
        Object.keys(original_source.data).forEach(function(column) {
            new_data[column] = [];
        });

        if (selected_indices.length === 0) {
            // If no selections, reset to display all original data
            Object.keys(original_source.data).forEach(function(column) {
                new_data[column] = original_source.data[column].slice();  // Use slice to copy the data
            });
        } else {
            // Iterate over all selected indices
            selected_indices.forEach(function(idx) {
                var selected_cluster_id = summary_source.data['cluster_id'][idx].toString();

                // Filter original data based on each selected cluster_id from summary
                for (var i = 0; i < original_source.data['cluster_id'].length; i++) {
                    if (original_source.data['cluster_id'][i].toString() === selected_cluster_id) {
                        Object.keys(original_source.data).forEach(function(column) {
                            new_data[column].push(original_source.data[column][i]);
                        });
                    }
                }
            });
        }

        main_source.data = new_data;
        main_source.change.emit();
    """)

def register_callback(data_table, main_source, original_source, summary_source):
    # Define or update args dictionary dynamically
    callback = data_table.js_property_callbacks.get('change:selected', [None])[0]
    if callback:
        # Update existing callback arguments
        callback.args.update(main_source=main_source, original_source=original_source, summary_source=summary_source)
    else:
        # Create new callback and add it
        new_callback = create_summary_row_click_callback(main_source, original_source, summary_source)
        summary_source.selected.js_on_change('indices', new_callback)
    
    
