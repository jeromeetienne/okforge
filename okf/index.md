---
okf_version: "0.1"
type: Bundle Index
title: okforge Knowledge Bundle
description: Knowledge for okforge — the deterministic OKF bundle mechanics and Stop-hook nudge for Claude Code.
timestamp: 2026-06-29
---

# okforge

okforge is a small CLI plus a Claude Code skill for maintaining an Open
Knowledge Format (OKF) bundle. It owns the mechanics — the folder ↔ source
mapping, staleness detection, conformance and dead-link linting, graph queries,
and a Stop-hook nudge — so an author can focus on accurate prose.

This bundle documents okforge itself.

## Folders

- [cli_commands](./cli_commands/index.md) — the `okforge` subcommands and how the CLI is wired.
- [runtime_concepts](./runtime_concepts/index.md) — the shared mechanics behind every subcommand.
- [config_formats](./config_formats/index.md) — the per-repository `.okforge.config.json` format.

## Conventions

- Concept folders are **derived** from source files. The mapping lives in
  [`.okforge.config.json`](../.okforge.config.json) and is the single source of
  truth shared by the skill and the [nudge](./cli_commands/nudge.md) hook.
- The change history is in [log.md](./log.md).
