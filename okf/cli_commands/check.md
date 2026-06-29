---
type: CLI Command
title: okforge check
description: Conformance and dead-link lint of the okf/ bundle; exits non-zero on problems.
resource: src/commands/check_command.ts
tags: [cli, lint, conformance]
timestamp: 2026-06-29
---

# Synopsis

```bash
npx okforge check [dir]
```

Lints the `okf/` bundle and reports problems. Run it at the end of every
scaffold or refresh and resolve everything it reports.

# Arguments

| Argument | Default | Meaning |
| --- | --- | --- |
| `[dir]` | `.` | Repository root. |

# Behavior

Delegates to `OkfStore.check` — see
[OkfStore](../runtime_concepts/okf_store.md) for the four checks (NAME, TYPE,
INDEX, LINK). Repository-agnostic: it needs no mapping, only the bundle markdown.

On a clean bundle it prints `OK: N concept docs conformant` and exits 0.

# Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Conformant. |
| `1` | One or more problems found; prints each problem, then `FAILED: N problem(s)`. |
| `2` | No `okf/` bundle exists (the underlying check threw). |

# Citations

- [`src/commands/check_command.ts`](../../src/commands/check_command.ts)
- [`src/cli.ts`](../../src/cli.ts)
