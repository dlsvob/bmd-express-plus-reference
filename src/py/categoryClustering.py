# src/py/categoryClustering.py

import json
import math
import numpy as np
import pandas as pd
from scipy.spatial.distance import squareform
from scipy.cluster.hierarchy import linkage, dendrogram, fcluster
import js # Use js.console.log/error for debugging in Pyodide
# import traceback # Uncomment for detailed tracebacks if needed

print("=== categoryClustering.py LOADED (v2 - Direct Object Input) ===")


##############################################################################
# Helper function to convert NumPy types to native Python types for JSON.
##############################################################################
def convert_np(o):
    if isinstance(o, np.generic):
        return o.item()
    if isinstance(o, (list, tuple)):
        return [convert_np(x) for x in o]
    if isinstance(o, dict):
        return {k: convert_np(v) for k, v in o.items()}
    return o


##############################################################################
# Clustering function expecting direct list/PyProxy input
##############################################################################
def hierarchical_clustering_from_rows(
    row_data_obj, # Expects JS array -> Python list or PyProxy
    method: str = "average",
    num_clusters: int = 0
) -> str:
    js.console.log("=== [PY] hierarchical_clustering_from_rows START (v2) ===")
    js.console.log("[PY DEBUG] Raw input type:", type(row_data_obj))

    row_list = None
    try:
        # Check if it's a PyProxy and convert if necessary
        # Direct conversion often works for list-of-dicts structures
        if hasattr(row_data_obj, 'to_py'):
            js.console.log("[PY DEBUG] Input is PyProxy, converting with .to_py()")
            row_list = row_data_obj.to_py()
        elif isinstance(row_data_obj, list):
             js.console.log("[PY DEBUG] Input is already Python list.")
             row_list = row_data_obj
        else:
            # Attempt to handle cases where it might already be converted implicitly
            # or if it's passed in an unexpected format.
            js.console.warn("[PY DEBUG] Input is not PyProxy or list, attempting to use directly. Type:", type(row_data_obj))
            row_list = row_data_obj # Assume it might work

        # *** REMOVED DOUBLE JSON.LOADS ***
        # intermediate_string = json.loads(row_data_json_str)
        # row_list = json.loads(intermediate_string)
        # ********************************

        js.console.log("[PY DEBUG] Processed row_list type:", type(row_list))

    except Exception as e:
        js.console.error("[PY DEBUG] !!! EXCEPTION during data handling/conversion !!!", e)
        # Uncomment for more detail if needed
        # js.console.error(traceback.format_exc())
        msg = f"[PY DEBUG] ERROR during data handling: {e}"
        return json.dumps({"error": msg, "input_repr": repr(row_data_obj)})

    # Check the type AFTER the try block
    if not isinstance(row_list, list):
        msg = f"[PY] ERROR: Expected a list after handling input, got {type(row_list)}"
        js.console.error(msg)
        js.console.error("[PY] Value that failed isinstance(list):", repr(row_list)) # Log the problematic value
        return json.dumps({"error": msg, "processed_data_repr": repr(row_list)})

    # If we get here, row_list is a list
    js.console.log(f"[PY] Successfully obtained row_list, length: {len(row_list)}")
    if len(row_list) > 0:
        js.console.log("[PY] First row sample:", str(row_list[0]))

    # --- Process the parsed list ---
    def parse_genes(s: str) -> set:
        if not s:
            return set()
        return set(x.strip() for x in s.split(";") if x.strip())

    row_sets = []
    labels = []
    for i, row in enumerate(row_list): # row should be a dict
        # js.console.log(f"[PY] Processing row {i}:", str(row)) # Optional: log each row
        # Ensure row is a dictionary-like object
        if not hasattr(row, 'get'):
             msg = f"[PY] ERROR: Row {i} is not a dictionary-like object. Type: {type(row)}"
             js.console.error(msg)
             return json.dumps({"error": msg, "row_repr": repr(row)})

        cat_id = row.get("Category ID", "") # Use keys expected from JS ('Category ID', 'Genes Up', etc.)
        if not cat_id:
            msg = f"[PY] ERROR: Row {i} missing required 'Category ID' value."
            js.console.error(msg)
            return json.dumps({"error": msg, "data_repr": str(row)})

        # Build composite label
        label_parts = [f"Category ID: {cat_id}"]
        # Use .items() if it's a dict, otherwise handle potential PyProxy iteration
        items_to_iterate = row.items() if isinstance(row, dict) else row # Adjust if PyProxy needs different iteration
        for key, value in items_to_iterate:
            # Skip the keys used for gene sets and those already incorporated.
            # Ensure these keys match exactly what JS sends ('Genes Up', 'Genes Down')
            if key in ["Genes Up", "Genes Down", "Category ID", "categoryIdentifier", "All Genes"]:
                continue
            label_parts.append(f"{key}: {value}")
        composite_label = " | ".join(label_parts)
        labels.append(composite_label)

        # Process gene sets using keys expected from JS
        up = parse_genes(row.get("Genes Up", ""))
        down = parse_genes(row.get("Genes Down", ""))
        active_set = up.union(down)
        # js.console.log(f"[PY] Row {i} - Active set:", str(active_set)) # Optional: log active set
        row_sets.append(active_set)

    if not row_sets:
         msg = "[PY] ERROR: No row sets generated after processing."
         js.console.error(msg)
         return json.dumps({"error": msg})

    # --- Calculate Distance Matrix ---
    N = len(row_sets)
    distance_matrix = np.zeros((N, N), dtype=float)
    for i in range(N):
        for j in range(i, N):
            A = row_sets[i]
            B = row_sets[j]
            union_len = len(A.union(B))
            if union_len == 0:
                d = 0.0 # Define distance as 0 if both sets are empty
            else:
                d = 1.0 - (len(A.intersection(B)) / union_len) # Jaccard distance
            distance_matrix[i, j] = d
            distance_matrix[j, i] = d

    js.console.log("[PY] Constructed distance matrix with shape:", str(distance_matrix.shape))

    # --- Determine Cluster Count ---
    if num_clusters <= 0:
        guess = math.sqrt(N) / 2
        num_clusters = max(2, int(math.ceil(guess)))
    js.console.log(f"[PY] Clustering parameters: method={method}, num_clusters={num_clusters}")

    # --- Prepare data for pearson function ---
    # The _pearson function still expects standard JSON string input
    distance_data = {"distanceMatrix": distance_matrix.tolist(), "labels": labels}
    distance_data_json_for_pearson = json.dumps(distance_data)
    # js.console.log("[PY] Built distance_data for pearson func (truncated):", distance_data_json_for_pearson[:300] + "...")

    # --- Call the pearson function ---
    result_json = hierarchical_clustering_pearson(
        distance_data_json_for_pearson, # Pass the standard JSON string
        method=method,
        num_clusters=num_clusters
    )
    js.console.log("=== [PY] hierarchical_clustering_from_rows END (v2) ===")
    return result_json


