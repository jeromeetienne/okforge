# runtime_concepts

The shared mechanics behind every [CLI command](../cli_commands/index.md). The
command classes are thin; these two classes do the real work.

- [okf_store](./okf_store.md) — config loading, git inspection, staleness detection, and the conformance lint.
- [okf_graph](./okf_graph.md) — the directed concept-link graph and its queries.
