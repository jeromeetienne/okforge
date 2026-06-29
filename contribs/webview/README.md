# okforge webview (contrib)

A self-contained **static website** to browse an OKF knowledge bundle — concept
pages with rendered markdown and link panels, an overview dashboard, an
interactive concept graph, and search. The generated site has no runtime
dependencies and opens directly from `file://`.

It is a contrib (not part of the published `okforge` npm package). The generator
reuses the same graph engine as the CLI (`src/misc/okf_graph.ts`), so the
website stays consistent with `okforge graph` and `okforge check`.

## Generate

From the repo root:

```bash
npm run webview:build           # bundle: ./okf  ->  out: contribs/webview/dist
```

Or run the generator directly, pointing at any bundle and output directory:

```bash
npx tsx contribs/webview/generate.ts --bundle path/to/bundle --out path/to/site
```

| Option | Default | Meaning |
| --- | --- | --- |
| `-b, --bundle <dir>` | `./okf` | OKF bundle root to render. |
| `-o, --out <dir>` | `contribs/webview/dist` | Output directory for the static site. |

The generator bakes the bundle's graph metadata and raw markdown into
`<out>/data.js`, then copies the static app (`index.html`, `app.js`,
`styles.css`, `vendor/marked.min.js`) alongside it.

## View

```bash
open contribs/webview/dist/index.html      # or just double-click it
```

Everything is baked in, so no server is required. To serve it over HTTP instead
(e.g. to share on a LAN), any static server works:

```bash
npx serve contribs/webview/dist
```

## Layout

```
contribs/webview/
  generate.ts        # generator: build graph -> bake data.js + copy template
  template/          # static app copied verbatim into the output
    index.html
    app.js
    styles.css
    vendor/marked.min.js
  dist/              # generated output (gitignored)
```

## How it maps to the bundle

- **Concepts** — every non-`index.md`/`log.md` file, grouped by top-level folder.
- **Links** — in-bundle `.md` links become in-app navigation (resolved with the
  same rules as the graph engine); broken links are flagged; source citations and
  external URLs are left inert / opened in a new tab.
- **Overview** — concept counts, per-folder counts, hub concepts, orphans, and
  broken links, mirroring `okforge graph overview`.
