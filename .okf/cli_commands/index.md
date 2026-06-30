# cli_commands

The `okforge` subcommands, wired up in [`src/cli.ts`](../../src/cli.ts) with
Commander. Run from the project root with `npx okforge <command>` (Node ≥ 20.12);
each command takes an optional `[dir]` repository-root argument that defaults to
`.`.

## Mapping inspection

- [folders](./folders.md) — list the declared OKF concept folders.
- [map](./map.md) — print the full folder → sources mapping.
- [sources](./sources.md) — print the source paths a folder is derived from.

## Maintenance

- [stale](./stale.md) — folders whose source changed while the folder was not edited.
- [check](./check.md) — conformance and dead-link lint.
- [nudge](./nudge.md) — the Stop-hook companion that reminds when docs drift.

## Browsing and install

- [graph](./graph.md) — read-only concept-graph queries as JSON.
- [install](./install.md) — copy the bundled skills into an agent folder.
