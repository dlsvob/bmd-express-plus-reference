# document_shared_data.py
import json
from data_functions import get_reference_plot_data
from utils import prepare_axes

def get_document_shared_data():
    # Create a simple state object
    class SimpleState:
        pass
    state = SimpleState()
    
    # Load the static reference data (this sets state.reference_plot_df and state.reference_plot_data_source)
    get_reference_plot_data(state)
    
    # Compute axes ranges based on the reference DataFrame.
    state.x_range, state.y_range = prepare_axes(state.reference_plot_df)
    
    # Convert cluster IDs (assumed to be a pandas Series) to a list
    try:
        cluster_ids = state.reference_plot_df['cluster_id'].unique().tolist()
    except Exception:
        cluster_ids = []
    
    # Convert referencePlotData to a serializable format.
    # Assuming state.reference_plot_data_source.data is a dict,
    # if it contains any pandas objects, convert them as well.
    reference_plot_data = state.reference_plot_data_source.data if hasattr(state, "reference_plot_data_source") else {}
    
    # Build the shared data dictionary with serializable types.
    shared_data = {
        "xRange": state.x_range,    # Make sure these are already lists or tuples
        "yRange": state.y_range,
        "referencePlotData": reference_plot_data,
        "clusterIds": cluster_ids,
        "defaultColor": "black",
        "defaultSymbol": "circle",
    }
    return json.dumps(shared_data)