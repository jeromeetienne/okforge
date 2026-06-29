---
type: Reference
title: OKF v0.1 rules
description: The format-rules reference bundled with okforge-browse — Concept IDs, reserved files, link resolution, hygiene.
resource: dotclaude_folder/skills/okforge-browse/references/okf-rules.md
tags: [reference, okf, spec]
timestamp: 2026-06-29
---

# Overview

The detail behind the [okforge_browse](./okforge_browse.md) skill, read when a
link does not resolve as expected, when classifying files, or when reporting
hygiene. The authoritative source is `okf/SPEC.md` in
`github.com/GoogleCloudPlatform/knowledge-catalog`; OKF is v0.1 and where the
spec disagrees, the spec wins.

# Core definitions

- **Bundle** — a directory tree of markdown files; may be a subdirectory of a
  larger repository, so the *bundle root* (not the repo root) is what links and
  Concept IDs resolve against.
- **Concept** — any non-reserved `.md` file.
- **Concept ID** — the file's bundle-relative path with `.md` removed
  (`tables/users.md` → `tables/users`).
- **Reserved files** — `index.md` (listing) and `log.md` (change history,
  newest-first, `## YYYY-MM-DD` headings) at every level; never concepts. Only
  the bundle-root `index.md` may carry frontmatter, to declare `okf_version`.

# Frontmatter

YAML between `---` delimiters; `type` is the only required field. Recommended:
`title`, `description`, `resource`, `tags`, `timestamp`. Arbitrary extra keys are
allowed — never reject or warn about unknown keys or unfamiliar `type` values.

# Links — the graph

The bundle is a directed, untyped graph; a link's meaning lives in the prose, not
the link. Two forms: **absolute** (begins with `/`, resolved from the bundle
root — the spec's recommended form) and **relative** (`./x.md`, `../y/z.md`,
resolved from the concept's directory — the common form in the wild). Resolution:
drop `#anchor`, ignore external and non-`.md` targets, ignore targets that escape
the bundle root, then strip `.md`.

# Hygiene

- **Orphan** — a concept with no inbound link *from another concept*; links from
  reserved `index.md` / `log.md` do not count.
- **Broken link** — an in-bundle `.md` target that does not exist. Broken links
  are **valid** in OKF (possibly not-yet-written knowledge) — only reported on
  request, never treated as errors.

These definitions match the [graph](../cli_commands/graph.md) command's `orphans`
and `broken` operations, implemented in
[okf_graph](../runtime_concepts/okf_graph.md).

# Citations

- [`dotclaude_folder/skills/okforge-browse/references/okf-rules.md`](../../dotclaude_folder/skills/okforge-browse/references/okf-rules.md)
