from data_functions import get_aggregate_data, get_overlay_data, get_underlay_data, get_data_table_source, get_reference_plot_data
from config import config
from tables import register_callback
from bokeh.models import ColumnDataSource

def setup_initial_data(state):
    update_data(state, 'initial')

def update_data(state, action):
    if action in ['forward', 'fforward', 'ffforward', 'back', 'fback', 'ffback']:
        state.current_index += config['step_sizes'][action]
    elif action == 'new_chemical':
        state.current_index = 1
    elif action == 'initial':
        state.current_index = 1
        get_reference_plot_data(state)

    get_overlay_data(state)
    get_underlay_data(state)
    get_aggregate_data(state)
    get_data_table_source(state)
    source = state.overlay_data_source
    source_copy = ColumnDataSource(dict(source.data))
    register_callback(state.summary_table, source, source_copy, state.aggregate_data_source)
    