---
type: CLI Command
title: okforge map
description: Print the full folder → sources mapping.
resource: src/commands/map_command.ts
tags: [cli, mapping]
timestamp: 2026-06-29
---

# Synopsis

```bash
npx okforge map [dir]
```

Prints the resolved folder → sources mapping as `## <folder>` headers, each
followed by `  - <source>` rows.

# Arguments

| Argument | Default | Meaning |
| --- | --- | --- |
| `[dir]` | `.` | Repository root. |

# Behavior

Reads [`.okforge.config.json`](../config_formats/okforge_config.md) via
[OkfStore](../runtime_concepts/okf_store.md). For a single folder's sources use
[sources](./sources.md); for just the folder names use [folders](./folders.md).

# Example

```
## cli_commands
  - src/cli.ts
  - src/commands/
## runtime_concepts
  - src/misc/
```

# Citations

- [`src/commands/map_command.ts`](../../src/commands/map_command.ts)
- [`src/cli.ts`](../../src/cli.ts)
