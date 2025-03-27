from bokeh.models import ColumnDataSource, DataTable
import pandas as pd
from data_functions import get_overlay_data, get_underlay_data, get_reference_plot_data, get_aggregate_data, get_data_table_source, get_reference_plot_data
from utils import prepare_axes, create_color_symbol_map
import config

class AppState:
    def __init__(self):
        self.current_index = 1
        self.chemicals = config.config['chemicals']
        self.chemical = config.config['chemicals'][0]
        self.scaled_size = 0
        self.unique_cluster_ids = []
        self.cluster_color_symbol_map = {}
        self.x_range = []
        self.y_range = []
        self.marker_types = []
        self.colors = []
        self.plot_dfs = {}
        self.master_df = pd.DataFrame()
        self.reference_df = pd.DataFrame()
        self.reference_data_source = ColumnDataSource()
        self.reference_plot_df = pd.DataFrame()
        self.reference_plot_data_source = ColumnDataSource()
        self.overlay_df = pd.DataFrame()
        self.overlay_data_source = ColumnDataSource()
        self.underlay_df = pd.DataFrame()
        self.underlay_data_source = ColumnDataSource()
        self.aggregate_data = pd.DataFrame()
        self.aggregate_data_source = ColumnDataSource()
        self.prepare_document_shared_data()
        self.summary_table = DataTable()
        self.table_data_source = ColumnDataSource()

    def prepare_document_shared_data(self):
        self.set_reference_plot_data()    
        self.set_auxiliary_properties()
        self.set_overlay_data()
        self.set_underlay_data()
        self.set_aggregate_data()
        self.set_table_data_source()
        self.set_auxiliary_properties()
        self.set_reference_plot_data()

    def set_reference_plot_data(self):
        get_reference_plot_data(self)
    
    def set_reference_plot_data(self):
        get_reference_plot_data(self)
    
    def set_overlay_data(self):
        get_overlay_data(self)
       
    def set_underlay_data(self):
        get_underlay_data(self)
        
    def set_aggregate_data(self):
        get_aggregate_data(self)
        
    def set_table_data_source(self):
        self.table_data_source = get_data_table_source(self)
        
    def set_auxiliary_properties(self): # TO-DO: make more tidy later
        # Calculate fixed axes and store them in the state
        self.x_range, self.y_range = prepare_axes(self.reference_plot_df)
        self.cluster_color_symbol_map = create_color_symbol_map(self.unique_cluster_ids)
        # Assuming cluster_color_symbol_map is a dictionary
        default_color = 'black'
        default_symbol = 'circle'
        # Apply the map with defaults
        self.reference_plot_df['color'], self.reference_plot_df['symbol'] = zip(*self.reference_plot_df['cluster_id'].map(
            lambda x: self.cluster_color_symbol_map.get(x, (default_color, default_symbol))
        ))       
        self.marker_types = self.reference_plot_df['symbol']
        self.colors = self.reference_plot_df['color']
        self.cluster_ids = self.reference_plot_df['cluster_id'].unique()
    
                


 
