---
type: CLI Command
title: okforge webview
description: Generate or serve a static website that bakes an OKF bundle into a dependency-free site.
resource: src/commands/webview_command.ts
tags: [cli, webview, static-site, serve]
timestamp: 2026-07-02
---

# Synopsis

```bash
npx okforge webview generate [bundle] [-o <dir>]
npx okforge webview show [bundle]
```

Renders an OKF bundle as a static website — concept pages with rendered
markdown and link panels, an overview dashboard, an interactive concept graph,
and search. The generated output has no runtime dependencies and opens directly
from `file://`. Both subcommands are implemented by
[WebviewCommand](../contribs/webview.md), which reuses
[OkfGraph](../runtime_concepts/okf_graph.md) so the site stays consistent with
[graph](./graph.md) and [check](./check.md).

# Subcommands

## generate

| Argument / option | Default | Meaning |
| --- | --- | --- |
| `[bundle]` | `.okf` | OKF bundle root: a local directory **or** an http(s) URL. |
| `-o, --output_folder <dir>` | `okforge_webview` | Output directory for the static site. |

Bakes the bundle's graph metadata and raw markdown into `<output>/data.js`
(`window.__OKF__`), then copies the static app template alongside it. Prints the
generated `index.html` path, the bundle source, the concept count, and the
broken-link count.

## show

| Argument | Default | Meaning |
| --- | --- | --- |
| `[bundle]` | `.okf` | OKF bundle root: a local directory **or** an http(s) URL. |

Generates the site into a temp directory, then serves it over HTTP on an
ephemeral `http://127.0.0.1:<port>/` address until interrupted with Ctrl-C.

# URL bundle sources

When `[bundle]` is an http(s) URL it is downloaded into a temp directory first by
[OkfFetch](../runtime_concepts/okf_fetch.md) and then treated as a local bundle,
so a published bundle can be rendered without cloning it. A GitHub
`tree` URL (`https://github.com/<owner>/<repo>/tree/<ref>/<path>`) is rewritten
to its `raw.githubusercontent.com` equivalent as a convenience.

```bash
npx okforge webview show https://github.com/jeromeetienne/okforge/tree/main/.okf
```

# Citations

- [`src/commands/webview_command.ts`](../../src/commands/webview_command.ts)
- [`src/cli.ts`](../../src/cli.ts)
- [`src/misc/okf_fetch.ts`](../../src/misc/okf_fetch.ts)
