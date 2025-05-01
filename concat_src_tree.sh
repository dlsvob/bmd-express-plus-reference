#!/bin/bash

# Script to concatenate the content of all files within the 'src' directory,
# filtering out specific multi-line blocks after the first N occurrences.

# Define the source directory
SOURCE_DIR="src"
# Define the output file
OUTPUT_FILE="combined_filtered_src_content.txt"
# Define the maximum number of blocks to keep
KEEP_COUNT=3

# --- Start Pattern ---
# Matches lines starting with optional whitespace followed by '{'
# Adjust if your block start is more specific
START_PATTERN='^[[:space:]]*\{'
# --- End Pattern ---
# Matches lines starting with optional whitespace followed by '},'
# Adjust if your block end is more specific
END_PATTERN='^[[:space:]]*\},'

# Check if the source directory exists
if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Error: Directory '$SOURCE_DIR' not found in the current location." >&2
  exit 1
fi

# Check if the source directory is empty of files
if ! find "$SOURCE_DIR" -type f -print -quit | grep -q .; then
    echo "Info: No files found in '$SOURCE_DIR'." >&2
    > "$OUTPUT_FILE" # Create an empty output file
    exit 0
fi

echo "Concatenating files from '$SOURCE_DIR', filtering blocks, into '$OUTPUT_FILE'..."

# Find all files, concatenate their content, and pipe through awk for filtering
find "$SOURCE_DIR" -type f -print0 | while IFS= read -r -d $'\0' file; do
  if [[ -r "$file" ]]; then
    cat "$file"
    # Optional: Add a newline between files if structure might depend on it
    # echo ""
  else
    echo "Warning: Skipping unreadable file '$file'." >&2
  fi
done | awk -v start_pattern="$START_PATTERN" \
           -v end_pattern="$END_PATTERN" \
           -v keep_count="$KEEP_COUNT" '
# awk script for filtering blocks:
#   count: Tracks how many target blocks we have encountered.
#   in_block: Flag (0 or 1) indicating if we are currently inside a target block.
#   buffer: Stores the lines of the current block being processed (only if keeping).

# Match the start pattern of the block
$0 ~ start_pattern {
    in_block = 1
    count++
    if (count <= keep_count) {
        # Start buffering only if we intend to keep this block
        buffer = $0
    }
    # Always consume the line with "next", regardless of keeping or skipping
    next
}

# Match the end pattern of the block
$0 ~ end_pattern {
    if (in_block) {
        # We are ending a block (either one we kept or one we skipped)
        if (count <= keep_count) {
            # This was a block we were keeping and buffering
            buffer = buffer "\n" $0
            print buffer
        }
        # Else (count > keep_count), we were skipping, so do nothing just reset state.

        # Reset state after handling the end of any block
        in_block = 0
        buffer = ""
        next # Consume the end line and skip other rules for this line
    }
    # If in_block was false, this end pattern is just regular content.
    # Fall through to the "!in_block" rule below.
}

# Process lines while inside a block (but not the start/end lines)
in_block {
    if (count <= keep_count) {
        # Append to buffer only if we are keeping this block
        buffer = buffer "\n" $0
    }
    # Else (count > keep_count), we are skipping, so do nothing with the line.

    # Always consume the line with "next" while in a block
    next
}

# Process lines that are *not* inside a block we are tracking/skipping.
# This rule executes only if "next" was not called by previous rules.
# It means:
# 1. The line is outside any block.
# 2. The line matched end_pattern, but in_block was false.
!in_block {
    print $0
}

# Optional: Handle case where the input ends while inside a block we were keeping
END {
    if (in_block && count <= keep_count && buffer != "") {
         # If we were buffering a block to keep and input ended abruptly
         print buffer
    }
}
' > "$OUTPUT_FILE" # Redirect the final filtered output from awk to the file

# Check the exit status of the pipe (specifically awk, the last command)
if [[ $? -ne 0 ]]; then
    echo "Error: Filtering process (awk) failed." >&2
    # Optional: remove potentially incomplete output file
    # rm -f "$OUTPUT_FILE"
    exit 1 # Exit with failure status
fi

echo "Concatenation and filtering complete. Output saved to '$OUTPUT_FILE'."

exit 0
