---
type: Data Model
title: OkfGraph
description: The directed, untyped concept-link graph of an OKF bundle and the queries over it.
resource: src/misc/okf_graph.ts
tags: [runtime, graph, links, orphans]
timestamp: 2026-06-29
---

# Overview

`OkfGraph` builds and queries the directed link graph of an OKF bundle. It is
pure, read-only mechanics: it parses frontmatter and markdown links, resolves
both the absolute (`/foo.md`) and relative (`./foo.md`) link forms to Concept
IDs, and answers the graph-heavy queries that are awkward with Glob/Grep alone.
It backs the [graph](../cli_commands/graph.md) command.

Reserved files (`index.md`, `log.md`) are not graph nodes and their links do not
form edges — so a concept reachable only from an `index.md` still counts as an
orphan, which is what makes orphan detection meaningful.

# Data model

A **Concept ID** is the bundle-relative file path with `.md` removed, using POSIX
separators.

`ConceptNode` fields: `id`, `file`, `type`, `title`, `description`, `tags`,
`outbound` (Concept IDs it links to), and `broken` (raw `.md` targets that
resolve inside the bundle but to a missing file).

`build(root)` returns `OkfGraphData`: `{ root, concepts (Map<id, ConceptNode>),
linkedTo (Set of IDs with an inbound edge) }`.

# Queries

| Method | Returns |
| --- | --- |
| `build(root)` | The full `OkfGraphData`. |
| `inbound(graph, id)` | Concept IDs that link to `id`, sorted. |
| `orphans(graph)` | Concepts with no inbound link, sorted. |
| `broken(graph)` | Every broken `.md` link as `{ from, target }`. |
| `neighbors(graph, id, hops)` | IDs within `hops` over **undirected** edges, grouped by distance. |
| `path(graph, from, to)` | Shortest **directed** link path (inclusive), or null. |
| `hubs(graph, limit)` | Most-linked-to concepts as `{ id, inbound }`, highest first. |
| `groups(graph)` | Concept counts per top-level directory (`<root>` for root concepts). |

# Link resolution

`resolveLink(target, file, root)` returns null for anchors, external URLs
(scheme-prefixed), non-`.md` targets, and targets that normalize outside the
bundle root — none of which are graph edges. Absolute targets are taken from the
bundle root; relative targets are joined against the linking file's directory.

`parseFrontmatter` is a deliberately small line-oriented reader for `type`,
`title`, `description`, and `tags` (inline `[a, b]` or `- item` block form);
unknown keys are ignored. Helpers: `extractLinkTargets`, `parseInlineTags`,
`unquote`, `toPosix`, `undirectedNeighbors`, `reconstruct`.

# Citations

- [`src/misc/okf_graph.ts`](../../src/misc/okf_graph.ts)
