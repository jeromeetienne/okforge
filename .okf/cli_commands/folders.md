---
type: CLI Command
title: okforge folders
description: List the OKF concept folders declared in .okforge.config.json.
resource: src/commands/folders_command.ts
tags: [cli, mapping]
timestamp: 2026-06-29
---

# Synopsis

```bash
npx okforge folders [dir]
```

Prints the declared OKF concept folder names, one per line, in declared order.

# Arguments

| Argument | Default | Meaning |
| --- | --- | --- |
| `[dir]` | `.` | Repository root. |

# Behavior

Reads the `folders` keys from
[`.okforge.config.json`](../config_formats/okforge_config.md) via
[OkfStore](../runtime_concepts/okf_store.md). Empty output when no config is
present.

# Citations

- [`src/commands/folders_command.ts`](../../src/commands/folders_command.ts)
- [`src/cli.ts`](../../src/cli.ts)