##############################################################################
# Existing clustering function: expects a standard JSON string with "distanceMatrix" and "labels".
# NO CHANGES NEEDED HERE
##############################################################################
def hierarchical_clustering_pearson(
    distance_data_json: str, # Expects standard JSON string '{"distanceMatrix": ..., "labels": ...}'
    method: str = "average",
    num_clusters: int = 0
) -> str:
    """
    Performs hierarchical clustering on an NxN distance matrix.
    Expects 'distance_data_json' to be a standard JSON string that decodes to a dict:
      {
        "distanceMatrix": NxN array,
        "labels": array of strings
      }
    If num_clusters <= 0, a heuristic is used.
    Returns a JSON string with clustering results or an error object.
    """
    js.console.log("=== [PY] hierarchical_clustering_pearson START ===")
    # js.console.log("[PY] Pearson received distance_data_json:", distance_data_json[:200] + "...")

    data = None
    try:
        # Single parse is correct here
        data = json.loads(distance_data_json)
    except Exception as e:
        msg = f"[PY] ERROR in json.loads (pearson): {e}"
        js.console.error(msg)
        return json.dumps({"error": msg})

    if not isinstance(data, dict):
        msg = f"[PY] ERROR: Data parsed in pearson is not a dict. Got {type(data)}"
        js.console.error(msg)
        return json.dumps({"error": msg, "data_repr": str(data)})

    if "distanceMatrix" not in data or "labels" not in data:
         msg = "[PY] ERROR: Missing 'distanceMatrix' or 'labels' in data for pearson function."
         js.console.error(msg)
         return json.dumps({"error": msg})

    try:
        distance_matrix = np.array(data["distanceMatrix"], dtype=float)
        labels = data["labels"]
        N = distance_matrix.shape[0]

        if N == 0:
             msg = "[PY] ERROR: Empty distance matrix received by pearson function."
             js.console.error(msg)
             return json.dumps({"error": msg})
        if N != len(labels):
             msg = f"[PY] ERROR: Mismatch between distance matrix size ({N}x{N}) and labels length ({len(labels)})."
             js.console.error(msg)
             return json.dumps({"error": msg})

        # Recalculate num_clusters if invalid
        if not isinstance(num_clusters, int) or num_clusters <= 0:
             guess = math.sqrt(N) / 2
             num_clusters = max(2, int(math.ceil(guess)))
             js.console.warn(f"[PY] Invalid num_clusters received by pearson, recalculating to: {num_clusters}")

        # Ensure num_clusters is feasible (Linkage matrix has N-1 rows/merges)
        if num_clusters >= N:
             js.console.warn(f"[PY] num_clusters ({num_clusters}) >= N ({N}). Adjusting num_clusters to N-1.")
             num_clusters = max(1, N - 1) # At least 1 cluster, max N-1 splits possible via fcluster

        js.console.log(f"[PY] Pearson func clustering method: {method}, final num_clusters: {num_clusters}")

        # Perform clustering
        # Ensure matrix is finite (no NaN/Infinity) before squareform
        if not np.all(np.isfinite(distance_matrix)):
             msg = "[PY] ERROR: Distance matrix contains non-finite values (NaN or Infinity)."
             js.console.error(msg)
             # Optionally log where the non-finite values are
             # js.console.log(str(distance_matrix[~np.isfinite(distance_matrix)]))
             return json.dumps({"error": msg})

        condensed = squareform(distance_matrix, checks=False)
        linked = linkage(condensed, method=method)

        # js.console.log("[PY] Linkage matrix (sample):", str(linked[:5]))

        dendro = dendrogram(linked, labels=labels, no_plot=True)
        cluster_assignments = fcluster(linked, num_clusters, criterion="maxclust")
        js.console.log("[PY] Cluster assignments from fcluster:", str(cluster_assignments))

    except Exception as e:
        msg = f"[PY] ERROR during clustering (pearson): {e}"
        js.console.error(msg)
        # import traceback
        # js.console.error(traceback.format_exc())
        return json.dumps({"error": msg})

    # Format results
    leaves_order = dendro["leaves"]
    ordered_labels = [labels[i] for i in leaves_order]
    ordered_clusters = [cluster_assignments[i] for i in leaves_order]

    result = {
        "clusterAssignments": cluster_assignments.tolist(),
        "leavesOrder": leaves_order,
        "orderedLabels": ordered_labels,
        "orderedClusters": ordered_clusters,
        "linkageMatrix": linked.tolist(),
    }

    result_converted = convert_np(result)
    js.console.log("[PY] hierarchical_clustering_pearson result (assignments sample):", str(result_converted.get("clusterAssignments", [])[:10]))
    js.console.log("=== [PY] hierarchical_clustering_pearson END ===\n")
    return json.dumps(result_converted)

