# okforge blog series — plan

The canonical brief for the okforge blog series: the locked decisions, the
through-line, and a detailed spec for each post. Use this while drafting and
publishing.

---

## Series parameters (locked)

| Decision | Choice |
|---|---|
| **Arc** | Idea-driven — each post carries one transferable idea, anchored in okforge. |
| **Count / format** | 4 long-form posts (~1,500–2,500 words each). |
| **Venue** | Personal blog, long-form (canonical there; syndicate later if wanted). |
| **Voice** | Opinionated / contrarian. Each post picks a fight. |
| **Scope** | Hybrid — project-grounded, but every post generalizes its lesson into a transferable principle. |
| **Depth** | High-level / conceptual. Demonstrate skill through *judgment and decisions*, not code walkthroughs. |
| **Tentpoles** | Post 2 (the model/deterministic boundary) and Post 4 (the open-format bet). |
| **Title convention** | Every post title is prefixed `okforge: `. |

### Audience
- **Primary:** AI engineers / LLM app builders, and hiring managers / technical leaders.
- Implication: respect the reader's intelligence; lead with ideas and tradeoffs. Leaders skim for judgment, engineers skim for the transferable principle — serve both with strong topic sentences and a quotable rule per post.

### Goals (in priority order)
1. **Career / portfolio** + **thought leadership** — the spine of the series.
2. **Drive okforge adoption** — the payoff, concentrated in Post 4's CTA (not scattered throughout).
3. **Build in public** — the *texture*: first-person decisions, refusals, and dead-ends woven through, not a standalone "my journey" post.

---

## The through-line

> **Knowledge is derived state. AI makes code cheap and knowledge debt expensive.**

Every post restates this from a new angle: Post 1 names the problem, Post 2 builds the architecture that makes "derived" real, Post 3 makes the derivation trustworthy, Post 4 makes it durable and adopted.

### Origin (the hook)
The more we build with AI agents, the faster code is generated — and the faster documentation drifts. The author tried multiple documentation systems; all drifted. OKF makes it possible to keep documentation good *and* keep it updated. *(Personalize with a real anecdote or metric before publishing — currently kept qualitative.)*

### Proof point
okforge dogfoods on a second, real project: **`issue_autofix`** (a Claude Code plugin). Its bundle has four folders (`slash_commands`, `cli`, `concepts`, `packaging`), a real `.okforge.config.json` source→knowledge mapping, and a `concepts/` folder capturing cross-cutting invariants (`never_merge`, `conflict_free_invariant`, `worktree_isolation`). Used as concrete material in Posts 1 and 4.

---

## The four posts

