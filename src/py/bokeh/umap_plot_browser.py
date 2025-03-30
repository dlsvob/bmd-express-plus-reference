from bokeh.models import ColumnDataSource, Scatter, HoverTool, Button, Div
from bokeh.plotting import figure
from bokeh.layouts import column, row
from bokeh.io import curdoc
from bokeh.transform import factor_mark, factor_cmap
from bokeh.models import Div, Spacer, Button
from utils import prepare_axes, create_color_symbol_map, get_overlay_data, get_column_data, create_reference_data, on_forward, on_back, create_data_table, create_summary_data_table, update_summary_data_table
import globals as shared

START = 1
END = 1651

FILENAMES = [f"{shared.GO_TERM_PROCESSING_PATH}/csv/hdbscan_clustered_data_{i}-{i+24}.csv" for i in range(START, END + 1)]
REFERENCE_GLYPH_COLLECTION = Scatter(x="UMAP_1", y="UMAP_2", size=12,
                                marker="glyph", fill_color="white", line_color="gray")

# Reference data
reference_df = create_reference_data()
reference_source_dictionary = reference_df.to_dict('list')
reference_source = ColumnDataSource(reference_source_dictionary)
x_range_fixed, y_range_fixed = prepare_axes(reference_df)
x_min, x_max = x_range_fixed  # Unpack the original tuple
x_max += 3
x_min += 2

source_df = get_overlay_data(FILENAMES[shared.CURRENT_INDEX])
source = ColumnDataSource(get_column_data(source_df))
cluster_color_symbol_map = create_color_symbol_map(source_df)

cluster_ids = sorted(map(str, source_df['cluster_id'].unique().tolist()))
marker_types = [cluster_color_symbol_map[cluster_id][1] for cluster_id in cluster_ids]
palette = [cluster_color_symbol_map[cluster_id][0] for cluster_id in cluster_ids]

p = figure(title=f"UMAP (Rank: {shared.CURRENT_INDEX}-{shared.CURRENT_INDEX+24})", x_range=(x_min, x_max), y_range=y_range_fixed,
        height=800, width=800, match_aspect=True)
p.title.text_font_size = '20pt'

p.add_glyph(reference_source, REFERENCE_GLYPH_COLLECTION)
p.scatter(x="UMAP_1", y="UMAP_2", source=source, size=20, 
            marker=factor_mark('cluster_id', markers=marker_types, factors=cluster_ids), 
            color=factor_cmap('cluster_id', palette=palette, factors=cluster_ids), 
            line_color=factor_cmap('cluster_id', palette=palette, factors=cluster_ids), 
            legend_field="cluster_id")
# Customizations for the legend to make it larger
p.legend.label_text_font_size = '16pt'  # Makes legend text larger
p.legend.glyph_height = 45  # Increases the legend marker height
p.legend.glyph_width = 45  # Increases the legend marker width
p.legend.spacing = 10  # Increases spacing between legend entries
p.legend.padding = 10  # Increases padding around the legend entries
p.legend.margin = 10  # Increases margin around the entire legend
# Hover tool
hover = HoverTool(tooltips=[("GO Term", "@go_term")])
p.add_tools(hover)

reference_p = figure(title="UMAP reference plot", x_range=(x_min, x_max), y_range=y_range_fixed,
                    height=800, width=800, match_aspect=True)
reference_p.title.text_font_size = '20pt'
reference_p.add_glyph(reference_source, REFERENCE_GLYPH_COLLECTION)

t = create_data_table(source)
# Create a Div for the title of the table
table_title = Div(
    text=f"Plot Data (Rank: {shared.CURRENT_INDEX}-{shared.CURRENT_INDEX+24})",
    width=1180, height=50,
    margin=(0, 0, 0, 20),
    styles={'font-family': 'Arial, Helvetica, sans-serif', 
           'font-size': '20pt', 
           'font-weight': 'bold'},
    sizing_mode='stretch_width'
)

summary_table_title = Div(
    text=f"Summary Data (Rank: {shared.CURRENT_INDEX}-{shared.CURRENT_INDEX+24})",
    width=1180, height=50,
    margin=(0, 0, 0, 20),
    styles={'font-family': 'Arial, Helvetica, sans-serif', 
           'font-size': '20pt', 
           'font-weight': 'bold'},
    sizing_mode='stretch_width'
)

# Group by 'cluster_id' and aggregate 'go_term' and 'rank'
summary_df = source_df.groupby('cluster_id').agg({
    'go_term': lambda terms: ' | '.join(terms),  # Use  |  as separator
    'rank': lambda ranks: ' | '.join(map(str, ranks.unique()))  # Convert ranks to string and use  | as separator
}).reset_index()
summary_source = ColumnDataSource(summary_df.to_dict('list'))
st = create_summary_data_table(summary_source)

spacer_height = 50
table_spacer = Spacer(height=spacer_height)

forward_button = Button(label="Forward", name='forward_button_id', width=200, height=75, button_type='primary', css_classes=['custom-font-size'])
back_button = Button(label="Back", name='back_button_id', width=200, height=75, button_type='warning', css_classes=['custom-font-size'])

button_row = row(back_button, forward_button)
plot_table_row = row(reference_p, p, column(table_title, table_spacer, t), column(summary_table_title, table_spacer, st))



source.on_change('data', lambda attr, old, new: update_summary_data_table(source, summary_source))

def on_forward_button_click():
    # Accessing shared.CURRENT_INDEX and ensuring it's used correctly here
    filename = FILENAMES[shared.CURRENT_INDEX]
    on_forward(filename, source, p.title, table_title, summary_table_title)
    
