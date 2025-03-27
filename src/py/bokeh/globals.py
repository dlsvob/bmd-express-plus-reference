from bokeh.models import Spinner

# GLOBALS
CURRENT_INDEX = Spinner(value=1, low=1, high=2000, step=1, visible=False)
GO_TERM_PROCESSING_PATH = ""
UMAP_CLUSTER_DATA_PATH = f"{GO_TERM_PROCESSING_PATH}/txt/umap_5D_clusters_2D_umap_coordinates_GO_BP_PROFILES_40-500.txt"
ACCUMULATION_PLOT_PATH = f"{GO_TERM_PROCESSING_PATH}/txt/chemical_percentage_direction_rank.txt"
REFERENCE_DATA_PATH = f"{GO_TERM_PROCESSING_PATH}/csv/master_umap_rank.csv"

CHEMICAL = 'PFOA'
SEX = 'M'
