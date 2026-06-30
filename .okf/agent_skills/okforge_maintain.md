---
type: Skill
title: okforge-maintain skill
description: Claude Code skill that maintains the OKF bundle under .okf/ — scaffold, refresh, and check.
resource: dotclaude_folder/skills/okforge-maintain/SKILL.md
tags: [skill, claude-code, maintenance]
timestamp: 2026-06-30
---

# Overview

The `okforge-maintain` skill maintains the Open Knowledge Format bundle under `.okf/`. It
owns the prose while the [CLI commands](../cli_commands/index.md) own the
deterministic mechanics. Prefer it over hand-editing `.okf/` so the format, the
folder ↔ source mapping, and link integrity stay consistent.

# Modes

The skill picks a mode from what the user asked:

| Mode | Triggers | What it does |
| --- | --- | --- |
| **Refresh** (common) | "refresh okf", "update the OKF docs for X", "the API changed" | Regenerate the affected folder's docs from current source. |
| **Scaffold** | "set up okf", "create an OKF bundle", bundle missing | Create the config, root `index.md`/`log.md`, and each folder. |
| **Check** | "check okf", "is the bundle conformant", "any dead links" | Run the conformance and dead-link lint. |

# Commands it drives

Reads the mapping from
[.okforge.config.json](../config_formats/okforge_config.md), never hardcoding it:

- [map](../cli_commands/map.md) — print the resolved mapping.
- [folders](../cli_commands/folders.md) — list declared folders.
- [sources](../cli_commands/sources.md) — resolve a folder's real source files to read.
- [stale](../cli_commands/stale.md) — find folders whose source drifted.
- [check](../cli_commands/check.md) — conformance + dead-link lint, run to finish.

It also relies on the [nudge](../cli_commands/nudge.md) Stop hook to remind when
source drifts. Its companion read-only skill is
[okforge_query](./okforge_query.md).

# Authoring rules (enforced by the skill)

- snake_case file names; no kebab-case, no spaces.
- Every non-index `.md` opens with frontmatter holding a non-empty `type`;
  recommended `title`, `description`, `resource`, `tags`, `timestamp`.
- Favor structural markdown; use `# Schema`, `# Examples`, `# Citations`.
- Sub-folder `index.md` carries no frontmatter; cross-link with relative paths,
  never bundle-root absolute paths.
- Every claim must be grounded in real source — invent nothing.

# Citations

- [`dotclaude_folder/skills/okforge-maintain/SKILL.md`](../../dotclaude_folder/skills/okforge-maintain/SKILL.md)
