#!/bin/bash

# Script to concatenate the content of all files within the 'src' directory.

# Define the source directory
SOURCE_DIR="src"
# Define the output file (optional, remove redirection below to print to stdout)
OUTPUT_FILE="combined_src_content.txt"

# Check if the source directory exists
if [[ ! -d "$SOURCE_DIR" ]]; then
  # Print error message to standard error
  echo "Error: Directory '$SOURCE_DIR' not found in the current location." >&2
  # Exit with a non-zero status to indicate failure
  exit 1
fi

# Check if the source directory is empty of files
# The find command itself will handle this, but we can add an explicit check
if ! find "$SOURCE_DIR" -type f -print -quit | grep -q .; then
    echo "Info: No files found in '$SOURCE_DIR'." >&2
    # Decide if you want to exit or create an empty output file
    # exit 0 # Exit successfully
    > "$OUTPUT_FILE" # Create an empty output file
    exit 0
fi


echo "Concatenating files from '$SOURCE_DIR' into '$OUTPUT_FILE'..."

# Clear the output file or create it if it doesn't exist
> "$OUTPUT_FILE"

# Find all files within the source directory (recursively)
# -type f ensures we only get files, not directories
# -print0 uses null characters as separators for safe filename handling
# The while loop reads each null-separated filename into the 'file' variable
find "$SOURCE_DIR" -type f -print0 | while IFS= read -r -d $'\0' file; do
  # Check if the file is readable before attempting to cat
  if [[ -r "$file" ]]; then
    # Append the content of the current file to the output file
    cat "$file" >> "$OUTPUT_FILE"
    # Append a newline between files (optional, remove if not desired)
    # echo "" >> "$OUTPUT_FILE"
  else
    # Print a warning to standard error if a file cannot be read
    echo "Warning: Skipping unreadable file '$file'." >&2
  fi
done

echo "Concatenation complete. Output saved to '$OUTPUT_FILE'."

# Exit successfully
exit 0

