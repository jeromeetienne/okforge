---
type: CLI Command
title: okforge graph
description: Read-only concept-graph queries over an OKF bundle, emitted as JSON.
resource: src/commands/graph_command.ts
tags: [cli, graph, browse]
timestamp: 2026-06-29
---

# Synopsis

```bash
npx okforge graph <op> [args...] [--bundle <dir>] [--hops <n>]
```

Answers concept-graph queries over a bundle and prints the result as pretty
JSON, for the [okforge_browse](../agent_skills/okforge_browse.md) skill to format.

# Arguments and options

| Argument / option | Default | Meaning |
| --- | --- | --- |
| `<op>` | — | One of `overview`, `concept`, `neighbors`, `orphans`, `broken`, `path`. |
| `[args...]` | — | Operation arguments (Concept IDs). |
| `-b, --bundle <dir>` | `.` | Bundle root directory. |
| `-n, --hops <n>` | `1` | Neighbor radius for `neighbors` (non-numeric falls back to 1). |

# Operations

| Op | Args | Result |
| --- | --- | --- |
| `overview` | — | Concept count, per-group counts, top 10 hub concepts, orphan and broken counts. |
| `concept` | `<id>` | One concept's frontmatter plus inbound, outbound, and broken links (`{ id, found: false }` when missing). |
| `neighbors` | `<id>` | IDs within `--hops` undirected steps, grouped by distance. |
| `orphans` | — | Concepts with no inbound link. |
| `broken` | — | Every broken `.md` link as `{ from, target }`. |
| `path` | `<from> <to>` | Shortest directed link path, or null (needs two IDs). |

A trailing `.md` on a Concept ID argument is stripped. The graph itself is built
by [OkfGraph](../runtime_concepts/okf_graph.md). Throws when the bundle directory
does not exist or the operation is unknown.

# Citations

- [`src/commands/graph_command.ts`](../../src/commands/graph_command.ts)
- [`src/cli.ts`](../../src/cli.ts)
