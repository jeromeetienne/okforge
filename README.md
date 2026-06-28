# okforge — Open Knowledge Format bundle skill

A Claude Code skill for maintaining a repository's [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF) knowledge bundle under `okf/`, usable in any repository.

OKF is an open, human- and agent-friendly format for **knowledge** — the
metadata, context, and curated insight that surrounds a system. A bundle is a
directory of plain markdown files: each concept document carries YAML frontmatter
with a required `type`, and reserved `index.md` / `log.md` files provide listings
and history. If you can `cat` a file you can read OKF; if you can `git clone` a
repo you can ship it.

The skill prose lives in [`dotclaude_folder/skills/okf/`](dotclaude_folder/skills/okf)
(`SKILL.md` is the instruction file Claude loads, shipped as data and copied into a
target's `.claude/` by `okforge install`); its deterministic mechanics live in
[`src/`](src) as a small TypeScript CLI. The model writes the prose; the CLI
answers "what is each folder derived from?" and "is the bundle still well-formed?".

## Blog series

A four-part series on the ideas behind okforge — keeping knowledge in sync with code:

1. [The Faster AI Writes Code, the Faster Your Docs Rot](docs/blog_posts/post-1-the-faster-ai-writes-code-the-faster-your-docs-rot.md) — AI-accelerated coding compounds knowledge debt; treat documentation as derived state, not hand-maintained prose.
2. [Give the Model Less](docs/blog_posts/post-2-give-the-model-less.md) — reliability comes from drawing the model/deterministic boundary deliberately, and drawing it small.
3. [Don't Make It Remember, Make It Read](docs/blog_posts/post-3-dont-make-it-remember-make-it-read.md) — grounding output in real source; hallucination is a design failure, not a model failure.
4. [Bet on Boring Formats](docs/blog_posts/post-4-bet-on-boring-formats.md) — why okforge ships plain markdown, an open spec, and an installable skill instead of a clever app.

## How to install

Run `install` from the root of the repository you want to add OKF to (Node >=
20.12, no install step — `npx` fetches it):

```bash
npx okforge install .claude
```

When the destination folder is named `.claude`, this drops the skill prose into
`.claude/skills/okf/` **and** registers the `npx okforge nudge` Stop hook in
`.claude/settings.json` (idempotent and non-destructive — existing settings and
hooks are preserved). For any other destination it copies the skill only and
leaves `settings.json` untouched.

Then write an `.okforge.config.json` at the project root describing that repo's
folder-to-source mapping (see [`.okforge.config.json`](#usable-in-any-repository-okforgeconfigjson)
below), and ask Claude to "set up okf" — or run `/okf` — to scaffold the bundle.

## Why a skill

The `okf/` bundle is **derived** from source — each folder is generated from
specific files, so when those files change the docs drift. The hard parts to keep
consistent are the OKF format, the folder-to-source mapping, and link integrity.
The skill keeps those uniform so you can focus on accurate prose.

## What it does

Three modes, chosen from how you ask:

| You say | Mode | What happens |
|---|---|---|
| "set up okf", "create an OKF bundle", bundle missing | **scaffold** | Creates `.okforge.config.json`, `okf/index.md` (root, with `okf_version`), `okf/log.md`, the folders from the mapping, and refreshes each. |
| "the API changed, update okf", "refresh okf for X", "update the OKF docs" | **refresh** | Reads the current source for the affected folder(s) and regenerates only the docs whose source actually changed, grounded in what it read. |
| "check okf", "is the bundle conformant", "any dead links" | **check** | Runs the conformance and dead-link lint. |

Invoke it by asking Claude in plain language, or with `/okf`. Regeneration is
model-driven, so refresh is a **draft-then-review** loop: the skill rewrites the
affected docs, you review them, then commit. It will not silently rewrite docs
whose source did not change.

## Automatic capture going forward

A companion `Stop` hook, `npx okforge nudge` (registered in
`.claude/settings.json`), reminds you when a session changed source that an OKF
folder documents but left `okf/` untouched. It is deliberately gentle:
non-blocking, at most once per session, and silent if you already touched `okf/`
that session. It reads the same mapping the skill uses (via `npx okforge stale`),
so the skill and the nudge never diverge.

## Where the bundle lives

The bundle is the `okf/` directory at the repository root — a valid OKF bundle is
just a subdirectory of a larger repo, so there is no build step or manifest beyond
`okf_version` in the root `okf/index.md`. The folder-to-source mapping lives next
to it in `.okforge.config.json` at the project root.

## Usable in any repository: `.okforge.config.json`

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

Each key is an OKF concept folder; each value is the list of source path prefixes
that folder is derived from. With no config present, `map`/`folders` are empty and
`stale` is a no-op; `check` still works, since it lints the bundle's markdown
alone. This is the only project-specific part — both the skill and the nudge read
it from here.

## The `okforge` CLI

The bundled [`okforge`](https://www.npmjs.com/package/okforge) CLI owns the
deterministic mechanics, run with `npx` (Node >= 20.12). `<dir>` defaults to the
current directory (the repository root).

| Command | Purpose |
|---|---|
| `okforge map [<dir>]` | Print the full folder-to-source mapping. |
| `okforge folders [<dir>]` | List the OKF concept folders. |
| `okforge sources <folder> [<dir>]` | Print the source paths a folder is derived from. |
| `okforge stale [<dir>]` | List folders whose source changed since HEAD while the folder was not edited. |
| `okforge check [<dir>]` | Conformance + dead-link lint; exits non-zero on problems. |
| `okforge nudge` | Stop-hook entry: read the hook payload on stdin and maybe remind. |
| `okforge install [<agent_folder>]` | Copy the bundled okf skill into an agent folder (default `.`); when that folder is named `.claude`, also register the `nudge` Stop hook in its `settings.json`. |

`check` verifies: snake_case names only, every non-index `.md` has a non-empty
frontmatter `type`, sub-folder `index.md` files carry no frontmatter, and every
bundle-relative `.md` link resolves.

## Development

```bash
npm install
npm run okforge -- <command>   # run the CLI from source via tsx
npm run typecheck              # tsc --noEmit
npm run build                  # compile to dist/
```

You can also run the source directly with `npx tsx src/cli.ts <command>`.

## Layout

```
src/                        the okforge CLI (mechanics)
├── cli.ts                  Commander entry; wires the subcommands below
├── misc/
│   └── okf_store.ts        mapping load, stale detection, conformance lint
└── commands/
    ├── map_command.ts      print the folder-to-source mapping
    ├── folders_command.ts  list the concept folders
    ├── sources_command.ts  print a folder's source paths
    ├── stale_command.ts    folders whose source changed since HEAD
    ├── check_command.ts    conformance + dead-link lint
    ├── nudge_command.ts    the Stop-hook nudge
    └── install_command.ts  copy the skill into a target agent folder
dotclaude_folder/           data shipped to a target's .claude/ by `okforge install`
└── skills/okf/
    └── SKILL.md            instructions Claude loads
```

## Conventions

- File and folder names are snake_case. No kebab-case, no spaces.
- Every non-index `.md` is a concept document: YAML frontmatter with a non-empty
  `type`, then structural markdown (headings, lists, tables, code) using the
  conventional `# Schema` / `# Examples` / `# Citations` sections where they apply.
- `index.md` is reserved and carries no frontmatter — except the root
  `okf/index.md`, which declares `okf_version: "0.1"` and `type: Bundle Index`.
- Cross-link concepts with bundle-relative absolute paths
  (`/runtime_concepts/job_store.md`); cite real source files with repo-relative
  paths (`../../packages/...`).
- Ground every claim in real source. Do not invent fields, routes, flags, or
  states; if uncertain, omit.

## License

MIT © Jerome Etienne
