# src/py/categoryClustering.py

import json
import math
import numpy as np
import pandas as pd
from scipy.spatial.distance import squareform
from scipy.cluster.hierarchy import linkage, dendrogram, fcluster
import js

print("=== categoryClustering.py LOADED ===")


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
# Existing clustering function: expects a JSON string with "distanceMatrix" and "labels".
##############################################################################
def hierarchical_clustering_pearson(
    distance_data_json: str, method: str = "average", num_clusters: int = 0
) -> str:
    """
    Performs hierarchical clustering on an NxN distance matrix.
    Expects 'distance_data_json' to be a JSON string that decodes to a dict:
      {
        "distanceMatrix": NxN array,
        "labels": array of strings
      }
    If num_clusters <= 0, a heuristic of int(sqrt(N)/2) (minimum 2) is used.

    Returns a JSON string with:
      {
        "clusterAssignments": [ ... ],
        "leavesOrder": [ ... ],
        "orderedLabels": [ ... ],
        "orderedClusters": [ ... ],
        "linkageMatrix": Nx4 array representing the hierarchical clustering linkage
      }
    """
    print("=== [PY] hierarchical_clustering_pearson START ===")
    print("[PY] Received distance_data_json:")
    print(distance_data_json)

    try:
        data = json.loads(distance_data_json)
    except Exception as e:
        msg = f"[PY] ERROR in json.loads: {e}"
        print(msg)
        return json.dumps({"error": msg})

    print("[PY] After json.loads, data type:", type(data))
    print("[PY] data:", data)

    if not isinstance(data, dict):
        msg = (
            "[PY] ERROR: data is not a dict. Expected keys: 'distanceMatrix', 'labels'"
        )
        print(msg)
        return json.dumps({"error": msg, "data_repr": str(data)})

    if "distanceMatrix" not in data:
        msg = (
            "[PY] ERROR: 'distanceMatrix' key missing in data. Available keys: "
            + str(list(data.keys()))
        )
        print(msg)
        return json.dumps({"error": msg})

    if "labels" not in data:
        msg = "[PY] ERROR: 'labels' key missing in data. Available keys: " + str(
            list(data.keys())
        )
        print(msg)
        return json.dumps({"error": msg})

    try:
        distance_matrix = np.array(data["distanceMatrix"], dtype=float)
    except Exception as e:
        msg = f"[PY] ERROR converting distanceMatrix to numpy array: {e}"
        print(msg)
        return json.dumps({"error": msg})

    labels = data["labels"]
    print("[PY] distance_matrix shape:", distance_matrix.shape)
    print("[PY] labels:", labels)

    N = distance_matrix.shape[0]
    if num_clusters <= 0:
        guess = int(math.sqrt(N) / 2)
        num_clusters = max(2, guess)
    print(f"[PY] Clustering method: {method}, num_clusters: {num_clusters}")

    try:
        condensed = squareform(distance_matrix, checks=False)
        linked = linkage(condensed, method=method)
        dendro = dendrogram(linked, labels=labels, no_plot=True)
        cluster_assignments = fcluster(linked, num_clusters, criterion="maxclust")
    except Exception as e:
        msg = f"[PY] ERROR during clustering: {e}"
        print(msg)
        return json.dumps({"error": msg})

    leaves_order = dendro["leaves"]
    ordered_labels = [labels[i] for i in leaves_order]
    ordered_clusters = [cluster_assignments[i] for i in leaves_order]

    result = {
        "clusterAssignments": cluster_assignments.tolist(),
        "leavesOrder": leaves_order,
        "orderedLabels": ordered_labels,
        "orderedClusters": ordered_clusters,
        "linkageMatrix": linked.tolist(),  # Added for knee plot data.
    }

    # Convert any NumPy types to native Python types.
    result_converted = convert_np(result)
    print("[PY] hierarchical_clustering_pearson result:", result_converted)
    print("=== [PY] hierarchical_clustering_pearson END ===\n")
    return json.dumps(result_converted)


##############################################################################
# New function: hierarchical_clustering_from_rows
##############################################################################

def hierarchical_clustering_from_rows(
    row_data_json: str, method: str = "average", num_clusters: int = 0
) -> str:
    js.console.log("=== [PY] hierarchical_clustering_from_rows START ===")
    js.console.log("[PY] Received row_data_json:")
    js.console.log(row_data_json)

    try:
        row_list = json.loads(row_data_json)
    except Exception as e:
        msg = f"[PY] ERROR in json.loads for row_data: {e}"
        js.console.log(msg)
        return json.dumps({"error": msg})

    if not isinstance(row_list, list):
        msg = f"[PY] ERROR: Expected a list, got {type(row_list)}"
        js.console.log(msg)
        return json.dumps({"error": msg, "data_repr": str(row_list)})

    js.console.log(f"[PY] Number of rows: {len(row_list)}")

    def parse_genes(s: str) -> set:
        if not s:
            return set()
        return set(x.strip() for x in s.split(";") if x.strip())

    row_sets = []
    labels = []
    for i, row in enumerate(row_list):
        # Retrieve the required Category ID.
        cat_id = row.get("Category ID")
        if cat_id is None:
            cat_id = row.get("categoryIdentifier", {}).get("id", "")
        if not cat_id:
            msg = f"[PY] ERROR: Row {i} missing required 'Category ID' value."
            js.console.log(msg)
            return json.dumps({"error": msg, "data_repr": str(row)})

        # Build composite label:
        # Start with Category ID, then include all other keys (except the ones for clustering).
        label_parts = [f"Category ID: {cat_id}"]
        for key, value in row.items():
            # Skip the keys used for gene sets and those already incorporated.
            if key in ["Genes Up", "Genes Down", "Category ID", "categoryIdentifier"]:
                continue
            label_parts.append(f"{key}: {value}")
        composite_label = " | ".join(label_parts)
        labels.append(composite_label)

        # Process gene sets.
        up = parse_genes(row.get("Genes Up", ""))
        down = parse_genes(row.get("Genes Down", ""))
        active_set = up.union(down)
        row_sets.append(active_set)

    if len(row_sets) == 0:
        msg = "[PY] ERROR: No row data available after processing."
        js.console.log(msg)
        return json.dumps({"error": msg})

    js.console.log("[PY] Example active set for first row:")
    js.console.log(str(row_sets[0]))
    js.console.log("[PY] Labels:")
    js.console.log(labels)

    N = len(row_sets)
    distance_matrix = np.zeros((N, N), dtype=float)
    for i in range(N):
        for j in range(i, N):
            A = row_sets[i]
            B = row_sets[j]
            if not A and not B:
                d = 0.0
            else:
                d = 1 - (len(A.intersection(B)) / len(A.union(B)))
            distance_matrix[i, j] = d
            distance_matrix[j, i] = d

    js.console.log("[PY] Constructed distance matrix with shape:")
    js.console.log(distance_matrix.shape)

    # Compute num_clusters if not provided:
    if num_clusters <= 0:
        guess = math.sqrt(N) / 2
        num_clusters = max(2, int(math.ceil(guess)))
    js.console.log(f"[PY] Clustering parameters: method={method}, num_clusters={num_clusters}")

    distance_data = {"distanceMatrix": distance_matrix.tolist(), "labels": labels}
    distance_data_json = json.dumps(distance_data)
    js.console.log("[PY] Built distance_data for clustering (truncated):")
    js.console.log(distance_data_json[:300] + "...")

    result_json = hierarchical_clustering_pearson(
        distance_data_json, method=method, num_clusters=num_clusters
    )
    js.console.log("=== [PY] hierarchical_clustering_from_rows END ===")
    return result_json