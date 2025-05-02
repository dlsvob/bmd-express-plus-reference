#!/usr/bin/env bash

# Script to concatenate non-hidden files in a directory tree,
# adding a decorative header with the file path before each file's content.
# Skips hidden files (.*) and hidden directories (./.*, path/to/.*/).
# Replaces the content of 'referenceUmapData.ts' with predefined literal text.

# --- Configuration ---
DEFAULT_OUTPUT_FILE="concatenated_output.txt"
SEARCH_DIR="." # Default to current directory
TARGET_FILENAME="referenceUmapData.ts"

# --- Usage Instructions ---
usage() {
  echo "Usage: $0 [<search_directory>] [<output_file>]"
  echo "  Concatenates all non-hidden files found recursively within <search_directory>."
  echo "  Skips files and directories starting with '.'."
  echo "  Replaces the content of '$TARGET_FILENAME' with predefined text."
  echo "  Each file's content is preceded by a decorative header."
  echo ""
  echo "  Arguments:"
  echo "    <search_directory> : Directory to search (default: '$SEARCH_DIR')"
  echo "    <output_file>      : File to write the output (default: '$DEFAULT_OUTPUT_FILE')"
  exit 1
}

# --- Argument Parsing ---
if [ "$#" -ge 1 ]; then
  if [ "$1" != "-" ]; then
    SEARCH_DIR="$1"
  fi
fi
if [ "$#" -ge 2 ]; then
  OUTPUT_FILE="$2"
else
  OUTPUT_FILE="$DEFAULT_OUTPUT_FILE"
fi

# --- Input Validation ---
if [ ! -d "$SEARCH_DIR" ]; then
  echo "Error: Search directory '$SEARCH_DIR' not found or is not a directory."
  usage
fi

echo "Starting concatenation (skipping hidden files/directories, replacing $TARGET_FILENAME)..."
echo "Searching in directory: '$SEARCH_DIR'"
echo "Output will be written to: '$OUTPUT_FILE'"

# --- Main Logic ---
# Clear the output file first
> "$OUTPUT_FILE"

# Find files and append to the output file
find "$SEARCH_DIR" \
    -type f \
    -not -path '*/.*' \
    -not -name '.*' \
    -exec sh -c '
    filepath="$1"
    output_file="$2" # Pass output file path to subshell
    target_filename="$3" # Pass target filename to subshell

    # Ensure filepath variable is set
    if [ -z "$filepath" ]; then
      echo "Warning: Skipping empty filepath." >&2 # Output warning to stderr
      exit 0 # Skip if filepath is somehow empty
    fi

    # Get the basename
    filename=$(basename "$filepath")

    # Append the decorative header to the output file
    # Use echo for simplicity here, ensure redirection works
    echo "" >> "$output_file" || { echo "Error: Failed writing newline for $filepath" >&2; exit 1; }
    echo "*********************** $filepath **********************" >> "$output_file" || { echo "Error: Failed writing header for $filepath" >&2; exit 1; }
    echo "" >> "$output_file" || { echo "Error: Failed writing newline for $filepath" >&2; exit 1; }


    # Check if the current file is the target file
    if [ "$filename" = "$target_filename" ]; then
      # Append the predefined literal text for the target file
      cat << '\''EOF_LITERAL'\'' >> "$output_file" || { echo "Error: Failed writing literal for $filepath" >&2; exit 1; }
// referenceUmapData.ts
// Generated from anc2vec_embeddings_umap_projection_coordinates_hdbscan_clusters_40-500.csv on 2025-04-01T21:04:09.073Z

export interface ReferenceUmapItem {
    UMAP_1: number;
    UMAP_2: number;
    go_id: string;
    go_term: string;
    cluster_id: number | string;
}

export const hardcodedReferenceData: ReferenceUmapItem[] = [
  {
    UMAP_1: 2.474537,
    UMAP_2: 3.0138018,
    go_id: "GO:0000018",
    go_term: "regulation of DNA recombination",
    cluster_id: 31
  },
  {
    UMAP_1: 4.9465723,
    UMAP_2: 8.264491,
    go_id: "GO:0000041",
    go_term: "transition metal ion transport",
    cluster_id: 23
  },
  {
    UMAP_1: 0.70998514,
    UMAP_2: 6.0801253,
    go_id: "GO:2001258",
    go_term: "negative regulation of cation channel activity",
    cluster_id: 0
  },
  {
    UMAP_1: 0.5749287,
    UMAP_2: 6.2721424,
    go_id: "GO:2001259",
    go_term: "positive regulation of cation channel activity",
    cluster_id: 0
  }
];

console.log(`[referenceUmapData] Loaded ${hardcodedReferenceData.length} hardcoded reference points.`);
EOF_LITERAL
    else
      # Append the actual content for all other files
      cat "$filepath" >> "$output_file" || { echo "Error: Failed writing content for $filepath" >&2; exit 1; }
    fi
' _ {} "$OUTPUT_FILE" "$TARGET_FILENAME" \; # Pass OUTPUT_FILE and TARGET_FILENAME as arguments $2 and $3

# Check the final exit status of find
find_status=$?
if [ $find_status -eq 0 ]; then
  echo "Successfully concatenated non-hidden files to '$OUTPUT_FILE' (replaced $TARGET_FILENAME)."
else
  echo "An error occurred during the find/concatenation process (exit status: $find_status)."
  # Output file might be partially written
  exit 1
fi

exit 0
