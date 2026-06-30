---
type: Config Format
title: .okforge.config.json
description: Per-repository declaration of the folder ↔ source mapping that drives staleness detection.
resource: .okforge.config.json
tags: [config, mapping, staleness]
timestamp: 2026-06-29
---

# Overview

`.okforge.config.json` lives at the repository root and declares the **folder ↔
source mapping**: which source path prefixes each OKF concept folder is derived
from. okforge ships with none of this data — it is per-repository.

The mapping is the single source of truth shared by the skill and the
[nudge](../cli_commands/nudge.md) hook. When the codebase moves, edit this file;
both the skill's guidance and the Stop-hook reminder follow.

The file is read by [okf_store](../runtime_concepts/okf_store.md), which loads,
validates, and queries it.

# Schema

Parsed and validated with Zod (`OkfConfigSchema`). The schema uses
`.passthrough()`, so unknown top-level keys are preserved rather than rejected.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `folders` | object: `string` → `string[]` | `{}` | Each key is an OKF concept folder name; each value is the list of source path prefixes that folder is derived from. |

A changed file whose path **contains** any of a folder's prefixes (substring
match) marks that folder stale.

When the file is absent, okforge loads an empty mapping (`{ folders: {} }`) and
is effectively a no-op. When the file is present but malformed JSON, or fails
schema validation, loading throws.

# Examples

```json
{
	"folders": {
		"runtime_concepts": ["packages/foo/src/model/", "packages/foo/src/event/"],
		"config_formats": ["packages/foo/data/schemas/thing.schema.json"]
	}
}
```

This repository's own config:

```json
{
	"folders": {
		"cli_commands": ["src/cli.ts", "src/commands/"],
		"runtime_concepts": ["src/misc/"],
		"config_formats": ["src/misc/okf_store.ts"]
	}
}
```

# Citations

- [`src/misc/okf_store.ts`](../../src/misc/okf_store.ts) — `OkfConfigSchema`, `CONFIG_FILENAME`, `loadConfig`, `folders`, `sources`, `firstMatch`.
