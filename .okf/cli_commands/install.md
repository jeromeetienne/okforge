---
type: CLI Command
title: okforge install
description: Copy the bundled okforge skills into an AI agent folder and register the Stop hook.
resource: src/commands/install_command.ts
tags: [cli, install, hook, skill]
timestamp: 2026-06-29
---

# Synopsis

```bash
npx okforge install [agent_folder]
```

Copies the bundled `skills/` tree — the [okforge_maintain](../agent_skills/okforge_maintain.md) and
[okforge_query](../agent_skills/okforge_query.md) skills — into an agent folder
(for example `.claude`), preserving the `skills/...` layout, and prints the
per-file outcome.

# Arguments

| Argument | Default | Meaning |
| --- | --- | --- |
| `[agent_folder]` | `.` | Destination agent folder. |

# Behavior

Source files come from the package's `dotclaude_folder/skills` tree; each is
copied to `<agent_folder>/skills/...` and reported as `created` or `updated`.

When the destination is itself named `.claude`, the command also registers the
`npx okforge nudge` Stop hook in that folder's `settings.json` —
idempotent and non-destructive, preserving existing settings and hooks. For any
other destination the hook step is skipped, since `settings.json` is a `.claude`
concept. The registered hook is the [nudge](./nudge.md) command.

# Citations

- [`src/commands/install_command.ts`](../../src/commands/install_command.ts)
- [`src/cli.ts`](../../src/cli.ts)
