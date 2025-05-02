# src/py/categoryClustering.py
import math
import numpy as np
import pandas as pd
from scipy.spatial.distance import squareform
from scipy.cluster.hierarchy import linkage, dendrogram, fcluster
import js # Use js.console.log/error for debugging in Pyodide
# import traceback # Uncomment for detailed tracebacks if needed
import json

print("=== categoryClustering.py LOADED (v3 - Include Gene Strings in Label) ===") # Version Bump


###########################################################################
# Helper function to convert NumPy types to native Python types for JSON. #
###########################################################################
def convert_np(o):
    if isinstance(o, np.generic):
        return o.item()
    if isinstance(o, (list, tuple)):
        return [convert_np(x) for x in o]
    if isinstance(o, dict):
        return {k: convert_np(v) for k, v in o.items()}
    return o


###########################################################
# Clustering function expecting direct list/PyProxy input #
###########################################################
def hierarchical_clustering_from_rows(
    row_data_obj, # Expects JS array -> Python list or PyProxy
    method: str = "average",
    num_clusters: int = 0
) -> str:
    js.console.log("=== [PY] hierarchical_clustering_from_rows START (v3) ===") # Version Bump
    js.console.log("[PY DEBUG] Raw input type:", type(row_data_obj))

    row_list = None
    try:
        if hasattr(row_data_obj, 'to_py'):
            js.console.log("[PY DEBUG] Input is PyProxy, converting with .to_py()")
            row_list = row_data_obj.to_py()
        elif isinstance(row_data_obj, list):
             js.console.log("[PY DEBUG] Input is already Python list.")
             row_list = row_data_obj
        else:
            js.console.warn("[PY DEBUG] Input is not PyProxy or list, attempting to use directly. Type:", type(row_data_obj))
            row_list = row_data_obj

        js.console.log("[PY DEBUG] Processed row_list type:", type(row_list))

    except Exception as e:
        js.console.error("[PY DEBUG] !!! EXCEPTION during data handling/conversion !!!", e)
        msg = f"[PY DEBUG] ERROR during data handling: {e}"
        return json.dumps({"error": msg, "input_repr": repr(row_data_obj)})

    if not isinstance(row_list, list):
        msg = f"[PY] ERROR: Expected a list after handling input, got {type(row_list)}"
        js.console.error(msg)
        js.console.error("[PY] Value that failed isinstance(list):", repr(row_list))
        return json.dumps({"error": msg, "processed_data_repr": repr(row_list)})

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
        if not hasattr(row, 'get'):
             msg = f"[PY] ERROR: Row {i} is not a dictionary-like object. Type: {type(row)}"
             js.console.error(msg)
             return json.dumps({"error": msg, "row_repr": repr(row)})

        cat_id = row.get("Category ID", "")
        if not cat_id:
            msg = f"[PY] ERROR: Row {i} missing required 'Category ID' value."
            js.console.error(msg)
            return json.dumps({"error": msg, "data_repr": str(row)})

        label_parts = []
        items_to_iterate = row.items() if isinstance(row, dict) else row

        # Store the gene strings separately first to ensure they are included
        # Use .get() to safely handle potentially missing keys
        genes_up_str = row.get("Genes Up", "")
        genes_down_str = row.get("Genes Down", "")
        all_genes_str = row.get("All Genes", "")

        # Add required fields first
        label_parts.append(f"Category ID: {cat_id}")
        # Explicitly add the gene strings to the label parts
        label_parts.append(f"Genes Up: {genes_up_str}")
        label_parts.append(f"Genes Down: {genes_down_str}")
        label_parts.append(f"All Genes: {all_genes_str}")

        # Iterate through the rest of the items for other metadata
        for key, value in items_to_iterate:
            # Skip keys already handled or not desired in the label
            if key in ["Category ID", "categoryIdentifier", "Genes Up", "Genes Down", "All Genes"]:
                continue
            # Ensure value is stringified properly if it's not already a string
            label_parts.append(f"{key}: {str(value)}")

        composite_label = " | ".join(label_parts)
        labels.append(composite_label)

        # Process gene sets using keys expected from JS (for Jaccard distance)
        # Uses the original strings for set creation
        up = parse_genes(genes_up_str)
        down = parse_genes(genes_down_str)
        active_set = up.union(down)
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
                d = 0.0
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
    distance_data = {"distanceMatrix": distance_matrix.tolist(), "labels": labels}
    distance_data_json_for_pearson = json.dumps(distance_data)

    # --- Call the pearson function ---
    result_json = hierarchical_clustering_pearson(
        distance_data_json_for_pearson,
        method=method,
        num_clusters=num_clusters
    )
    js.console.log("=== [PY] hierarchical_clustering_from_rows END (v3) ===") # Version Bump
    return result_json


####################################################################################################
# Clustering function: expects a standard JSON string with "distanceMatrix" and "labels". #
####################################################################################################
def hierarchical_clustering_pearson(
    distance_data_json: str,
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

    data = None
    try:
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

        if not isinstance(num_clusters, int) or num_clusters <= 0:
             guess = math.sqrt(N) / 2
             num_clusters = max(2, int(math.ceil(guess)))
             js.console.warn(f"[PY] Invalid num_clusters received by pearson, recalculating to: {num_clusters}")

        if num_clusters >= N:
             js.console.warn(f"[PY] num_clusters ({num_clusters}) >= N ({N}). Adjusting num_clusters to N-1.")
             num_clusters = max(1, N - 1)

        js.console.log(f"[PY] Pearson func clustering method: {method}, final num_clusters: {num_clusters}")

        if not np.all(np.isfinite(distance_matrix)):
             msg = "[PY] ERROR: Distance matrix contains non-finite values (NaN or Infinity)."
             js.console.error(msg)
             return json.dumps({"error": msg})

        condensed = squareform(distance_matrix, checks=False)
        linked = linkage(condensed, method=method)

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

