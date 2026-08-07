#!/usr/bin/env sh
set -e

DRY_RUN=0
FORCE=0

usage() {
  echo "Usage: $0 [OPTIONS] <target-directory>"
  echo
  echo "Copy AGENTS.md, .agents/, and .kilo/ to a target directory."
  echo
  echo "Options:"
  echo "  --dry-run   Show what would be copied without making changes"
  echo "  --force     Overwrite existing files without prompting"
  echo "  --help      Show this help message"
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --help)
      usage
      ;;
    -*)
      echo "Unknown option: $1"
      usage
      ;;
    *)
      TARGET="$1"
      shift
      ;;
  esac
done

if [ -z "$TARGET" ]; then
  echo "Error: target directory is required"
  usage
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCES="AGENTS.md .agents .kilo"

copy_item() {
  src="$1"
  dst="$2"

  if [ ! -e "$REPO_ROOT/$src" ]; then
    echo "SKIP: $src does not exist in source"
    return
  fi

  if [ -e "$dst" ] && [ "$FORCE" -ne 1 ]; then
    echo "EXISTS: $dst already exists (use --force to overwrite)"
    return
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "COPY: $src -> $dst"
    return
  fi

  if [ -d "$REPO_ROOT/$src" ]; then
    mkdir -p "$dst"
    cp -rf "$REPO_ROOT/$src/." "$dst/"
  else
    mkdir -p "$(dirname "$dst")"
    cp -f "$REPO_ROOT/$src" "$dst"
  fi
  echo "COPY: $src -> $dst"
}

mkdir -p "$TARGET"

for src in $SOURCES; do
  copy_item "$src" "$TARGET/$src"
done

if [ "$DRY_RUN" -eq 1 ]; then
  echo
  echo "Dry run complete. No files were modified."
else
  echo
  echo "Distillation complete."
fi
