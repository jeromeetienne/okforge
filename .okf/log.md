# Change log

## 2026-06-30

- Renamed the `okforge` maintenance skill to `okforge-maintain` for naming
  symmetry with `okforge-query`. Updated the `agent_skills/okforge` concept doc
  to `agent_skills/okforge_maintain`, its resource path and cross-links, and the
  `/okforge-maintain refresh` hint emitted by the `nudge` Stop hook. The CLI
  package (`npx okforge`) is unchanged.

## 2026-06-29

- Added the `agent_skills` folder documenting the bundled `okforge` and
  `okforge-query` skills and the OKF rules reference; mapped it to
  `dotclaude_folder/` and cross-linked the `graph`, `nudge`, and `install`
  command docs to the skills.
- Scaffolded the OKF bundle: `cli_commands`, `runtime_concepts`, and
  `config_formats`, plus the folder ↔ source mapping in `.okforge.config.json`.
