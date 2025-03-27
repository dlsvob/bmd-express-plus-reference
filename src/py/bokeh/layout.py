from bokeh.layouts import column, row
from bokeh.models import Spacer
from functools import partial
from components import (create_static_title, create_dynamic_plot_title,
                        create_dynamic_table_title, create_navigation_buttons,
                        create_selected_cluster_info_div, create_chemicals_dropdown)
from tables import create_data_table, create_summary_data_table
from plotting import create_plot


class MainLayout:
    def __init__(self, state):
        self.current_index = state.current_index
        self.initialize_components(state)

    def initialize_components(self, state):
        # Create titles
        self.reference_plot_title = create_static_title("Reference UMAP")
        self.overlay_plot_title = create_dynamic_plot_title(state)
        state.overlay_data_source.on_change('data', partial(self.update_dynamic_plot_title, state))
        #state.overlay_data_source.on_change('data', self.update_dynamic_table_title(state))
        self.data_table_title = create_dynamic_table_title(state)
        self.summary_table_title = create_static_title("Summary Data Table")
        
        # Create navigation and dropdown
        self.button_tuple = create_navigation_buttons(state)
        self.chemical_dropdown = create_chemicals_dropdown(state)

        # Create plots
        self.cluster_plot = create_plot(state, 'cluster')
        self.direction_percentage_plot = create_plot(state, 'direction_percentage')
        self.reference_plot = create_plot(state, 'reference')

        # Create data tables
        self.selected_cluster_info_div = create_selected_cluster_info_div()
        self.data_table = create_data_table(state)
        self.summary_table = create_summary_data_table(state)
        state.summary_table = self.summary_table
  
        # Create spacers
        self.table_spacer = Spacer(height=100)

        # Assemble rows
        self.button_row = row(*self.button_tuple, self.chemical_dropdown) #, self.selected_cluster_info_div)
        self.plot_row = self.create_plot_row()
        self.table_row = self.create_table_row()

        # Assemble the overall layout
        self.layout = column(self.button_row, self.plot_row, self.table_row)

    def create_plot_row(self):
        return row(
            column(self.reference_plot_title, self.reference_plot),
            column(self.overlay_plot_title, self.direction_percentage_plot),
            column(self.overlay_plot_title, self.cluster_plot)
        )
        
    def create_table_row(self):
        return row(
            column(self.table_spacer, self.data_table),
            column(self.table_spacer, self.summary_table)
        )

    def get_layout(self):
        return self.layout

    def update_dynamic_plot_title(self, state, attr, old, new):
        self.overlay_plot_title.text = f'UMAP (Rank: {state.current_index}-{state.current_index+24})'
        
    def update_dynamic_table_title(self, attr, old, new):
        # title = self.data_table_title
        # title.text = f'Rank ({self.current_index}-{self.current_index+24})'
        print('Table title updated')
