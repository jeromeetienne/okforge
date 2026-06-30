---
type: CLI Command
title: okforge nudge
description: Stop-hook companion that reminds when documented source changed but .okf/ was not updated.
resource: src/commands/nudge_command.ts
tags: [cli, hook, staleness]
timestamp: 2026-06-29
---

# Synopsis

```bash
npx okforge nudge
```

The Stop-hook companion to the [okforge_maintain](../agent_skills/okforge_maintain.md) skill. It reads the hook payload as JSON on
stdin and, when warranted, prints a single non-blocking reminder to refresh the
affected docs. Registered as a `Stop` hook in `.claude/settings.json` (the
[install](./install.md) command can register it automatically).

# Behavior

Reads `session_id` and `cwd` from the stdin payload (any parse failure falls back
to empty input; `cwd` defaults to the process cwd). It stays silent unless **all**
of these hold:

- It has not already nudged this session — a per-session marker file in the
  temp dir (`claude-okf-nudge-<session_id>`) makes it fire at most once.
- `cwd` is a git repository.
- `.okf/` is not already being touched (a `git status --porcelain -- .okf` check),
  so work in progress is not interrupted.
- [stale](./stale.md) folders exist (via `OkfStore.staleFolders`).

When it fires it writes the marker and emits a `{ "systemMessage": ... }` JSON
line naming the stale folders and suggesting `/okforge-maintain refresh <folder>`.

A Stop hook must never break the session, so every failure is swallowed silently.
The folder ↔ source mapping comes from
[`.okforge.config.json`](../config_formats/okforge_config.md), so the hook and
the skill share one source of truth.

# Citations

- [`src/commands/nudge_command.ts`](../../src/commands/nudge_command.ts)
- [`src/cli.ts`](../../src/cli.ts)
