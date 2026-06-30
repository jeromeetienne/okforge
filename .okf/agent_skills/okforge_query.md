---
type: Skill
title: okforge-query skill
description: Strictly read-only Claude Code skill for browsing, mapping, and navigating any OKF bundle.
resource: dotclaude_folder/skills/okforge-query/SKILL.md
tags: [skill, claude-code, browse, read-only]
timestamp: 2026-06-29
---

# Overview

The `okforge-query` skill answers read-only questions about any OKF bundle: its
structure, concepts, links, hygiene, and history. It never creates, edits, moves,
or deletes bundle files. It is the companion to the maintenance-oriented
[okforge_maintain](./okforge_maintain.md) skill.

# Tooling strategy

Prefer the deterministic [graph](../cli_commands/graph.md) command for anything
graph-wide — it parses every doc once and resolves both link forms correctly:

```bash
npx okforge graph <op> --bundle <bundle-root>
```

When the command is unavailable (older okforge, offline, non-Node repo), fall
back to built-ins: Glob to enumerate, Grep to find links and fields, Read for
content — always grepping before reading whole files.

# Operations

| Operation | Backed by |
| --- | --- |
| Overview / map | `graph overview` |
| Open concept | `graph concept <id>` + Read |
| Neighbors | `graph neighbors <id> [--hops N]` |
| Search / filter | Grep over frontmatter and bodies |
| Hygiene (orphans, broken) | `graph orphans`, `graph broken` |
| Recent changes | Read `log.md` files |
| Path | `graph path <from> <to>` |

# Format reference

The detailed format rules — Concept IDs, reserved files, link resolution,
hygiene definitions — live in [okf_rules](./okf_rules.md), shipped alongside the
skill and consulted when a link does not resolve as expected or when classifying
files.

# Citations

- [`dotclaude_folder/skills/okforge-query/SKILL.md`](../../dotclaude_folder/skills/okforge-query/SKILL.md)
