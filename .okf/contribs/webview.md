---
type: Package
title: okforge webview
description: Static-website generator that bakes an OKF bundle into a dependency-free site browsable from file://.
resource: contribs/webview/
tags: [contrib, webview, static-site, graph, deploy]
timestamp: 2026-06-30
---

# Overview

`okforge-webview` is a contrib (not part of the published `okforge` npm package)
that renders an OKF bundle as a **static website**: concept pages with rendered
markdown and inbound/outbound link panels, an overview dashboard, an interactive
concept graph, and search. It reuses the same graph engine as the CLI
([OkfGraph](../runtime_concepts/okf_graph.md)), so the site stays consistent with
[graph](../cli_commands/graph.md) and [check](../cli_commands/check.md). The
generated output has no runtime dependencies and opens directly from `file://`.

# How it works

The `WebviewGenerator` class in `contribs/webview/src/generate.ts`:

1. Builds the bundle graph with `OkfGraph.build(root)`.
2. **Bakes** every concept node into a `BakedConcept` (graph metadata plus the
   raw markdown body read from disk) and every reserved file (`index.md`,
   `log.md`) into a `reserved` map keyed by bundle path.
3. Computes an `overview` mirroring `okforge graph overview` (concept count,
   per-folder groups, top-10 hubs, orphans, broken links).
4. Copies the static `template/` verbatim into the output and writes the data
   island to `data.js` as `window.__OKF__ = { ... }`.

The browser app (`template/app.js`, `index.html`, `styles.css`,
`vendor/marked.min.js`) reads `window.__OKF__` — nothing is fetched at runtime.

# Baked data shape

`window.__OKF__` (`BakedData`):

| Field | Meaning |
| --- | --- |
| `root` | Basename of the bundle directory. |
| `generatedAt` | ISO 8601 generation timestamp. |
| `concepts` | Array of `BakedConcept`, sorted by `id`. |
| `reserved` | Raw bodies of `index.md` / `log.md`, keyed by bundle path. |
| `overview` | Concept count, groups, hubs, orphans, broken links. |

`BakedConcept` fields: `id`, `file`, `group` (top-level folder, `<root>` for
root concepts), `type`, `title`, `description`, `tags`, `outbound`, `inbound`,
`broken`, `markdown`.

# CLI

`okforge-webview` (Commander):

| Option | Default | Meaning |
| --- | --- | --- |
| `-b, --bundle <dir>` | `<repo>/.okf` | OKF bundle root to render. |
| `-o, --out <dir>` | `contribs/webview/dist` | Output directory for the static site. |

The generator throws when the `--bundle` path is missing or is not a directory.

# Build and deploy

Repo-root npm scripts (defined in the top-level `package.json`):

| Script | Action |
| --- | --- |
| `webview:build` | `tsx src/generate.ts` — bundle `./.okf` → `contribs/webview/dist`. |
| `webview:open` | Build, then open `dist/index.html`. |
| `webview:deploy` | Build, then run `scripts/webview_deploy.sh` to force-push `dist/` to the `gh-pages` branch as a single fresh commit (with a `.nojekyll` marker). |

# Citations

- [`contribs/webview/src/generate.ts`](../../contribs/webview/src/generate.ts)
- [`contribs/webview/package.json`](../../contribs/webview/package.json)
- [`contribs/webview/README.md`](../../contribs/webview/README.md)
- [`contribs/webview/template/`](../../contribs/webview/template/)
