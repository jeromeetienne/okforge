# okforge Blog Series — Adoption Plan (posts 10–14)

Second series. Designed with `docs/blog_series_planner.md`; written to the voice in `docs/writing_style.md`.
Status: drafts written.

## How this differs from the first series (posts 1–5)

- **Goal:** the first series optimizes for **hiring signal** (okforge is the vehicle, the principle is the point). This series optimizes for **okforge adoption** — getting an engineer to run `npx okforge install` and keep it.
- **Audience shift:** from founders/CTOs (strategic, light on code) to **engineers and tech leads** who would actually install the tool. Concrete commands, real config, the daily workflow.
- **Post types:** mostly **how-to / showcase**, not problem-framing essays. Each post moves the reader one step down the funnel.
- **CTA shift:** from "reach out / hire me" to "try it." Only the final post carries the subtle reach-out close.

## The funnel (the spine)

> Try it → configure it → live with it → trust it → reap the value.

Each post is one step, fully standalone, all cross-linked. A reader can enter at any post and still know how to install.

## The series

### Post 10 — "Your repo can document itself in one command" (try it)
- **Hook:** you don't need to write docs; you need to run one command and review what comes out.
- **Body:** the first-run experience — `npx okforge install .claude`, a tiny config, "set up okf" — and a `.okf/` markdown bundle derived from your code falls out. The contrarian beat: okforge backfills docs on an *undocumented* repo, because the "what" is latent in the code.
- **Concrete:** Node >= 20.12, no install step, ~1,200-line tool, draft-then-review loop.
- **Leads to:** how does it know what to document? → Post 11.

### Post 11 — "Documentation is a derived artifact. Configure it like one." (set it up)
- **Hook:** the only thing you configure is a folder-to-source map — that one file is the whole idea.
- **Body:** `.okforge.config.json`; each OKF folder maps to the source path prefixes it's derived from. Once the map exists, drift is computable.
- **Leads to:** now that the map exists, how does it keep you honest? → Post 12.

### Post 12 — "The best doc reminder fires once and shuts up" (live with it)
- **Hook:** most freshness tooling nags until you disable it; okforge reminds you at most once per session, then gets out of the way.
- **Body:** the `npx okforge nudge` Stop hook — non-blocking, silent if you touched `.okf/`, backed by `okforge stale`. Restraint is what keeps a tool installed.
- **Leads to:** a reminder is soft; how do you make freshness enforceable? → Post 13.

### Post 13 — "Make 'are the docs current' a CI check, not a vibe" (trust it)
- **Hook:** you gate merges on tests and lint; doc freshness can be the same green/red.
- **Body:** `okforge check` — snake_case names, required frontmatter `type`, resolving links, non-zero exit. Determinism: these are checkable facts, so they're code, not judgment.
- **Leads to:** trustworthy docs are only worth it if something reads them → Post 14.

### Post 14 — "Markdown in git beats a vector database for your own system's knowledge" (reap the value)
- **Hook:** for curated knowledge about your own system, a folder of markdown in git beats embedding everything and hoping retrieval works.
- **Body:** the bundle is cat-readable, clone-shippable, version-controlled, human- and agent-readable; `okforge graph` queries it (overview, neighbors, orphans, broken, path); the `okforge-query` skill browses it. Honest scoping — not "RAG is dead."
- **Carries:** the full install loop and the one subtle reach-out close.

## Self-critique

- **Overlap 14 ↔ series-1 Post 4** (markdown-vs-vector): Post 4 argues the principle; Post 14 is the hands-on "here are the commands." Different altitude — kept.
- **Risk:** five posts for one small tool can feel padded. Mitigation: each maps to a distinct command/step, none repeat the install pitch as the body.
- **Sequencing:** publish in funnel order; or lead with Post 10 always, since it is the lowest-friction entry.
