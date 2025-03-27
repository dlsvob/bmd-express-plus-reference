from bokeh.plotting import figure
from bokeh.models import HoverTool, CategoricalColorMapper, CategoricalMarkerMapper
from bokeh.transform import factor_mark, factor_cmap
import json
import numpy as np

def create_plot(state, type):

    p = figure(x_range=state.x_range, y_range=state.y_range, height=1180, width=1180, match_aspect=True)

    state.cluster_ids = state.cluster_ids.astype(str)
    categories = ["UP", "DOWN", "CONFLICT"]   
    direction_colors = {"UP": "orange", "DOWN": "blue", "CONFLICT": "black"}
    palette = [direction_colors[cat] for cat in categories]
    color_mapper = CategoricalColorMapper(factors=categories, palette=palette)
    direction_markers = {"UP": "triangle", "DOWN": "inverted_triangle", "CONFLICT": "circle"}
    markers = [direction_markers[cat] for cat in categories]
    marker_mapper = CategoricalMarkerMapper(factors=categories, markers=markers)
    o_source = state.overlay_data_source
    u_source = state.underlay_data_source

    if type == 'cluster':
        p.scatter(x='UMAP_1', y='UMAP_2', source=u_source, size=8, marker="circle",
                    fill_color="white", line_color="gray")
        p.scatter(x='UMAP_1', y='UMAP_2', source=o_source, size=30,
                    color=factor_cmap('cluster_id', palette=o_source.data['color'], factors=o_source.data['cluster_id']),
                    marker=factor_mark('cluster_id', markers=o_source.data['symbol'], factors=o_source.data['cluster_id']),
                    line_color="black",
                    legend_field="cluster_id")
        p.legend.label_text_font_size = '16pt'  # Makes legend text larger
        p.legend.glyph_height = 45  # Increases the legend marker height
        p.legend.glyph_width = 45  # Increases the legend marker width
        p.legend.spacing = 10  # Increases spacing between legend entries
        p.legend.padding = 10  # Increases padding around the legend entries
        p.legend.margin = 10  # Increases margin around the entire legend
        tooltips = [
            ('GO Term', '@go_term'),
            ('Cluster ID', '@cluster_id')
        ]
        hover = HoverTool(tooltips=tooltips)
        p.add_tools(hover)
    elif type == 'direction_percentage':
        p.scatter(x='UMAP_1', y='UMAP_2', source=u_source, size=8, marker="circle",
                    fill_color="white", line_color="gray")         
        p.scatter(x='UMAP_1', y='UMAP_2', source=o_source, size='scaled_size',
                    color={'field': 'direction', 'transform': color_mapper},
                    marker={'field': 'direction', 'transform': marker_mapper},
                    line_color="black",
                    legend_field="direction")
        p.legend.label_text_font_size = '16pt'  # Makes legend text larger
        p.legend.glyph_height = 45  # Increases the legend marker height
        p.legend.glyph_width = 45  # Increases the legend marker width
        p.legend.spacing = 10  # Increases spacing between legend entries
        p.legend.padding = 10  # Increases padding around the legend entries
        p.legend.margin = 10  # Increases margin around the entire legend
        hover = HoverTool(tooltips=[("GO Term", "@go_term")])
        p.add_tools(hover)
    else:
        r_source = state.reference_plot_data_source
        p.scatter(x='UMAP_1', y='UMAP_2', source=r_source, size=12,
                    marker="circle",
                    color="white",
                    line_color="gray")
        hover = HoverTool(tooltips=[("GO Term", "@go_term")])
        p.add_tools(hover)
    return p