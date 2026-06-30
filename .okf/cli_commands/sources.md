---
type: CLI Command
title: okforge sources
description: Print the source paths a folder is derived from.
resource: src/commands/sources_command.ts
tags: [cli, mapping]
timestamp: 2026-06-29
---

# Synopsis

```bash
npx okforge sources <folder> [dir]
```

Prints the source path prefixes the given folder is derived from, one per line.

# Arguments

| Argument | Default | Meaning |
| --- | --- | --- |
| `<folder>` | — | OKF concept folder name (required). |
| `[dir]` | `.` | Repository root. |

# Behavior

Reads the folder's prefixes from
[`.okforge.config.json`](../config_formats/okforge_config.md) via
[OkfStore](../runtime_concepts/okf_store.md). **Throws `unknown folder: <folder>`
when the folder is undeclared** (the command treats an empty list as an error,
unlike `OkfStore.sources`). Use this during a refresh to find the real files to
read.

# Citations

- [`src/commands/sources_command.ts`](../../src/commands/sources_command.ts)
- [`src/cli.ts`](../../src/cli.ts)
