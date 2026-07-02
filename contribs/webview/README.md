# okforge webview

A self-contained **static website** to browse an OKF knowledge bundle — concept
pages with rendered markdown and link panels, an overview dashboard, an
interactive concept graph, and search. The generated site has no runtime
dependencies and opens directly from `file://` (or over HTTP).

The `webview` commands are part of the `okforge` CLI. The generator reuses the
same graph engine as the CLI (`src/misc/okf_graph.ts`), so the website stays
consistent with `okforge graph` and `okforge check`. The static app template
lives in [`src/webview/template/`](../../src/webview/template/); this contrib
folder holds only the GitHub Pages deploy tooling and the generated `dist/`.

## Generate

```bash
okforge webview generate [bundle]        # bundle default: ./.okf
```

| Argument / Option | Default | Meaning |
| --- | --- | --- |
| `[bundle]` | `.okf` | OKF bundle root to render (local directory). |
| `-o, --output_folder <dir>` | `okforge_webview` | Output directory for the static site. |

The generator bakes the bundle's graph metadata and raw markdown into
`<output>/data.js`, then copies the static app (`index.html`, `app.js`,
`styles.css`, `vendor/marked.min.js`) alongside it.

> URL bundle sources (`https://…`) are not yet supported — see
> [#17](https://github.com/jeromeetienne/okforge/issues/17). Pass a local
> bundle directory for now.

## Show

Build the webview into a temporary folder and serve it over HTTP, so you can
trivially view any existing bundle in one command:

```bash
okforge webview show [bundle]            # bundle default: ./.okf
```

It prints a `http://127.0.0.1:<port>/` URL and serves until you press Ctrl-C.

## View a generated site

```bash
open okforge_webview/index.html          # or just double-click it
```

Everything is baked in, so no server is required. To serve it over HTTP instead
(e.g. to share on a LAN), any static server works:

```bash
npx serve okforge_webview
```

## Deploy to GitHub Pages

From the repo root:

```bash
npm run webview:deploy
```

This rebuilds the site into `contribs/webview/dist` and force-pushes it to the
`gh-pages` branch of `origin` as a single fresh commit (the site is a build
artifact, not history), adding a `.nojekyll` marker so Pages serves it verbatim.
Enable Pages once under the repo's **Settings → Pages** with branch `gh-pages`
and folder `/ (root)`. The deploy logic lives in
[`scripts/webview_deploy.sh`](../../scripts/webview_deploy.sh).

## Layout

```
src/webview/template/     # static app, copied verbatim into every generated site
  index.html
  app.js
  styles.css
  vendor/marked.min.js
src/commands/webview_command.ts   # generator + HTTP server behind `okforge webview`
contribs/webview/
  package.json            # local build/open/deploy convenience scripts
  dist/                   # generated output for gh-pages (gitignored)
```

## How it maps to the bundle

- **Concepts** — every non-`index.md`/`log.md` file, grouped by top-level folder.
- **Links** — in-bundle `.md` links become in-app navigation (resolved with the
  same rules as the graph engine); broken links are flagged; source citations and
  external URLs are left inert / opened in a new tab.
- **Overview** — concept counts, per-folder counts, hub concepts, orphans, and
  broken links, mirroring `okforge graph overview`.
