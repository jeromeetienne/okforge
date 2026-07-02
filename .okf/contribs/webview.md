---
type: Package
title: okforge webview
description: Static-website generator that bakes an OKF bundle into a dependency-free site, plus its GitHub Pages deploy tooling.
resource: contribs/webview/
tags: [contrib, webview, static-site, graph, deploy]
timestamp: 2026-07-02
---

# Overview

The webview renders an OKF bundle as a **static website**: concept pages with
rendered markdown and inbound/outbound link panels, an overview dashboard, an
interactive concept graph, and search. The generated output has no runtime
dependencies and opens directly from `file://`.

The generator is now part of the published `okforge` CLI — the
[webview](../cli_commands/webview.md) command (`generate` / `show`), implemented
by `WebviewCommand` in `src/commands/webview_command.ts`. This `contribs/webview/`
folder holds only the GitHub Pages **deploy tooling** (`package.json` convenience
scripts) and the generated `dist/` artifact. The generator reuses the same graph
engine as the CLI ([OkfGraph](../runtime_concepts/okf_graph.md)), so the site
stays consistent with [graph](../cli_commands/graph.md) and
[check](../cli_commands/check.md).

# How it works

`WebviewCommand` (`src/commands/webview_command.ts`):

1. Resolves the bundle source with `resolveBundle` — a local directory is used in
   place; an http(s) URL is downloaded into a temp directory first by
   [OkfFetch](../runtime_concepts/okf_fetch.md) and then treated as local.
2. Builds the bundle graph with `OkfGraph.build(root)`.
3. **Bakes** every concept node into a `BakedConcept` (graph metadata plus the
   raw markdown body read from disk) and every reserved file (`index.md`,
   `log.md`) into a `reserved` map keyed by bundle path.
4. Computes an `overview` mirroring `okforge graph overview` (concept count,
   per-folder groups, top-10 hubs, orphans, broken links).
5. Copies the static app template (`src/webview/template/`) verbatim into the
   output and writes the data island to `data.js` as `window.__OKF__ = { ... }`.

`generate` writes the site to a chosen output folder; `show` writes it to a temp
directory and serves it over HTTP. The browser app (`template/app.js`,
`index.html`, `styles.css`, `vendor/marked.min.js`) reads `window.__OKF__` —
nothing is fetched at runtime.

# Baked data shape

`window.__OKF__` (`BakedData`):

| Field | Meaning |
| --- | --- |
| `root` | Display name of the bundle (basename for a local path, last URL segment for a URL). |
| `generatedAt` | ISO 8601 generation timestamp. |
| `concepts` | Array of `BakedConcept`, sorted by `id`. |
| `reserved` | Raw bodies of `index.md` / `log.md`, keyed by bundle path. |
| `overview` | Concept count, groups, hubs, orphans, broken links. |

`BakedConcept` fields: `id`, `file`, `group` (top-level folder, `<root>` for
root concepts), `type`, `title`, `description`, `tags`, `outbound`, `inbound`,
`broken`, `markdown`.

# CLI

The command surface (`okforge webview generate` / `show`, including local and
http(s)/GitHub URL bundle sources) is documented under
[cli_commands/webview](../cli_commands/webview.md).

# Build and deploy

Convenience scripts in `contribs/webview/package.json`, each shelling out to the
CLI generator:

| Script | Action |
| --- | --- |
| `build` | `tsx ../../src/cli.ts webview generate ../../.okf -o dist` — render `./.okf` into `dist/`. |
| `open` | Build, then open `dist/index.html`. |
| `deploy` | Build, then run `scripts/webview_deploy.sh` to force-push `dist/` to the `gh-pages` branch as a single fresh commit (with a `.nojekyll` marker). |

# Citations

- [`contribs/webview/package.json`](../../contribs/webview/package.json)
- [`contribs/webview/README.md`](../../contribs/webview/README.md)
- [`src/commands/webview_command.ts`](../../src/commands/webview_command.ts)
- [`src/misc/okf_fetch.ts`](../../src/misc/okf_fetch.ts)
- [`src/webview/template/`](../../src/webview/template/)
