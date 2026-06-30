#!/usr/bin/env bash
#
# Mirror dotclaude_folder/ into .claude/ as a tree of relative symlinks, so the
# okforge and okforge-query skills are live in this repo's own .claude/ while their
# tracked source stays in dotclaude_folder/. Idempotent: existing symlinks are
# refreshed, real files (e.g. .claude/settings.json) are left untouched.

set -euo pipefail

# Run from the repository root regardless of the caller's working directory.
cd "$(dirname "$0")/.."

SRC_ROOT="dotclaude_folder"
DST_ROOT=".claude"

if [ ! -d "$SRC_ROOT" ]; then
	echo "error: $SRC_ROOT not found (run from the okforge repo root)" >&2
	exit 1
fi

linked=0
skipped=0

while IFS= read -r src; do
	rel="${src#"$SRC_ROOT"/}"
	dest="$DST_ROOT/$rel"
	mkdir -p "$(dirname "$dest")"

	# Refresh our own symlinks; never overwrite a real file.
	if [ -L "$dest" ]; then
		rm "$dest"
	elif [ -e "$dest" ]; then
		echo "skip (real file exists): $dest"
		skipped=$((skipped + 1))
		continue
	fi

	target="$(python3 -c 'import os, sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))' "$src" "$(dirname "$dest")")"
	ln -s "$target" "$dest"
	echo "link $dest -> $target"
	linked=$((linked + 1))
done < <(find "$SRC_ROOT" -type f)

echo ""
echo "$linked symlink(s) created/refreshed, $skipped real file(s) skipped → $DST_ROOT/"
