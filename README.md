# okforge

Deterministic mechanics and a Stop-hook nudge for the **okf** Claude Code skill,
which maintains an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF) knowledge bundle under `okf/` in any repository.

The skill prose lives in [`.claude/skills/okf/`](.claude/skills/okf); its
deterministic mechanics live in [`src/`](src) as a small TypeScript CLI. The model
writes the prose; the CLI answers "what is each folder derived from?" and "is the
bundle still well-formed?".

## Usable in any repository

okforge ships with **no** repository-specific paths. Each repo declares its own
folder-to-source mapping in `.okforge.config.json` at the project root:

```json
{
  "folders": {
    "runtime_concepts": ["packages/foo/src/model/", "packages/foo/src/event/"],
    "config_formats": ["packages/foo/data/schemas/thing.schema.json"]
  }
}
```

With no config present, `map`/`folders` are empty and `stale` is a no-op; `check`
still works, since it lints the bundle's markdown alone.

## The `okforge` CLI

Run with `npx` (Node >= 20.12). `<dir>` defaults to the current directory.

| Command | Purpose |
|---|---|
| `okforge map [<dir>]` | Print the full folder-to-source mapping. |
| `okforge folders [<dir>]` | List the OKF concept folders. |
| `okforge sources <folder> [<dir>]` | Print the source paths a folder is derived from. |
| `okforge stale [<dir>]` | List folders whose source changed since HEAD while the folder was not edited. |
| `okforge check [<dir>]` | Conformance + dead-link lint; exits non-zero on problems. |
| `okforge nudge` | Stop-hook entry: read the hook payload on stdin and maybe remind. |

## Development

```bash
npm install
npm run okforge -- <command>   # run the CLI from source via tsx
npm run typecheck              # tsc --noEmit
npm run build                  # compile to dist/
```

## Layout

```
src/
├── cli.ts                  Commander entry; wires the subcommands below
├── misc/
│   └── okf_store.ts        mapping load, stale detection, conformance lint
└── commands/
    ├── map_command.ts      print the folder-to-source mapping
    ├── folders_command.ts  list the concept folders
    ├── sources_command.ts  print a folder's source paths
    ├── stale_command.ts    folders whose source changed since HEAD
    ├── check_command.ts    conformance + dead-link lint
    └── nudge_command.ts    the Stop-hook nudge
.claude/skills/okf/
├── SKILL.md                instructions Claude loads
└── README.md               human-facing skill overview
```

## License

MIT © Jerome Etienne
