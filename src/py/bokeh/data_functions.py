import pandas as pd
from bokeh.models import ColumnDataSource
from config import config
import numpy as np
from utils import create_color_symbol_map

def load_data(filepath, delimiter=','):
    df = pd.read_csv(filepath, delimiter=delimiter)
    return df

def get_column_data_source(df):
    dictionary = df.to_dict('list')
    source = ColumnDataSource(dictionary)
    return source

def get_reference_plot_data(state):
    state.reference_plot_df = pd.DataFrame(load_data(config['reference_data_path'], '\t'))
    state.reference_plot_df['cluster_id'] = state.reference_plot_df['cluster_id'].astype(str)
    state.reference_plot_df.sort_values(by='cluster_id', inplace=True)
    state.reference_plot_data_source = ColumnDataSource(state.reference_plot_df.to_dict('list'))
    state.unique_cluster_ids = state.reference_plot_df['cluster_id'].unique()
       
def get_overlay_data(state):
    path = f"{config['go_term_processing_path']}/csv/umap_rank_data_{state.current_index}-{state.current_index+24}_{state.chemical}.csv"
    state.overlay_df = load_data(path, ',')
    state.overlay_df['rank'] = state.overlay_df['rank'].astype(int)
    state.overlay_df['cluster_id'] = state.overlay_df['cluster_id'].astype(str)
    state.overlay_df.sort_values(by=['rank', 'cluster_id'], ascending=[True, True], inplace=True)
    state.overlay_df['rank'] = pd.Categorical(state.overlay_df['rank'])
    # Get unique combinations of cluster ID, color, and symbol from state.reference_df
    # unique_combinations_df = state.reference_plot_df[['cluster_id', 'color', 'symbol']].drop_duplicates()
    # unique_combinations_df['cluster_id'] = unique_combinations_df['cluster_id'].astype('str')
    # state.overlay_df = pd.merge(state.overlay_df, unique_combinations_df, on='cluster_id', how='left')
    percentage_df = pd.DataFrame(load_data(config['percentage_BMD_path'], '\t'))
    percentage_array = np.array(percentage_df['percentage'])
    scaled_size = np.log10(percentage_array + 1) * 25
    percentage_df['scaled_size'] = scaled_size
    merged_df = state.overlay_df.merge(
    percentage_df[['go_id', 'scaled_size', 'chemical']],
        left_on=['GO_id', 'chemical'],
        right_on=['go_id', 'chemical'],
        how='left'
    )
    # Assign the merged DataFrame to state.overlay_df
    state.overlay_df = merged_df
    cluster_df = pd.DataFrame.from_dict(state.cluster_color_symbol_map, orient='index', columns=['color', 'symbol']).reset_index().rename(columns={'index': 'cluster_id'})
    # Merge the new DataFrame with state.overlay_df on the cluster_id column
    state.overlay_df = state.overlay_df.merge(cluster_df, on='cluster_id', how='left')
    new_data_dict = state.overlay_df.to_dict('list')
    state.overlay_data_source.data = new_data_dict

def dedupulicate_column_data_source(cds):
    unique_data = {}
    seen_values = set()

    for key, values in cds.items():
        unique_values = []
        for value in values:
            if value not in seen_values:
                seen_values.add(value)
                unique_values.append(value)
        unique_data[key] = unique_values

    return unique_data

def create_unique_id(df):
    str_df = df.astype(str)
    df['id'] = str_df.apply(lambda x: '_'.join(x), axis=1)
    return df

def get_underlay_data(state):
    temp_ref_df = state.reference_plot_df
    temp_over_df = state.overlay_df 
    # Merge the DataFrames with an indicator column to identify the source of each row
    merged = pd.merge(temp_ref_df, temp_over_df, on='GO_id', how='outer', indicator=True, suffixes=('', '_right'))

    # Filter to keep only rows that are from the left DataFrame
    merged_left_df = merged[merged['_merge'] == 'left_only']

    # Select only the columns from the left DataFrame
    left_columns = temp_ref_df.columns.tolist()
    merged_left_df = merged_left_df[left_columns]

    #state.underlay_df = merged_left_df[merged_left_df['chemical'] == state.chemical]
    merged_data_dict = merged_left_df.to_dict('list')
    state.underlay_data_source = merged_data_dict
    
def get_aggregate_data(state):
    df = state.overlay_df
    summary_df = df.groupby('cluster_id').agg({
    'go_term': lambda terms: ' | '.join(terms),  # Use  |  as separator
    'rank': lambda ranks: ' | '.join(map(str, ranks.unique()))  # Convert ranks to string and use  | as separator
    }).reset_index()
    summary_data_dict = summary_df.to_dict('list')
    state.aggregate_data_source.data = summary_data_dict

def get_data_table_source(state):
    source_df = state.overlay_df
    # Concatenate rank, cluster_id, go_id, and go_term into a new column
    source_df['combined'] = source_df['rank'].astype(str) + '_' + source_df['cluster_id'].astype(str) + '_' + source_df['GO_id'].astype(str) + '_' + source_df['go_term'] + '_' + source_df['chemical']

    # Get unique combinations of the concatenated column
    unique_combinations = set(source_df['combined'])

    # Split the combined column back into separate columns
    distinct_df = pd.DataFrame([x.split('_') for x in unique_combinations], columns=['rank', 'cluster_id', 'GO_id', 'go_term', 'chemical'])

    # Convert columns to appropriate types if needed
    distinct_df['rank'] = distinct_df['rank'].astype(int)
    distinct_df['cluster_id'] = distinct_df['cluster_id'].astype(int)
    state.table_data_source = ColumnDataSource(distinct_df.to_dict('list'))