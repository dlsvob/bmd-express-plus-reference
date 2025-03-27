#!/bin/zsh
set -euo pipefail

# Default settings
DIR="."
EXCLUDE_FILE="do_not_concatenate_list.txt"
OUTPUT_FILE="concatenated_output.txt"
RECURSIVE=0  # Non-recursive by default

# Function to display usage instructions
function usage() {
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -r, --recursive     Process files recursively."
  echo "  -h, --help          Display this help message."
  exit 1
}

# Parse command-line arguments
while (( "$#" )); do
  case "$1" in
    -r|--recursive)
      RECURSIVE=1
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

# Ensure the exclude file exists
if [[ ! -f "$EXCLUDE_FILE" ]]; then
  echo "Exclude file '$EXCLUDE_FILE' not found!"
  exit 1
fi

# Read the exclude list into an array, trimming any trailing slash
exclude_list=()
while IFS= read -r line; do
  line="${line%/}"  # Remove trailing slash if present
  [[ -n "$line" ]] && exclude_list+=("$line")
done < "$EXCLUDE_FILE"

# Use zsh's native globbing to get files
if [[ "$RECURSIVE" -eq 1 ]]; then
  # Recursive: match all files under DIR
  files=("${(f)$(print -l "$DIR"/**/*(.))}")
else
  # Non-recursive: only files in DIR
  files=("${(f)$(print -l "$DIR"/*(.))}")
fi

# Filter out the exclude file and the output file.
files_to_concatenate=()
for file in "${files[@]}"; do
  # Get file relative path (remove leading "./" if present)
  relative_path="${file#$DIR/}"
  relative_path="${relative_path#./}"
  
  # Skip the exclusion file and the output file (by name)
  if [[ "$relative_path" == "$EXCLUDE_FILE" ]] || [[ "$relative_path" == "$OUTPUT_FILE" ]]; then
    continue
  fi

  # Check against each entry in the exclusion list
  skip=false
  for exclude in "${exclude_list[@]}"; do
    if [[ "$relative_path" == "$exclude" || "$relative_path" == "$exclude/"* ]]; then
      skip=true
      break
    fi
  done

  $skip && continue
  files_to_concatenate+=("$file")
done

# Exit if there are no files to concatenate
if [[ ${#files_to_concatenate[@]} -eq 0 ]]; then
  echo "No files to concatenate."
  exit 0
fi

# Truncate or create the output file
: > "$OUTPUT_FILE"

# Concatenate files with separators
for file in "${files_to_concatenate[@]}"; do
  # Get relative path for the header
  relative_path="${file#$DIR/}"
  relative_path="${relative_path#./}"
  
  {
    echo ""
    echo ""
    echo "**********  $relative_path  **********"
    echo ""
    echo ""
  } >> "$OUTPUT_FILE"
  
  cat "$file" >> "$OUTPUT_FILE"
done

echo "Files concatenated into '$OUTPUT_FILE' with separators."
