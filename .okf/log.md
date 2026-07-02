# Change log

## 2026-07-02

- Refreshed the webview docs after the generator moved from
  `contribs/webview/src/generate.ts` (`WebviewGenerator`) into the published CLI
  as `WebviewCommand` in `src/commands/webview_command.ts`, exposed as the
  `webview generate` / `webview show` subcommands. Added the
  `cli_commands/webview` concept, rewrote `contribs/webview` to reflect that the
  contrib folder now holds only the GitHub Pages deploy tooling and generated
  `dist/`, and cross-linked both.
- Documented the new `OkfFetch` runtime concept
  (`runtime_concepts/okf_fetch`, from `src/misc/okf_fetch.ts`), which downloads a
  remote http(s)/GitHub bundle into a temp directory by crawling its in-bundle
  markdown links so a URL source can be rendered like a local bundle.

## 2026-06-30

- Added the `contribs` folder documenting the `okforge-webview` static-site
  generator; mapped it to `contribs/webview/` in `.okforge.config.json` and
  cross-linked it to the `graph` and `check` command docs and the `OkfGraph`
  runtime concept it reuses.
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
