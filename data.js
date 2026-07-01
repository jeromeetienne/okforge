window.__OKF__ = {
  "root": ".okf",
  "generatedAt": "2026-07-01T09:47:10.133Z",
  "concepts": [
    {
      "id": "agent_skills/okf_rules",
      "file": "agent_skills/okf_rules.md",
      "group": "agent_skills",
      "type": "Reference",
      "title": "OKF v0.1 rules",
      "description": "The format-rules reference bundled with okforge-query — Concept IDs, reserved files, link resolution, hygiene.",
      "tags": [
        "reference",
        "okf",
        "spec"
      ],
      "outbound": [
        "agent_skills/okforge_query",
        "cli_commands/graph",
        "runtime_concepts/okf_graph"
      ],
      "inbound": [
        "agent_skills/okforge_query"
      ],
      "broken": [],
      "markdown": "---\ntype: Reference\ntitle: OKF v0.1 rules\ndescription: The format-rules reference bundled with okforge-query — Concept IDs, reserved files, link resolution, hygiene.\nresource: dotclaude_folder/skills/okforge-query/references/okf-rules.md\ntags: [reference, okf, spec]\ntimestamp: 2026-06-29\n---\n\n# Overview\n\nThe detail behind the [okforge_query](./okforge_query.md) skill, read when a\nlink does not resolve as expected, when classifying files, or when reporting\nhygiene. The authoritative source is `okf/SPEC.md` in\n`github.com/GoogleCloudPlatform/knowledge-catalog`; OKF is v0.1 and where the\nspec disagrees, the spec wins.\n\n# Core definitions\n\n- **Bundle** — a directory tree of markdown files; may be a subdirectory of a\n  larger repository, so the *bundle root* (not the repo root) is what links and\n  Concept IDs resolve against.\n- **Concept** — any non-reserved `.md` file.\n- **Concept ID** — the file's bundle-relative path with `.md` removed\n  (`tables/users.md` → `tables/users`).\n- **Reserved files** — `index.md` (listing) and `log.md` (change history,\n  newest-first, `## YYYY-MM-DD` headings) at every level; never concepts. Only\n  the bundle-root `index.md` may carry frontmatter, to declare `okf_version`.\n\n# Frontmatter\n\nYAML between `---` delimiters; `type` is the only required field. Recommended:\n`title`, `description`, `resource`, `tags`, `timestamp`. Arbitrary extra keys are\nallowed — never reject or warn about unknown keys or unfamiliar `type` values.\n\n# Links — the graph\n\nThe bundle is a directed, untyped graph; a link's meaning lives in the prose, not\nthe link. Two forms: **absolute** (begins with `/`, resolved from the bundle\nroot — the spec's recommended form) and **relative** (`./x.md`, `../y/z.md`,\nresolved from the concept's directory — the common form in the wild). Resolution:\ndrop `#anchor`, ignore external and non-`.md` targets, ignore targets that escape\nthe bundle root, then strip `.md`.\n\n# Hygiene\n\n- **Orphan** — a concept with no inbound link *from another concept*; links from\n  reserved `index.md` / `log.md` do not count.\n- **Broken link** — an in-bundle `.md` target that does not exist. Broken links\n  are **valid** in OKF (possibly not-yet-written knowledge) — only reported on\n  request, never treated as errors.\n\nThese definitions match the [graph](../cli_commands/graph.md) command's `orphans`\nand `broken` operations, implemented in\n[okf_graph](../runtime_concepts/okf_graph.md).\n\n# Citations\n\n- [`dotclaude_folder/skills/okforge-query/references/okf-rules.md`](../../dotclaude_folder/skills/okforge-query/references/okf-rules.md)\n"
    },
    {
      "id": "agent_skills/okforge_maintain",
      "file": "agent_skills/okforge_maintain.md",
      "group": "agent_skills",
      "type": "Skill",
      "title": "okforge-maintain skill",
      "description": "Claude Code skill that maintains the OKF bundle under .okf/ — scaffold, refresh, and check.",
      "tags": [
        "skill",
        "claude-code",
        "maintenance"
      ],
      "outbound": [
        "agent_skills/okforge_query",
        "cli_commands/check",
        "cli_commands/folders",
        "cli_commands/map",
        "cli_commands/nudge",
        "cli_commands/sources",
        "cli_commands/stale",
        "config_formats/okforge_config"
      ],
      "inbound": [
        "agent_skills/okforge_query",
        "cli_commands/install",
        "cli_commands/nudge"
      ],
      "broken": [],
      "markdown": "---\ntype: Skill\ntitle: okforge-maintain skill\ndescription: Claude Code skill that maintains the OKF bundle under .okf/ — scaffold, refresh, and check.\nresource: dotclaude_folder/skills/okforge-maintain/SKILL.md\ntags: [skill, claude-code, maintenance]\ntimestamp: 2026-06-30\n---\n\n# Overview\n\nThe `okforge-maintain` skill maintains the Open Knowledge Format bundle under `.okf/`. It\nowns the prose while the [CLI commands](../cli_commands/index.md) own the\ndeterministic mechanics. Prefer it over hand-editing `.okf/` so the format, the\nfolder ↔ source mapping, and link integrity stay consistent.\n\n# Modes\n\nThe skill picks a mode from what the user asked:\n\n| Mode | Triggers | What it does |\n| --- | --- | --- |\n| **Refresh** (common) | \"refresh okf\", \"update the OKF docs for X\", \"the API changed\" | Regenerate the affected folder's docs from current source. |\n| **Scaffold** | \"set up okf\", \"create an OKF bundle\", bundle missing | Create the config, root `index.md`/`log.md`, and each folder. |\n| **Check** | \"check okf\", \"is the bundle conformant\", \"any dead links\" | Run the conformance and dead-link lint. |\n\n# Commands it drives\n\nReads the mapping from\n[.okforge.config.json](../config_formats/okforge_config.md), never hardcoding it:\n\n- [map](../cli_commands/map.md) — print the resolved mapping.\n- [folders](../cli_commands/folders.md) — list declared folders.\n- [sources](../cli_commands/sources.md) — resolve a folder's real source files to read.\n- [stale](../cli_commands/stale.md) — find folders whose source drifted.\n- [check](../cli_commands/check.md) — conformance + dead-link lint, run to finish.\n\nIt also relies on the [nudge](../cli_commands/nudge.md) Stop hook to remind when\nsource drifts. Its companion read-only skill is\n[okforge_query](./okforge_query.md).\n\n# Authoring rules (enforced by the skill)\n\n- snake_case file names; no kebab-case, no spaces.\n- Every non-index `.md` opens with frontmatter holding a non-empty `type`;\n  recommended `title`, `description`, `resource`, `tags`, `timestamp`.\n- Favor structural markdown; use `# Schema`, `# Examples`, `# Citations`.\n- Sub-folder `index.md` carries no frontmatter; cross-link with relative paths,\n  never bundle-root absolute paths.\n- Every claim must be grounded in real source — invent nothing.\n\n# Citations\n\n- [`dotclaude_folder/skills/okforge-maintain/SKILL.md`](../../dotclaude_folder/skills/okforge-maintain/SKILL.md)\n"
    },
    {
      "id": "agent_skills/okforge_query",
      "file": "agent_skills/okforge_query.md",
      "group": "agent_skills",
      "type": "Skill",
      "title": "okforge-query skill",
      "description": "Strictly read-only Claude Code skill for browsing, mapping, and navigating any OKF bundle.",
      "tags": [
        "skill",
        "claude-code",
        "browse",
        "read-only"
      ],
      "outbound": [
        "agent_skills/okf_rules",
        "agent_skills/okforge_maintain",
        "cli_commands/graph"
      ],
      "inbound": [
        "agent_skills/okf_rules",
        "agent_skills/okforge_maintain",
        "cli_commands/graph",
        "cli_commands/install"
      ],
      "broken": [],
      "markdown": "---\ntype: Skill\ntitle: okforge-query skill\ndescription: Strictly read-only Claude Code skill for browsing, mapping, and navigating any OKF bundle.\nresource: dotclaude_folder/skills/okforge-query/SKILL.md\ntags: [skill, claude-code, browse, read-only]\ntimestamp: 2026-06-29\n---\n\n# Overview\n\nThe `okforge-query` skill answers read-only questions about any OKF bundle: its\nstructure, concepts, links, hygiene, and history. It never creates, edits, moves,\nor deletes bundle files. It is the companion to the maintenance-oriented\n[okforge_maintain](./okforge_maintain.md) skill.\n\n# Tooling strategy\n\nPrefer the deterministic [graph](../cli_commands/graph.md) command for anything\ngraph-wide — it parses every doc once and resolves both link forms correctly:\n\n```bash\nnpx okforge graph <op> --bundle <bundle-root>\n```\n\nWhen the command is unavailable (older okforge, offline, non-Node repo), fall\nback to built-ins: Glob to enumerate, Grep to find links and fields, Read for\ncontent — always grepping before reading whole files.\n\n# Operations\n\n| Operation | Backed by |\n| --- | --- |\n| Overview / map | `graph overview` |\n| Open concept | `graph concept <id>` + Read |\n| Neighbors | `graph neighbors <id> [--hops N]` |\n| Search / filter | Grep over frontmatter and bodies |\n| Hygiene (orphans, broken) | `graph orphans`, `graph broken` |\n| Recent changes | Read `log.md` files |\n| Path | `graph path <from> <to>` |\n\n# Format reference\n\nThe detailed format rules — Concept IDs, reserved files, link resolution,\nhygiene definitions — live in [okf_rules](./okf_rules.md), shipped alongside the\nskill and consulted when a link does not resolve as expected or when classifying\nfiles.\n\n# Citations\n\n- [`dotclaude_folder/skills/okforge-query/SKILL.md`](../../dotclaude_folder/skills/okforge-query/SKILL.md)\n"
    },
    {
      "id": "cli_commands/check",
      "file": "cli_commands/check.md",
      "group": "cli_commands",
      "type": "CLI Command",
      "title": "okforge check",
      "description": "Conformance and dead-link lint of the .okf/ bundle; exits non-zero on problems.",
      "tags": [
        "cli",
        "lint",
        "conformance"
      ],
      "outbound": [
        "runtime_concepts/okf_store"
      ],
      "inbound": [
        "agent_skills/okforge_maintain",
        "contribs/webview"
      ],
      "broken": [],
      "markdown": "---\ntype: CLI Command\ntitle: okforge check\ndescription: Conformance and dead-link lint of the .okf/ bundle; exits non-zero on problems.\nresource: src/commands/check_command.ts\ntags: [cli, lint, conformance]\ntimestamp: 2026-06-29\n---\n\n# Synopsis\n\n```bash\nnpx okforge check [dir]\n```\n\nLints the `.okf/` bundle and reports problems. Run it at the end of every\nscaffold or refresh and resolve everything it reports.\n\n# Arguments\n\n| Argument | Default | Meaning |\n| --- | --- | --- |\n| `[dir]` | `.` | Repository root. |\n\n# Behavior\n\nDelegates to `OkfStore.check` — see\n[OkfStore](../runtime_concepts/okf_store.md) for the four checks (NAME, TYPE,\nINDEX, LINK). Repository-agnostic: it needs no mapping, only the bundle markdown.\n\nOn a clean bundle it prints `OK: N concept docs conformant` and exits 0.\n\n# Exit codes\n\n| Code | Meaning |\n| --- | --- |\n| `0` | Conformant. |\n| `1` | One or more problems found; prints each problem, then `FAILED: N problem(s)`. |\n| `2` | No `.okf/` bundle exists (the underlying check threw). |\n\n# Citations\n\n- [`src/commands/check_command.ts`](../../src/commands/check_command.ts)\n- [`src/cli.ts`](../../src/cli.ts)\n"
    },
    {
      "id": "cli_commands/folders",
      "file": "cli_commands/folders.md",
      "group": "cli_commands",
      "type": "CLI Command",
      "title": "okforge folders",
      "description": "List the OKF concept folders declared in .okforge.config.json.",
      "tags": [
        "cli",
        "mapping"
      ],
      "outbound": [
        "config_formats/okforge_config",
        "runtime_concepts/okf_store"
      ],
      "inbound": [
        "agent_skills/okforge_maintain",
        "cli_commands/map"
      ],
      "broken": [],
      "markdown": "---\ntype: CLI Command\ntitle: okforge folders\ndescription: List the OKF concept folders declared in .okforge.config.json.\nresource: src/commands/folders_command.ts\ntags: [cli, mapping]\ntimestamp: 2026-06-29\n---\n\n# Synopsis\n\n```bash\nnpx okforge folders [dir]\n```\n\nPrints the declared OKF concept folder names, one per line, in declared order.\n\n# Arguments\n\n| Argument | Default | Meaning |\n| --- | --- | --- |\n| `[dir]` | `.` | Repository root. |\n\n# Behavior\n\nReads the `folders` keys from\n[`.okforge.config.json`](../config_formats/okforge_config.md) via\n[OkfStore](../runtime_concepts/okf_store.md). Empty output when no config is\npresent.\n\n# Citations\n\n- [`src/commands/folders_command.ts`](../../src/commands/folders_command.ts)\n- [`src/cli.ts`](../../src/cli.ts)\n"
    },
    {
      "id": "cli_commands/graph",
      "file": "cli_commands/graph.md",
      "group": "cli_commands",
      "type": "CLI Command",
      "title": "okforge graph",
      "description": "Read-only concept-graph queries over an OKF bundle, emitted as JSON.",
      "tags": [
        "cli",
        "graph",
        "browse"
      ],
      "outbound": [
        "agent_skills/okforge_query",
        "runtime_concepts/okf_graph"
      ],
      "inbound": [
        "agent_skills/okf_rules",
        "agent_skills/okforge_query",
        "contribs/webview",
        "runtime_concepts/okf_graph"
      ],
      "broken": [],
      "markdown": "---\ntype: CLI Command\ntitle: okforge graph\ndescription: Read-only concept-graph queries over an OKF bundle, emitted as JSON.\nresource: src/commands/graph_command.ts\ntags: [cli, graph, browse]\ntimestamp: 2026-06-29\n---\n\n# Synopsis\n\n```bash\nnpx okforge graph <op> [args...] [--bundle <dir>] [--hops <n>]\n```\n\nAnswers concept-graph queries over a bundle and prints the result as pretty\nJSON, for the [okforge_query](../agent_skills/okforge_query.md) skill to format.\n\n# Arguments and options\n\n| Argument / option | Default | Meaning |\n| --- | --- | --- |\n| `<op>` | — | One of `overview`, `concept`, `neighbors`, `orphans`, `broken`, `path`. |\n| `[args...]` | — | Operation arguments (Concept IDs). |\n| `-b, --bundle <dir>` | `.` | Bundle root directory. |\n| `-n, --hops <n>` | `1` | Neighbor radius for `neighbors` (non-numeric falls back to 1). |\n\n# Operations\n\n| Op | Args | Result |\n| --- | --- | --- |\n| `overview` | — | Concept count, per-group counts, top 10 hub concepts, orphan and broken counts. |\n| `concept` | `<id>` | One concept's frontmatter plus inbound, outbound, and broken links (`{ id, found: false }` when missing). |\n| `neighbors` | `<id>` | IDs within `--hops` undirected steps, grouped by distance. |\n| `orphans` | — | Concepts with no inbound link. |\n| `broken` | — | Every broken `.md` link as `{ from, target }`. |\n| `path` | `<from> <to>` | Shortest directed link path, or null (needs two IDs). |\n\nA trailing `.md` on a Concept ID argument is stripped. The graph itself is built\nby [OkfGraph](../runtime_concepts/okf_graph.md). Throws when the bundle directory\ndoes not exist or the operation is unknown.\n\n# Citations\n\n- [`src/commands/graph_command.ts`](../../src/commands/graph_command.ts)\n- [`src/cli.ts`](../../src/cli.ts)\n"
    },
    {
      "id": "cli_commands/install",
      "file": "cli_commands/install.md",
      "group": "cli_commands",
      "type": "CLI Command",
      "title": "okforge install",
      "description": "Copy the bundled okforge skills into an AI agent folder and register the Stop hook.",
      "tags": [
        "cli",
        "install",
        "hook",
        "skill"
      ],
      "outbound": [
        "agent_skills/okforge_maintain",
        "agent_skills/okforge_query",
        "cli_commands/nudge"
      ],
      "inbound": [
        "cli_commands/nudge"
      ],
      "broken": [],
      "markdown": "---\ntype: CLI Command\ntitle: okforge install\ndescription: Copy the bundled okforge skills into an AI agent folder and register the Stop hook.\nresource: src/commands/install_command.ts\ntags: [cli, install, hook, skill]\ntimestamp: 2026-06-29\n---\n\n# Synopsis\n\n```bash\nnpx okforge install [agent_folder]\n```\n\nCopies the bundled `skills/` tree — the [okforge_maintain](../agent_skills/okforge_maintain.md) and\n[okforge_query](../agent_skills/okforge_query.md) skills — into an agent folder\n(for example `.claude`), preserving the `skills/...` layout, and prints the\nper-file outcome.\n\n# Arguments\n\n| Argument | Default | Meaning |\n| --- | --- | --- |\n| `[agent_folder]` | `.` | Destination agent folder. |\n\n# Behavior\n\nSource files come from the package's `dotclaude_folder/skills` tree; each is\ncopied to `<agent_folder>/skills/...` and reported as `created` or `updated`.\n\nWhen the destination is itself named `.claude`, the command also registers the\n`npx okforge nudge` Stop hook in that folder's `settings.json` —\nidempotent and non-destructive, preserving existing settings and hooks. For any\nother destination the hook step is skipped, since `settings.json` is a `.claude`\nconcept. The registered hook is the [nudge](./nudge.md) command.\n\n# Citations\n\n- [`src/commands/install_command.ts`](../../src/commands/install_command.ts)\n- [`src/cli.ts`](../../src/cli.ts)\n"
    },
    {
      "id": "cli_commands/map",
      "file": "cli_commands/map.md",
      "group": "cli_commands",
      "type": "CLI Command",
      "title": "okforge map",
      "description": "Print the full folder → sources mapping.",
      "tags": [
        "cli",
        "mapping"
      ],
      "outbound": [
        "cli_commands/folders",
        "cli_commands/sources",
        "config_formats/okforge_config",
        "runtime_concepts/okf_store"
      ],
      "inbound": [
        "agent_skills/okforge_maintain"
      ],
      "broken": [],
      "markdown": "---\ntype: CLI Command\ntitle: okforge map\ndescription: Print the full folder → sources mapping.\nresource: src/commands/map_command.ts\ntags: [cli, mapping]\ntimestamp: 2026-06-29\n---\n\n# Synopsis\n\n```bash\nnpx okforge map [dir]\n```\n\nPrints the resolved folder → sources mapping as `## <folder>` headers, each\nfollowed by `  - <source>` rows.\n\n# Arguments\n\n| Argument | Default | Meaning |\n| --- | --- | --- |\n| `[dir]` | `.` | Repository root. |\n\n# Behavior\n\nReads [`.okforge.config.json`](../config_formats/okforge_config.md) via\n[OkfStore](../runtime_concepts/okf_store.md). For a single folder's sources use\n[sources](./sources.md); for just the folder names use [folders](./folders.md).\n\n# Example\n\n```\n## cli_commands\n  - src/cli.ts\n  - src/commands/\n## runtime_concepts\n  - src/misc/\n```\n\n# Citations\n\n- [`src/commands/map_command.ts`](../../src/commands/map_command.ts)\n- [`src/cli.ts`](../../src/cli.ts)\n"
    },
    {
      "id": "cli_commands/nudge",
      "file": "cli_commands/nudge.md",
      "group": "cli_commands",
      "type": "CLI Command",
      "title": "okforge nudge",
      "description": "Stop-hook companion that reminds when documented source changed but .okf/ was not updated.",
      "tags": [
        "cli",
        "hook",
        "staleness"
      ],
      "outbound": [
        "agent_skills/okforge_maintain",
        "cli_commands/install",
        "cli_commands/stale",
        "config_formats/okforge_config"
      ],
      "inbound": [
        "agent_skills/okforge_maintain",
        "cli_commands/install",
        "cli_commands/stale",
        "config_formats/okforge_config",
        "runtime_concepts/okf_store"
      ],
      "broken": [],
      "markdown": "---\ntype: CLI Command\ntitle: okforge nudge\ndescription: Stop-hook companion that reminds when documented source changed but .okf/ was not updated.\nresource: src/commands/nudge_command.ts\ntags: [cli, hook, staleness]\ntimestamp: 2026-06-29\n---\n\n# Synopsis\n\n```bash\nnpx okforge nudge\n```\n\nThe Stop-hook companion to the [okforge_maintain](../agent_skills/okforge_maintain.md) skill. It reads the hook payload as JSON on\nstdin and, when warranted, prints a single non-blocking reminder to refresh the\naffected docs. Registered as a `Stop` hook in `.claude/settings.json` (the\n[install](./install.md) command can register it automatically).\n\n# Behavior\n\nReads `session_id` and `cwd` from the stdin payload (any parse failure falls back\nto empty input; `cwd` defaults to the process cwd). It stays silent unless **all**\nof these hold:\n\n- It has not already nudged this session — a per-session marker file in the\n  temp dir (`claude-okf-nudge-<session_id>`) makes it fire at most once.\n- `cwd` is a git repository.\n- `.okf/` is not already being touched (a `git status --porcelain -- .okf` check),\n  so work in progress is not interrupted.\n- [stale](./stale.md) folders exist (via `OkfStore.staleFolders`).\n\nWhen it fires it writes the marker and emits a `{ \"systemMessage\": ... }` JSON\nline naming the stale folders and suggesting `/okforge-maintain refresh <folder>`.\n\nA Stop hook must never break the session, so every failure is swallowed silently.\nThe folder ↔ source mapping comes from\n[`.okforge.config.json`](../config_formats/okforge_config.md), so the hook and\nthe skill share one source of truth.\n\n# Citations\n\n- [`src/commands/nudge_command.ts`](../../src/commands/nudge_command.ts)\n- [`src/cli.ts`](../../src/cli.ts)\n"
    },
    {
      "id": "cli_commands/sources",
      "file": "cli_commands/sources.md",
      "group": "cli_commands",
      "type": "CLI Command",
      "title": "okforge sources",
      "description": "Print the source paths a folder is derived from.",
      "tags": [
        "cli",
        "mapping"
      ],
      "outbound": [
        "config_formats/okforge_config",
        "runtime_concepts/okf_store"
      ],
      "inbound": [
        "agent_skills/okforge_maintain",
        "cli_commands/map"
      ],
      "broken": [],
      "markdown": "---\ntype: CLI Command\ntitle: okforge sources\ndescription: Print the source paths a folder is derived from.\nresource: src/commands/sources_command.ts\ntags: [cli, mapping]\ntimestamp: 2026-06-29\n---\n\n# Synopsis\n\n```bash\nnpx okforge sources <folder> [dir]\n```\n\nPrints the source path prefixes the given folder is derived from, one per line.\n\n# Arguments\n\n| Argument | Default | Meaning |\n| --- | --- | --- |\n| `<folder>` | — | OKF concept folder name (required). |\n| `[dir]` | `.` | Repository root. |\n\n# Behavior\n\nReads the folder's prefixes from\n[`.okforge.config.json`](../config_formats/okforge_config.md) via\n[OkfStore](../runtime_concepts/okf_store.md). **Throws `unknown folder: <folder>`\nwhen the folder is undeclared** (the command treats an empty list as an error,\nunlike `OkfStore.sources`). Use this during a refresh to find the real files to\nread.\n\n# Citations\n\n- [`src/commands/sources_command.ts`](../../src/commands/sources_command.ts)\n- [`src/cli.ts`](../../src/cli.ts)\n"
    },
    {
      "id": "cli_commands/stale",
      "file": "cli_commands/stale.md",
      "group": "cli_commands",
      "type": "CLI Command",
      "title": "okforge stale",
      "description": "List folders whose source changed since HEAD while the folder was not edited.",
      "tags": [
        "cli",
        "staleness",
        "git"
      ],
      "outbound": [
        "cli_commands/nudge",
        "runtime_concepts/okf_store"
      ],
      "inbound": [
        "agent_skills/okforge_maintain",
        "cli_commands/nudge"
      ],
      "broken": [],
      "markdown": "---\ntype: CLI Command\ntitle: okforge stale\ndescription: List folders whose source changed since HEAD while the folder was not edited.\nresource: src/commands/stale_command.ts\ntags: [cli, staleness, git]\ntimestamp: 2026-06-29\n---\n\n# Synopsis\n\n```bash\nnpx okforge stale [dir]\n```\n\nLists folders whose mapped source changed since HEAD while `.okf/<folder>` itself\nwas not edited, one per line as `<folder> (source changed: <path>)`.\n\n# Arguments\n\n| Argument | Default | Meaning |\n| --- | --- | --- |\n| `[dir]` | `.` | Repository root. |\n\n# Behavior\n\nThin wrapper over `OkfStore.staleFolders` — see\n[OkfStore](../runtime_concepts/okf_store.md) for the staleness rules (compares\ntracked + untracked changes against the mapping, skips folders already being\nedited). Empty output when not a git repo, no folders are declared, or nothing\nrelevant changed. This is the query the [nudge](./nudge.md) hook is built on.\n\n# Citations\n\n- [`src/commands/stale_command.ts`](../../src/commands/stale_command.ts)\n- [`src/cli.ts`](../../src/cli.ts)\n"
    },
    {
      "id": "config_formats/okforge_config",
      "file": "config_formats/okforge_config.md",
      "group": "config_formats",
      "type": "Config Format",
      "title": ".okforge.config.json",
      "description": "Per-repository declaration of the folder ↔ source mapping that drives staleness detection.",
      "tags": [
        "config",
        "mapping",
        "staleness"
      ],
      "outbound": [
        "cli_commands/nudge",
        "runtime_concepts/okf_store"
      ],
      "inbound": [
        "agent_skills/okforge_maintain",
        "cli_commands/folders",
        "cli_commands/map",
        "cli_commands/nudge",
        "cli_commands/sources",
        "runtime_concepts/okf_store"
      ],
      "broken": [],
      "markdown": "---\ntype: Config Format\ntitle: .okforge.config.json\ndescription: Per-repository declaration of the folder ↔ source mapping that drives staleness detection.\nresource: .okforge.config.json\ntags: [config, mapping, staleness]\ntimestamp: 2026-06-29\n---\n\n# Overview\n\n`.okforge.config.json` lives at the repository root and declares the **folder ↔\nsource mapping**: which source path prefixes each OKF concept folder is derived\nfrom. okforge ships with none of this data — it is per-repository.\n\nThe mapping is the single source of truth shared by the skill and the\n[nudge](../cli_commands/nudge.md) hook. When the codebase moves, edit this file;\nboth the skill's guidance and the Stop-hook reminder follow.\n\nThe file is read by [okf_store](../runtime_concepts/okf_store.md), which loads,\nvalidates, and queries it.\n\n# Schema\n\nParsed and validated with Zod (`OkfConfigSchema`). The schema uses\n`.passthrough()`, so unknown top-level keys are preserved rather than rejected.\n\n| Field | Type | Default | Meaning |\n| --- | --- | --- | --- |\n| `folders` | object: `string` → `string[]` | `{}` | Each key is an OKF concept folder name; each value is the list of source path prefixes that folder is derived from. |\n\nA changed file whose path **contains** any of a folder's prefixes (substring\nmatch) marks that folder stale.\n\nWhen the file is absent, okforge loads an empty mapping (`{ folders: {} }`) and\nis effectively a no-op. When the file is present but malformed JSON, or fails\nschema validation, loading throws.\n\n# Examples\n\n```json\n{\n\t\"folders\": {\n\t\t\"runtime_concepts\": [\"packages/foo/src/model/\", \"packages/foo/src/event/\"],\n\t\t\"config_formats\": [\"packages/foo/data/schemas/thing.schema.json\"]\n\t}\n}\n```\n\nThis repository's own config:\n\n```json\n{\n\t\"folders\": {\n\t\t\"cli_commands\": [\"src/cli.ts\", \"src/commands/\"],\n\t\t\"runtime_concepts\": [\"src/misc/\"],\n\t\t\"config_formats\": [\"src/misc/okf_store.ts\"]\n\t}\n}\n```\n\n# Citations\n\n- [`src/misc/okf_store.ts`](../../src/misc/okf_store.ts) — `OkfConfigSchema`, `CONFIG_FILENAME`, `loadConfig`, `folders`, `sources`, `firstMatch`.\n"
    },
    {
      "id": "contribs/webview",
      "file": "contribs/webview.md",
      "group": "contribs",
      "type": "Package",
      "title": "okforge webview",
      "description": "Static-website generator that bakes an OKF bundle into a dependency-free site browsable from file://.",
      "tags": [
        "contrib",
        "webview",
        "static-site",
        "graph",
        "deploy"
      ],
      "outbound": [
        "cli_commands/check",
        "cli_commands/graph",
        "runtime_concepts/okf_graph"
      ],
      "inbound": [
        "runtime_concepts/okf_graph"
      ],
      "broken": [],
      "markdown": "---\ntype: Package\ntitle: okforge webview\ndescription: Static-website generator that bakes an OKF bundle into a dependency-free site browsable from file://.\nresource: contribs/webview/\ntags: [contrib, webview, static-site, graph, deploy]\ntimestamp: 2026-06-30\n---\n\n# Overview\n\n`okforge-webview` is a contrib (not part of the published `okforge` npm package)\nthat renders an OKF bundle as a **static website**: concept pages with rendered\nmarkdown and inbound/outbound link panels, an overview dashboard, an interactive\nconcept graph, and search. It reuses the same graph engine as the CLI\n([OkfGraph](../runtime_concepts/okf_graph.md)), so the site stays consistent with\n[graph](../cli_commands/graph.md) and [check](../cli_commands/check.md). The\ngenerated output has no runtime dependencies and opens directly from `file://`.\n\n# How it works\n\nThe `WebviewGenerator` class in `contribs/webview/src/generate.ts`:\n\n1. Builds the bundle graph with `OkfGraph.build(root)`.\n2. **Bakes** every concept node into a `BakedConcept` (graph metadata plus the\n   raw markdown body read from disk) and every reserved file (`index.md`,\n   `log.md`) into a `reserved` map keyed by bundle path.\n3. Computes an `overview` mirroring `okforge graph overview` (concept count,\n   per-folder groups, top-10 hubs, orphans, broken links).\n4. Copies the static `template/` verbatim into the output and writes the data\n   island to `data.js` as `window.__OKF__ = { ... }`.\n\nThe browser app (`template/app.js`, `index.html`, `styles.css`,\n`vendor/marked.min.js`) reads `window.__OKF__` — nothing is fetched at runtime.\n\n# Baked data shape\n\n`window.__OKF__` (`BakedData`):\n\n| Field | Meaning |\n| --- | --- |\n| `root` | Basename of the bundle directory. |\n| `generatedAt` | ISO 8601 generation timestamp. |\n| `concepts` | Array of `BakedConcept`, sorted by `id`. |\n| `reserved` | Raw bodies of `index.md` / `log.md`, keyed by bundle path. |\n| `overview` | Concept count, groups, hubs, orphans, broken links. |\n\n`BakedConcept` fields: `id`, `file`, `group` (top-level folder, `<root>` for\nroot concepts), `type`, `title`, `description`, `tags`, `outbound`, `inbound`,\n`broken`, `markdown`.\n\n# CLI\n\n`okforge-webview` (Commander):\n\n| Option | Default | Meaning |\n| --- | --- | --- |\n| `-b, --bundle <dir>` | `<repo>/.okf` | OKF bundle root to render. |\n| `-o, --out <dir>` | `contribs/webview/dist` | Output directory for the static site. |\n\nThe generator throws when the `--bundle` path is missing or is not a directory.\n\n# Build and deploy\n\nRepo-root npm scripts (defined in the top-level `package.json`):\n\n| Script | Action |\n| --- | --- |\n| `webview:build` | `tsx src/generate.ts` — bundle `./.okf` → `contribs/webview/dist`. |\n| `webview:open` | Build, then open `dist/index.html`. |\n| `webview:deploy` | Build, then run `scripts/webview_deploy.sh` to force-push `dist/` to the `gh-pages` branch as a single fresh commit (with a `.nojekyll` marker). |\n\n# Citations\n\n- [`contribs/webview/src/generate.ts`](../../contribs/webview/src/generate.ts)\n- [`contribs/webview/package.json`](../../contribs/webview/package.json)\n- [`contribs/webview/README.md`](../../contribs/webview/README.md)\n- [`contribs/webview/template/`](../../contribs/webview/template/)\n"
    },
    {
      "id": "runtime_concepts/okf_graph",
      "file": "runtime_concepts/okf_graph.md",
      "group": "runtime_concepts",
      "type": "Data Model",
      "title": "OkfGraph",
      "description": "The directed, untyped concept-link graph of an OKF bundle and the queries over it.",
      "tags": [
        "runtime",
        "graph",
        "links",
        "orphans"
      ],
      "outbound": [
        "cli_commands/graph",
        "contribs/webview"
      ],
      "inbound": [
        "agent_skills/okf_rules",
        "cli_commands/graph",
        "contribs/webview",
        "runtime_concepts/okf_store"
      ],
      "broken": [],
      "markdown": "---\ntype: Data Model\ntitle: OkfGraph\ndescription: The directed, untyped concept-link graph of an OKF bundle and the queries over it.\nresource: src/misc/okf_graph.ts\ntags: [runtime, graph, links, orphans]\ntimestamp: 2026-06-29\n---\n\n# Overview\n\n`OkfGraph` builds and queries the directed link graph of an OKF bundle. It is\npure, read-only mechanics: it parses frontmatter and markdown links, resolves\nboth the absolute (`/foo.md`) and relative (`./foo.md`) link forms to Concept\nIDs, and answers the graph-heavy queries that are awkward with Glob/Grep alone.\nIt backs the [graph](../cli_commands/graph.md) command and the\n[webview](../contribs/webview.md) generator, which bakes the same graph into a\nstatic site.\n\nReserved files (`index.md`, `log.md`) are not graph nodes and their links do not\nform edges — so a concept reachable only from an `index.md` still counts as an\norphan, which is what makes orphan detection meaningful.\n\n# Data model\n\nA **Concept ID** is the bundle-relative file path with `.md` removed, using POSIX\nseparators.\n\n`ConceptNode` fields: `id`, `file`, `type`, `title`, `description`, `tags`,\n`outbound` (Concept IDs it links to), and `broken` (raw `.md` targets that\nresolve inside the bundle but to a missing file).\n\n`build(root)` returns `OkfGraphData`: `{ root, concepts (Map<id, ConceptNode>),\nlinkedTo (Set of IDs with an inbound edge) }`.\n\n# Queries\n\n| Method | Returns |\n| --- | --- |\n| `build(root)` | The full `OkfGraphData`. |\n| `inbound(graph, id)` | Concept IDs that link to `id`, sorted. |\n| `orphans(graph)` | Concepts with no inbound link, sorted. |\n| `broken(graph)` | Every broken `.md` link as `{ from, target }`. |\n| `neighbors(graph, id, hops)` | IDs within `hops` over **undirected** edges, grouped by distance. |\n| `path(graph, from, to)` | Shortest **directed** link path (inclusive), or null. |\n| `hubs(graph, limit)` | Most-linked-to concepts as `{ id, inbound }`, highest first. |\n| `groups(graph)` | Concept counts per top-level directory (`<root>` for root concepts). |\n\n# Link resolution\n\n`resolveLink(target, file, root)` returns null for anchors, external URLs\n(scheme-prefixed), non-`.md` targets, and targets that normalize outside the\nbundle root — none of which are graph edges. Absolute targets are taken from the\nbundle root; relative targets are joined against the linking file's directory.\n\n`parseFrontmatter` is a deliberately small line-oriented reader for `type`,\n`title`, `description`, and `tags` (inline `[a, b]` or `- item` block form);\nunknown keys are ignored. Helpers: `extractLinkTargets`, `parseInlineTags`,\n`unquote`, `toPosix`, `undirectedNeighbors`, `reconstruct`.\n\n# Citations\n\n- [`src/misc/okf_graph.ts`](../../src/misc/okf_graph.ts)\n"
    },
    {
      "id": "runtime_concepts/okf_store",
      "file": "runtime_concepts/okf_store.md",
      "group": "runtime_concepts",
      "type": "Data Model",
      "title": "OkfStore",
      "description": "Primitive mechanics shared by the subcommands — config loading, git inspection, staleness, and the conformance lint.",
      "tags": [
        "runtime",
        "git",
        "staleness",
        "lint",
        "config"
      ],
      "outbound": [
        "cli_commands/nudge",
        "config_formats/okforge_config",
        "runtime_concepts/okf_graph"
      ],
      "inbound": [
        "cli_commands/check",
        "cli_commands/folders",
        "cli_commands/map",
        "cli_commands/sources",
        "cli_commands/stale",
        "config_formats/okforge_config"
      ],
      "broken": [],
      "markdown": "---\ntype: Data Model\ntitle: OkfStore\ndescription: Primitive mechanics shared by the subcommands — config loading, git inspection, staleness, and the conformance lint.\nresource: src/misc/okf_store.ts\ntags: [runtime, git, staleness, lint, config]\ntimestamp: 2026-06-29\n---\n\n# Overview\n\n`OkfStore` is a static class of the primitive mechanics the subcommands\norchestrate: loading the per-repository\n[`.okforge.config.json`](../config_formats/okforge_config.md) mapping, git\ninspection, staleness detection, and the conformance / dead-link lint. It holds\nno state.\n\n# Key methods\n\n## Config\n\n| Method | Returns | Notes |\n| --- | --- | --- |\n| `configPath(cwd)` | `string` | Absolute path of `.okforge.config.json` for the repo. |\n| `loadConfig(cwd)` | `OkfConfig` | Empty mapping when absent; throws on bad JSON or schema failure. |\n| `folders(cwd)` | `string[]` | Declared folder names, in declared order. |\n| `sources(cwd, folder)` | `string[]` | The folder's source prefixes, or `[]` when undeclared. |\n\n## Git\n\n| Method | Returns | Notes |\n| --- | --- | --- |\n| `git(args, cwd)` | `string` | Runs `git`, returning stdout, or `''` on failure. |\n| `isGitRepo(cwd)` | `boolean` | Whether `cwd` is inside a git working tree. |\n| `changedPaths(cwd)` | `string[]` | Tracked (`diff --name-only HEAD`) plus untracked (`ls-files --others --exclude-standard`) paths, de-duplicated and sorted. |\n\n## Staleness\n\n`staleFolders(cwd)` returns the folders whose source changed since HEAD while\n`.okf/<folder>` itself was not edited. The skip-when-edited rule (a\n`git status --porcelain` check on `.okf/<folder>`) keeps work-in-progress from\ntriggering the [nudge](../cli_commands/nudge.md). `firstMatch(changed, prefixes)`\nis the substring match that pairs a changed path to a folder. Returns `[]` when\nnot a git repo, no folders are declared, or nothing changed.\n\n## Conformance lint\n\n`check(cwd)` lints the `.okf/` bundle and returns the list of problems (empty when\nconformant); it throws when there is no bundle. It needs no mapping — it lints\nthe markdown alone — so it is repository-agnostic. The four checks:\n\n1. **NAME** — no kebab-case (no `-`) in any file or directory name.\n2. **TYPE** — every non-index, non-log `.md` opens with frontmatter holding a\n   non-empty `type:`.\n3. **INDEX** — a sub-folder `index.md` must carry no frontmatter (the root\n   `index.md` may).\n4. **LINK** — every bundle-relative link (a markdown target beginning with a\n   leading slash, ending in `.md`) must resolve to a file.\n\nSupporting helpers: `conceptCount`, `hasTypeFrontmatter`, `bundleLinks`,\n`firstLine`, and `walk` (recursive directory listing, reused by\n[okf_graph](./okf_graph.md)).\n\n# Citations\n\n- [`src/misc/okf_store.ts`](../../src/misc/okf_store.ts)\n"
    }
  ],
  "reserved": {
    "agent_skills/index.md": "# agent_skills\n\nThe Claude Code skills bundled with okforge, shipped under `dotclaude_folder/`\nand copied into an agent folder by the [install](../cli_commands/install.md)\ncommand.\n\n- [okforge_maintain](./okforge_maintain.md) — maintain the OKF bundle (scaffold / refresh / check).\n- [okforge_query](./okforge_query.md) — read-only browsing of any OKF bundle.\n- [okf_rules](./okf_rules.md) — the OKF v0.1 rules reference behind okforge_query.\n",
    "cli_commands/index.md": "# cli_commands\n\nThe `okforge` subcommands, wired up in [`src/cli.ts`](../../src/cli.ts) with\nCommander. Run from the project root with `npx okforge <command>` (Node ≥ 20.12);\neach command takes an optional `[dir]` repository-root argument that defaults to\n`.`.\n\n## Mapping inspection\n\n- [folders](./folders.md) — list the declared OKF concept folders.\n- [map](./map.md) — print the full folder → sources mapping.\n- [sources](./sources.md) — print the source paths a folder is derived from.\n\n## Maintenance\n\n- [stale](./stale.md) — folders whose source changed while the folder was not edited.\n- [check](./check.md) — conformance and dead-link lint.\n- [nudge](./nudge.md) — the Stop-hook companion that reminds when docs drift.\n\n## Browsing and install\n\n- [graph](./graph.md) — read-only concept-graph queries as JSON.\n- [install](./install.md) — copy the bundled skills into an agent folder.\n",
    "config_formats/index.md": "# config_formats\n\nConfiguration file formats okforge reads.\n\n- [okforge_config](./okforge_config.md) — `.okforge.config.json`, the per-repository folder ↔ source mapping.\n",
    "contribs/index.md": "# contribs\n\nOptional, self-contained extensions that ship in this repository but are **not**\npart of the published `okforge` npm package. Each contrib reuses the shared\n[runtime mechanics](../runtime_concepts/index.md) so it stays consistent with the\nCLI.\n\n- [webview](./webview.md) — static-website generator that bakes an OKF bundle into a dependency-free site.\n",
    "index.md": "---\nokf_version: \"0.1\"\ntype: Bundle Index\ntitle: okforge Knowledge Bundle\ndescription: Knowledge for okforge — the deterministic OKF bundle mechanics and Stop-hook nudge for Claude Code.\ntimestamp: 2026-06-29\n---\n\n# okforge\n\nokforge is a small CLI plus a Claude Code skill for maintaining an Open\nKnowledge Format (OKF) bundle. It owns the mechanics — the folder ↔ source\nmapping, staleness detection, conformance and dead-link linting, graph queries,\nand a Stop-hook nudge — so an author can focus on accurate prose.\n\nThis bundle documents okforge itself.\n\n## Folders\n\n- [cli_commands](./cli_commands/index.md) — the `okforge` subcommands and how the CLI is wired.\n- [runtime_concepts](./runtime_concepts/index.md) — the shared mechanics behind every subcommand.\n- [config_formats](./config_formats/index.md) — the per-repository `.okforge.config.json` format.\n- [agent_skills](./agent_skills/index.md) — the bundled Claude Code skills and their format reference.\n- [contribs](./contribs/index.md) — optional extensions shipped in the repo but outside the published npm package.\n\n## Conventions\n\n- Concept folders are **derived** from source files. The mapping lives in\n  [`.okforge.config.json`](../.okforge.config.json) and is the single source of\n  truth shared by the skill and the [nudge](./cli_commands/nudge.md) hook.\n- The change history is in [log.md](./log.md).\n",
    "log.md": "# Change log\n\n## 2026-06-30\n\n- Added the `contribs` folder documenting the `okforge-webview` static-site\n  generator; mapped it to `contribs/webview/` in `.okforge.config.json` and\n  cross-linked it to the `graph` and `check` command docs and the `OkfGraph`\n  runtime concept it reuses.\n- Renamed the `okforge` maintenance skill to `okforge-maintain` for naming\n  symmetry with `okforge-query`. Updated the `agent_skills/okforge` concept doc\n  to `agent_skills/okforge_maintain`, its resource path and cross-links, and the\n  `/okforge-maintain refresh` hint emitted by the `nudge` Stop hook. The CLI\n  package (`npx okforge`) is unchanged.\n\n## 2026-06-29\n\n- Added the `agent_skills` folder documenting the bundled `okforge` and\n  `okforge-query` skills and the OKF rules reference; mapped it to\n  `dotclaude_folder/` and cross-linked the `graph`, `nudge`, and `install`\n  command docs to the skills.\n- Scaffolded the OKF bundle: `cli_commands`, `runtime_concepts`, and\n  `config_formats`, plus the folder ↔ source mapping in `.okforge.config.json`.\n",
    "runtime_concepts/index.md": "# runtime_concepts\n\nThe shared mechanics behind every [CLI command](../cli_commands/index.md). The\ncommand classes are thin; these two classes do the real work.\n\n- [okf_store](./okf_store.md) — config loading, git inspection, staleness detection, and the conformance lint.\n- [okf_graph](./okf_graph.md) — the directed concept-link graph and its queries.\n"
  },
  "overview": {
    "conceptCount": 15,
    "groups": [
      {
        "group": "agent_skills",
        "count": 3
      },
      {
        "group": "cli_commands",
        "count": 8
      },
      {
        "group": "config_formats",
        "count": 1
      },
      {
        "group": "contribs",
        "count": 1
      },
      {
        "group": "runtime_concepts",
        "count": 2
      }
    ],
    "hubs": [
      {
        "id": "config_formats/okforge_config",
        "inbound": 6
      },
      {
        "id": "runtime_concepts/okf_store",
        "inbound": 6
      },
      {
        "id": "cli_commands/nudge",
        "inbound": 5
      },
      {
        "id": "agent_skills/okforge_query",
        "inbound": 4
      },
      {
        "id": "cli_commands/graph",
        "inbound": 4
      },
      {
        "id": "runtime_concepts/okf_graph",
        "inbound": 4
      },
      {
        "id": "agent_skills/okforge_maintain",
        "inbound": 3
      },
      {
        "id": "cli_commands/check",
        "inbound": 2
      },
      {
        "id": "cli_commands/folders",
        "inbound": 2
      },
      {
        "id": "cli_commands/sources",
        "inbound": 2
      }
    ],
    "orphans": [],
    "broken": []
  }
};
