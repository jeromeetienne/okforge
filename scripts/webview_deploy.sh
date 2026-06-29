#!/usr/bin/env bash
#
# Publish the generated OKF webview (contribs/webview/dist) to the gh-pages
# branch of origin, so GitHub Pages serves it. The branch is overwritten each
# deploy with a single fresh commit — the site is a build artifact, not history.
# Run `npm run webview:build` first (the webview:deploy script chains both).

set -euo pipefail

# Run from the repository root regardless of the caller's working directory.
cd "$(dirname "$0")/.."

DIST="contribs/webview/dist"
BRANCH="gh-pages"

if [ ! -f "$DIST/index.html" ]; then
	echo "error: $DIST/index.html not found — run 'npm run webview:build' first" >&2
	exit 1
fi

REMOTE_URL="$(git remote get-url origin)"
COMMIT="$(git rev-parse --short HEAD)"

# Publish from a throwaway repo inside the (gitignored) dist directory and force
# a single-commit branch. .nojekyll lets Pages serve files/folders verbatim.
(
	cd "$DIST"
	rm -rf .git
	touch .nojekyll
	git init -q
	git checkout -q -b "$BRANCH"
	git add -A
	git commit -q -m "Deploy webview (source $COMMIT)"
	git push -f "$REMOTE_URL" "$BRANCH"
	rm -rf .git
)

echo ""
echo "published $DIST to $BRANCH on origin"
echo "enable Pages at: https://github.com/jeromeetienne/okforge/settings/pages (branch: $BRANCH, folder: /)"