### Post 1 — okforge: The Faster AI Writes Code, the Faster Your Docs Rot
- **Status:** ✅ Drafted → [post-1-the-faster-ai-writes-code-the-faster-your-docs-rot.md](post-1-the-faster-ai-writes-code-the-faster-your-docs-rot.md)
- **Subtitle:** AI agents made writing code almost free. That's exactly why your documentation is rotting faster than ever — and why "just write better docs" was always the wrong answer.
- **Role:** The hook, the problem statement, the project intro, and the series frame.
- **Audience:** Everyone; especially leaders (problem framing) and AI engineers.
- **Key message:** AI-accelerated coding doesn't reduce documentation work; it compounds knowledge debt. Stop babysitting prose — derive it.
- **The fight it picks:** "Just write better docs / be more disciplined" — argued as treating a *structural* problem (a derived artifact nobody recomputed) as a willpower problem.
- **Key beats:**
  1. Hook: AI made code free → docs rot faster (lead the first two sentences).
  2. Docs are a *derived artifact*, like a binary or a cache — discipline can't fix a derivative nobody recomputed.
  3. Why AI accelerates drift: volume, velocity, and a new unforgiving reader (the agent reads stale docs and compounds the error at machine speed).
  4. The knowledge that evaporates first: the cross-cutting "why" / invariants, not the descriptive.
  5. Pre-empt the objection: "can't the agent just update the docs?" → fails 3 ways (doesn't know what's affected, writes from memory, rewrites what didn't change). Tees up Posts 2 & 3.
  6. The reframe: treat knowledge as derived state; the four engineering questions.
  7. What it looks like: okforge + OKF, the `issue_autofix` config mapping as "knowledge debt made computable."
  8. Thesis + roadmap + kicker.

### Post 2 — okforge: Give the Model Less  *(tentpole)*
- **Status:** ✅ Drafted → [post-2-give-the-model-less.md](post-2-give-the-model-less.md)
- **Subtitle:** The most reliable AI systems hand the LLM the smallest possible job — and make everything around it checkable.
- **Role:** The system-design tentpole. The clearest demonstration of AI-engineering and system-design judgment; the most transferable idea in the series.
- **Audience:** AI engineers (the principle) + leaders (system-design judgment).
- **Key message:** Reliability comes from drawing the model/deterministic boundary deliberately — and drawing it *small*.
- **The fight it picks:** "Agentic" maximalism / "let the agent handle the whole loop" — argued as optimizing for the demo, not for reliability.
- **Quotable rule:** *"If you can write a test for it, don't write a prompt for it."*
- **Key beats:**
  1. Thesis: the reflex is to give the model more; for reliability, give it less.
  2. Why we over-use the model (it *kind of* does everything; it's the most expensive/slowest/least predictable component).
  3. The rule + the heuristic.
  4. Boundary table: okforge's four jobs; three have a right answer (code), only prose is the model's.
  5. Two refusals: staleness = a `git diff`, not a guess; validity = a linter, not a trusted instruction. Motif: *the model proposes, deterministic code disposes.*
  6. What the model *is* for (synthesis/judgment over natural language) — keeps it from reading as LLM-bashing; tees up Post 3.
  7. Payoffs of a small model surface: reliability, auditability, cost/latency, containment (blast radius).
  8. The transferable method: enumerate → classify → push toward code → wrap in checks.
  9. Close: give the model less.

### Post 3 — okforge: Don't Make It Remember, Make It Read
- **Status:** ✅ Drafted → [post-3-dont-make-it-remember-make-it-read.md](post-3-dont-make-it-remember-make-it-read.md)
- **Subtitle:** Hallucination is a design failure, not a model failure.
- **Role:** The trust/grounding post. Completes the pair with Post 2 — that post shrinks the model's job to "write prose"; this one makes even that trustworthy.
- **Audience:** AI engineers (primary) + leaders (the trust/risk framing).
- **Key message:** Don't ask the model to recall — make it read, cite, and defer to review. Trust is engineered, not hoped for.
- **The fight it picks:** "The model already knows the codebase / just ask it about the code." Argued: a model recalling code is confident, fluent, and wrong — the worst failure mode.
- **Key beats:**
  1. The trap: authoritative recall vs. actual reading; fluent-and-wrong is the dangerous mode.
  2. Callback to Post 2: we shrank the job to prose; now make the prose trustworthy.
  3. okforge's grounding discipline: refresh **reads the real source** (`sources <folder>`) before writing; never works from memory; never invents fields/routes/flags.
  4. Draft-then-review: the model rewrites affected docs, the human reviews, then commit; it won't silently rewrite docs whose source didn't change. Human-in-the-loop as a primitive.
  5. Cite real source: `# Citations` link real repo files — grounding is *auditable*; trace any claim to its source.
  6. Fail closed: when uncertain, omit rather than guess (the opposite of the model's default to fill gaps).
  7. Generalize: grounding patterns for any AI feature — read-then-write, cite, human-in-the-loop, fail closed, constrain to provided context (the honest core of "RAG").
  8. Why "design failure, not model failure": you can engineer hallucination toward zero for a bounded task by controlling inputs and gating outputs; blaming the model abdicates the design.
  9. Close: trust is constructed.

### Post 4 — okforge: Bet on Boring Formats  *(tentpole)*
- **Status:** ✅ Drafted → [post-4-bet-on-boring-formats.md](post-4-bet-on-boring-formats.md)
- **Subtitle:** Why I shipped plain markdown, an open spec, and an installable skill instead of a clever app.
- **Role:** The open-format tentpole and the series payoff — carries the adoption story and the CTA, and ends on conviction.
- **Audience:** Dev-tools / DX + leaders + adoption-minded developers.
- **Key message:** Your knowledge should outlive your tools. Open, boring formats plus frictionless distribution win adoption.
- **The fight it picks:** "Build a polished app/SaaS with a UI and a database." Argued: clever dies, boring compounds.
- **Key beats:**
  1. The bet: okforge could've been an app with a database; instead it's plain markdown, an open spec, an installable skill — why.
  2. Boring formats win: markdown you can `cat`, `grep`, `git diff`, read without the tool; knowledge outlives the tool that wrote it; no lock-in, no export.
  3. In the repo, not a database: knowledge travels with the code, versions with it, reviews in the same PR; `git clone` = you have the knowledge.
  4. Open spec (OKF) over a silo: betting on an open format means interop — other tools and agents can read it. (Adopting an existing open spec, not inventing a silo.)
  5. Skill, not SaaS: `npx okforge install` drops the skill into `.claude/` and registers the nudge hook — no signup, no server. Capability you install, not a service you rent.
  6. The last mile: the gentle nudge (Stop hook) — reminds only when docs drifted, once per session, non-blocking, silent if you touched `.okf/`. Behavioral design that builds a habit without nagging.
  7. Proof: `issue_autofix` dogfooding — a real second repo with a real bundle.
  8. Lessons learned + where it goes next.
  9. CTA: try okforge.
  10. Close: bet on boring.

---

## Status tracker

| # | Title | Status | File |
|---|---|---|---|
| 1 | okforge: The Faster AI Writes Code, the Faster Your Docs Rot | ✅ Drafted | `post-1-…-docs-rot.md` |
| 2 | okforge: Give the Model Less | ✅ Drafted | `post-2-give-the-model-less.md` |
| 3 | okforge: Don't Make It Remember, Make It Read | ✅ Drafted | `post-3-…-read.md` |
| 4 | okforge: Bet on Boring Formats | ✅ Drafted | `post-4-bet-on-boring-formats.md` |

---

## Self-critique & open items

- **Posts 2 and 3 risk blurring** (boundary vs. grounding). Mitigation baked in: Post 2 = "what code owns," Post 3 = "how we trust the model's slice." Keep the explicit callback in Post 3 so they read as a deliberate pair.
- **Each post needs a real antagonist** — listed per post above. If a draft stops picking a fight, it has drifted from the chosen voice.
- **Personalize the origin** (Post 1): swap the qualitative placeholder for a real anecdote or metric before publishing — it will hit harder.
- **Proof is now solid** (`issue_autofix`); make sure Post 4 shows it concretely rather than asserting adoption.
- **Cross-link URLs:** posts currently link each other by repo filename; swap for published URLs at publish time.
- **Roadmap repetition:** the end of Post 1 lists the other titles each prefixed `okforge:`; if the triple repetition reads heavy in-body, drop the prefix in that list only (keep it on real H1 titles).

## Conventions
- **Titles:** prefix every post title with `okforge: `.
- **File names:** kebab-case, in `docs/blog_posts/`.
- **Through-line:** restate "knowledge is derived state" once per post, from that post's angle.
- **One quotable line per post** (Post 2: "if you can write a test for it, don't write a prompt for it"). Give Posts 3 and 4 their own.
- **Voice:** opinionated, first-person, concrete; strong topic sentences; no hedging; ground claims in real okforge / `issue_autofix` specifics.