def on_back_button_click():
    # Accessing shared.CURRENT_INDEX and ensuring it's used correctly here
    filename = FILENAMES[shared.CURRENT_INDEX]
    on_back(filename, source, p.title, table_title, summary_table_title)
    
forward_button.on_click(on_forward_button_click)
back_button.on_click(on_back_button_click)

layout = column(button_row, plot_table_row)

curdoc().add_root(layout)

   


   

    # # CustomJS callback to hide/show points based on table row selection
    # alphas = new_source_filtered.data['color']
    # len_alphas = len(alphas)
    # rows_select_callback = CustomJS(args=dict(plot_source=new_source_filtered, table_source=new_filtered_summary_source), code="""
    #     // Get selected indices from the table
    #     var selected_indices = table_source.selected.indices;
    #     var selected_cluster_ids = [];
    #     for (var i = 0; i < selected_indices.length; i++) {
    #         var index = selected_indices[i];
    #         selected_cluster_ids.push(table_source.data['cluster_id'][index]);
    #     }
        
    #     // Initialize an array for new visibility or another attribute
    #     var new_visibility = new Array(plot_source.data['cluster_id'].length).fill(false);
        
    #     // Loop through the plot source to update visibility based on selection
    #     for (var i = 0; i < plot_source.data['cluster_id'].length; i++) {
    #         if (selected_cluster_ids.includes(plot_source.data['cluster_id'][i])) {
    #             new_visibility[i] = true; // Set to true for selected items
    #         }
    #     }
        
    #     // Assuming you have a 'visible' field in your plot's ColumnDataSource
    #     plot_source.data['visible'] = new_visibility;
    #     plot_source.change.emit(); // Trigger the update
    #     """)

    #     # Connect the callback to the table's selection
    #     st.source.selected.js_on_change('indices', rows_select_callback)

    # # Wrap each plot in a Column layout (so we can show/hide each easily)
    # plot_columns = [column(p, visible=(i == 0)) for i, p in enumerate(plots)]
    # table_columns = [column(t, visible=(i == 0)) for i, t in enumerate(tables)]
    # summary_table_columns = [column(st, visible=(i == 0)) for i, st in enumerate(summary_tables)]

    # summary_table_header_columns = [column(sth, visible=(i == 0)) for i, sth in enumerate(summary_table_headers)]
    # #print('Plot columns:', plot_columns)
    # #print('Table columns:', table_columns)
    # #print('Table header columns:', table_header_columns)
    # #print('Summary table header columns:', summary_table_header_columns)
    # # Index tracker
    # index_tracker = Div(text="0", visible=False)  # Start with the first plot visible

    # # Forward and back buttons
    # # Custom CSS
    # # doesn't work in standalone document. have to add it to the HTML file manually. (that didn't work either)
    # # custom_css = """
    # # <style>
    # # .custom-font-size .bk-btn {
    # #     font-size: 20px; /* Adjust the size as needed */
    # # }
    # # </style>
    # # """


    # update_and_toggle_visibility_callback = CustomJS(args=dict(plot_columns=plot_columns, table_columns=table_columns, summary_table_columns=summary_table_columns,
    #                                                             table_header_columns=table_header_columns, summary_table_header_columns=summary_table_header_columns, 
    #                                                             index_tracker=index_tracker, max_index=len(plot_columns) - 1), code="""
    #     // Determine action: forward or backward based on the button that triggered the callback
    #     console.log('Button clicked:', cb_obj.origin.name); // Should log the button object
    #     var direction = cb_obj.origin.name === 'forward_button_id' ? 1 : -1; // Assume IDs are set for the buttons
    #     var current_index = parseInt(index_tracker.text);
        
    #     // Update index within bounds
    #     current_index += direction;
    #     if (current_index < 0) {
    #         current_index = 0;
    #     } else if (current_index > max_index) {
    #         current_index = max_index;
    #     }
        
    #     // Update the tracker's text to reflect the new index
    #     index_tracker.text = current_index.toString();
        
    #     // Toggle visibility
    #     for (var i = 0; i < plot_columns.length; i++) {
    #         plot_columns[i].visible = (i === current_index);
    #     }
        
    #     for (var i = 0; i < table_columns.length; i++) {
    #         table_columns[i].visible = (i === current_index);
    #     }
                                                    
    #     for (var i = 0; i < summary_table_columns.length; i++) {
    #         summary_table_columns[i].visible = (i === current_index);
    #     }
                                                    
    #     for (var i = 0; i < table_header_columns.length; i++) {
    #         table_header_columns[i].visible = (i === current_index);
    #     }
                                                    
    #     for (var i = 0; i < summary_table_header_columns.length; i++) {
    #         summary_table_header_columns[i].visible = (i === current_index);
    #     }                                                 
        
    #     // Optional: Log to console for debugging
    #     // console.log('Updated index:', current_index, '  Direction:', direction, '  cb_obj:', cb_obj.id, ' my_args: ', plot_columns, index_tracker, max_index);
    # """);

    # callback = CustomJS(args={}, code="""
    #     // console.log('Button clicked:', cb_obj.origin.label); // Should log the button object
    # """);



    # # Link this combined callback to both buttons
    # forward_button.js_on_click(update_and_toggle_visibility_callback);
    # back_button.js_on_click(update_and_toggle_visibility_callback);

    # # Layout everything
    # # paginated_layout = row(
    # #     column(back_button, forward_button, *plot_columns), 
    # #     column(back_button, forward_button, *table_header_columns, *table_columns), 
    # #     column(back_button, forward_button, *summary_table_header_columns, *summary_tables)
    # # )

    # paginated_layout = row(
    #     column(back_button, forward_button, *plot_columns), 
    #     column(back_button, forward_button, *summary_table_header_columns, *summary_tables)
    # )