---
type: CLI Command
title: okforge stale
description: List folders whose source changed since HEAD while the folder was not edited.
resource: src/commands/stale_command.ts
tags: [cli, staleness, git]
timestamp: 2026-06-29
---

# Synopsis

```bash
npx okforge stale [dir]
```

Lists folders whose mapped source changed since HEAD while `okf/<folder>` itself
was not edited, one per line as `<folder> (source changed: <path>)`.

# Arguments

| Argument | Default | Meaning |
| --- | --- | --- |
| `[dir]` | `.` | Repository root. |

# Behavior

Thin wrapper over `OkfStore.staleFolders` — see
[OkfStore](../runtime_concepts/okf_store.md) for the staleness rules (compares
tracked + untracked changes against the mapping, skips folders already being
edited). Empty output when not a git repo, no folders are declared, or nothing
relevant changed. This is the query the [nudge](./nudge.md) hook is built on.

# Citations

- [`src/commands/stale_command.ts`](../../src/commands/stale_command.ts)
- [`src/cli.ts`](../../src/cli.ts)
