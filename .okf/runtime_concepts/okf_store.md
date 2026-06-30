---
type: Data Model
title: OkfStore
description: Primitive mechanics shared by the subcommands — config loading, git inspection, staleness, and the conformance lint.
resource: src/misc/okf_store.ts
tags: [runtime, git, staleness, lint, config]
timestamp: 2026-06-29
---

# Overview

`OkfStore` is a static class of the primitive mechanics the subcommands
orchestrate: loading the per-repository
[`.okforge.config.json`](../config_formats/okforge_config.md) mapping, git
inspection, staleness detection, and the conformance / dead-link lint. It holds
no state.

# Key methods

## Config

| Method | Returns | Notes |
| --- | --- | --- |
| `configPath(cwd)` | `string` | Absolute path of `.okforge.config.json` for the repo. |
| `loadConfig(cwd)` | `OkfConfig` | Empty mapping when absent; throws on bad JSON or schema failure. |
| `folders(cwd)` | `string[]` | Declared folder names, in declared order. |
| `sources(cwd, folder)` | `string[]` | The folder's source prefixes, or `[]` when undeclared. |

## Git

| Method | Returns | Notes |
| --- | --- | --- |
| `git(args, cwd)` | `string` | Runs `git`, returning stdout, or `''` on failure. |
| `isGitRepo(cwd)` | `boolean` | Whether `cwd` is inside a git working tree. |
| `changedPaths(cwd)` | `string[]` | Tracked (`diff --name-only HEAD`) plus untracked (`ls-files --others --exclude-standard`) paths, de-duplicated and sorted. |

## Staleness

`staleFolders(cwd)` returns the folders whose source changed since HEAD while
`.okf/<folder>` itself was not edited. The skip-when-edited rule (a
`git status --porcelain` check on `.okf/<folder>`) keeps work-in-progress from
triggering the [nudge](../cli_commands/nudge.md). `firstMatch(changed, prefixes)`
is the substring match that pairs a changed path to a folder. Returns `[]` when
not a git repo, no folders are declared, or nothing changed.

## Conformance lint

`check(cwd)` lints the `.okf/` bundle and returns the list of problems (empty when
conformant); it throws when there is no bundle. It needs no mapping — it lints
the markdown alone — so it is repository-agnostic. The four checks:

1. **NAME** — no kebab-case (no `-`) in any file or directory name.
2. **TYPE** — every non-index, non-log `.md` opens with frontmatter holding a
   non-empty `type:`.
3. **INDEX** — a sub-folder `index.md` must carry no frontmatter (the root
   `index.md` may).
4. **LINK** — every bundle-relative link (a markdown target beginning with a
   leading slash, ending in `.md`) must resolve to a file.

Supporting helpers: `conceptCount`, `hasTypeFrontmatter`, `bundleLinks`,
`firstLine`, and `walk` (recursive directory listing, reused by
[okf_graph](./okf_graph.md)).

# Citations

- [`src/misc/okf_store.ts`](../../src/misc/okf_store.ts)
