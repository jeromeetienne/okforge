# okforge Blog Series — Plan

Designed with `docs/blog_series_planner.md`; written to the voice in `docs/writing_style.md`.
Status: outline approved, drafts not yet written.

## Locked decisions

- **Spine (the how):** "Model writes prose, code verifies" — *Don't ask a model what code can compute.* / *Code computes, the model judges.*
- **Opening hook (the why):** docs drift, and you stop trusting your own documentation.
- **Audience:** founders/CTOs, strategic. Light on code (the code is mostly AI-written anyway).
- **Length:** 5 posts (4 core + 1 optional close). Each fully standalone — entertaining and useful on its own, no assumption the reader saw the others, all cross-linked.
- **Goal:** hiring signal (attract AI consulting / freelance / engineering work). Adoption is a bonus. Keep the signal subtle — one calm closing line.

## Raw material from the interview

- **Origin:** Jerome stopped trusting his own docs — always late, drifted, no way to tell what was missing. Wanted docs that are both AI-maintained and AI-consumable. OKF is Google's open format for this; inspired in part by Karpathy's "second brain" wiki idea. Came after an earlier ADR-focused experiment, ADR Journey.
- **The surprise / key insight:** OKF backfills well on an undocumented codebase (the "what" is latent in code, AI reconstructs it). ADR backfill failed — ADRs need the "why," and once intent is forgotten it can't be inferred from the card, the code, or even the commit. **AI reconstructs structure, not lost intent.**
- **Numbers:** built in 2 days, solo, published on npm. ~1,200 lines of TypeScript + ~230 lines of skill prose. Small but high-leverage.
- **Design philosophy:** keep the LLM on what it's good at; push anything deterministic into code. The discriminator is determinism, not testability (you *can* test an LLM). → *Don't ask a model what code can compute.*

## Central story

> I stopped trusting my own documentation — so I made AI maintain it. The real lesson wasn't about docs. It was about which jobs you give the model and which you give code.

What readers remember: **"Code computes, the model judges."**

Rejected as spine: OKF format walkthrough (too inward), RAG-for-agents (narrower; better as one post), pure build log (underuses the principle; better as the close).

Not worth a standalone post (used as detail instead): the webview/static-site generator, nudge-hook internals, install/distribution mechanics.

## The series

Order follows the arc: why → how → surprise → vision → meta. Each post stands alone.

### Post 20 — "The most dangerous documentation is the kind you don't trust" (the why)
- **Hook:** bad docs aren't the problem; docs you've quietly stopped trusting are — you can't tell what's stale, so you ignore all of it.
- **Synopsis:** docs drift behind code, trust collapses, and in the AI era agents now read those docs and act on stale context. The fix isn't discipline — it's treating docs as a derived artifact with automated maintenance and staleness detection.
- **Audience:** founders/CTOs. **Assumes:** nothing.
- **Takeaway:** untrusted docs are worse than none; make freshness a computed property.
- **Demonstrates:** problem framing.
- **Leads to:** who maintains freshness automatically? → Post 21.

### Post 21 — "Don't ask a model what code can compute" (the how — spine, likely flagship)
- **Hook:** everyone's handing whole workflows to an LLM; most of those steps shouldn't touch a model.
- **Synopsis:** in okforge the model writes prose; deterministic code enforces links, naming, frontmatter, and staleness. The discriminator isn't testability (you can test an LLM) — it's determinism. *Code computes, the model judges.*
- **Audience:** founders/CTOs + engineers. **Assumes:** rough idea of an LLM/agent.
- **Takeaway:** split every AI workflow on one line — knowable answer → code, judgment → model.
- **Demonstrates:** AI-systems design judgment (strongest expertise signal, most shareable).
- **Leads to:** how well can AI reconstruct knowledge never written down? → Post 22.

### Post 22 — "AI can recover what your code does. It can't recover why." (the surprise)
- **Hook:** AI documented one project in minutes; on another it couldn't meaningfully start.
- **Synopsis:** OKF backfills well (the "what" is latent in code); ADR backfill fails (the "why" is gone and can't be inferred from card, code, or commit). AI reconstructs structure, not lost intent.
- **Audience:** founders/CTOs + engineers. **Assumes:** nothing (define ADR in one line).
- **Takeaway:** record intent now — it's the one thing AI can't backfill later.
- **Demonstrates:** nuance and rigor (ran the comparison, drew the line precisely).
- **Leads to:** what format should this knowledge live in? → Post 23.

### Post 23 — "Your agent's knowledge base is probably overengineered" (the vision)
- **Hook:** before standing up a vector database for your own system's knowledge, try a folder of markdown in git.
- **Synopsis:** for curated knowledge about your own system, a git-native markdown bundle — cat-readable, clone-shippable, version-controlled, human- and agent-readable — beats embedding everything and hoping retrieval works. Honest scoping: not "RAG is dead," just the right tool for curated, authored knowledge.
- **Audience:** founders/CTOs + engineers building with agents. **Assumes:** has heard of RAG/vector search.
- **Takeaway:** match the format to the knowledge; curated context wants git and markdown.
- **Demonstrates:** forward-looking, opinionated, fluent in real agent tooling.
- **Leads to:** how do you build this fast? → Post 24.

### Post 24 — "I shipped a dev tool in two days. The code was the easy part." (the meta close, optional)
- **Hook:** AI wrote most of okforge's code; the job was deciding what not to let it decide.
- **Synopsis:** short build log — 2 days, solo, ~1,200 lines, live on npm. The work was drawing the line between judgment (model) and deterministic machinery (code): skill-as-distributed-instructions, the gentle once-per-session nudge, the reused graph engine. The tool embodies its own thesis.
- **Audience:** founders/CTOs, hiring managers. **Assumes:** nothing.
- **Takeaway:** senior AI work is deciding what's deterministic vs judgment, then directing each.
- **Demonstrates:** ships fast, modern AI workflow, meta-consistency. Carries the subtle reach-out close.
- **Leads back to:** links all four.

## Self-critique (Phase 4)

- **Overlap 21↔24** (model-vs-code): kept distinct — post 21 is the transferable principle; post 24 is the personal build story. Different altitude.
- **Overlap 20↔23** (docs for AI): post 20 is maintenance/trust; post 23 is format/consumption. Distinct.
- **Overclaim in post 23:** explicitly scoped away from "RAG is dead" to stay credible.
- **Cut for cause:** webview, nudge internals, install mechanics — folded into post 24, never their own thin posts.
- **Sequencing:** publish in order for the arc; or lead with post 21 for maximum impact (most shareable). Both work since posts are standalone.

## Recommendation

Ship all 5. Posts 20–23 are a complete series; post 24 is the optional bonus where the hiring signal lands — keep it.

## Related

- Principle issue: https://github.com/jeromeetienne/jeromeetienne.github.io/issues/14
