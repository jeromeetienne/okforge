---
type: Data Model
title: OkfFetch
description: Downloads a remote OKF bundle into a local temp directory by crawling its in-bundle markdown links.
resource: src/misc/okf_fetch.ts
tags: [runtime, fetch, crawl, url, github]
timestamp: 2026-07-02
---

# Overview

`OkfFetch` is a static class that materializes a remote OKF bundle into a local
temp directory, so the rest of the toolchain — which only reads local directory
trees ([OkfGraph](./okf_graph.md) / [OkfStore](./okf_store.md)) — can treat a URL
source exactly like a local bundle. It backs the http(s) `[bundle]` argument of
the [webview](../cli_commands/webview.md) command.

# Why crawl

Arbitrary HTTP hosts cannot be directory-listed, so the reachable file set is
discovered by crawling: seed the queue with `index.md` and `log.md`, then follow
every in-bundle `.md` link (using the same absolute/relative resolution as the
graph engine) until the queue is exhausted. Links that return a non-200 response
are left unwritten, so the generator later reports them as broken exactly as it
would for a local bundle. `materialize` throws when `index.md` is not reachable.

A bundle file that no reachable link points to is never fetched, so the bundle's
`index.md` must transitively link every file (as OKF bundles do).

# Methods

| Method | Purpose |
| --- | --- |
| `isUrl(bundle)` | Whether `bundle` is an http(s) URL rather than a local path. |
| `materialize(url, onProgress?)` | Download the bundle into a fresh temp dir and return it; `onProgress` fires after each file is written. |
| `normalizeBase(url)` | Normalize to a base ending in `/`; rewrite a GitHub `tree` URL to `raw.githubusercontent.com`. |
| `bundleName(url)` | Friendly display name: the last path segment of the normalized base. |
| `resolveTarget(target, fromFile)` | Resolve a markdown link to a bundle-relative `.md` path, or null when out of bundle. |
| `fetchText(url)` | GET `url` as UTF-8 text, or null on any non-200 response or network error. |
| `writeFile(outDir, file, content)` | Write bundle-relative `file` under `outDir`, creating parents. |

# Progress reporting

`materialize` accepts an optional callback invoked with an `OkfFetchProgress`
(`{ downloaded, current }`) after each file is written, letting the
[webview](../cli_commands/webview.md) command render live download progress.

# GitHub URL rewriting

`normalizeBase` rewrites
`https://github.com/<owner>/<repo>/tree/<ref>/<path>` to
`https://raw.githubusercontent.com/<owner>/<repo>/refs/heads/<ref>/<path>/`.
Any other URL is used as-is, with a trailing `/` appended when absent.

# Citations

- [`src/misc/okf_fetch.ts`](../../src/misc/okf_fetch.ts)
- [`src/commands/webview_command.ts`](../../src/commands/webview_command.ts)
