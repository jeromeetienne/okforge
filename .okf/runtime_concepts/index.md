# runtime_concepts

The shared mechanics behind every [CLI command](../cli_commands/index.md). The
command classes are thin; these classes do the real work.

- [okf_store](./okf_store.md) — config loading, git inspection, staleness detection, and the conformance lint.
- [okf_graph](./okf_graph.md) — the directed concept-link graph and its queries.
- [okf_fetch](./okf_fetch.md) — download a remote bundle by crawling its markdown links.
