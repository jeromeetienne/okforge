# Markdown in Git Beats a Vector Database for Your Own System's Knowledge

Before you stand up a vector database to hold what your team knows about your own system, try a folder of markdown in git. For curated, authored knowledge, it usually wins.

That's the bet [okforge](https://github.com/jeromeetienne/okforge) makes. The docs it maintains aren't embeddings in some service — they're plain files you can `cat`, `clone`, diff, and query. And that plainness is exactly what makes them useful to humans and agents alike.

> The complete project is open source: [github.com/jeromeetienne/okforge](https://github.com/jeromeetienne/okforge)

![A bundle you can cat, clone, and query — okforge](images/14-markdown-git-beats-vector-db.png)

## The bundle is just files

An okforge bundle lives in `.okf/` — a directory of markdown, each concept file carrying a little YAML frontmatter, with reserved `index.md` and `log.md` for listings and history. There's no manifest, no build, no server. If you can read a file, you can read the bundle. If you can clone a repo, you can ship it.

That means it's version-controlled by default. You see knowledge change in the same diffs as the code that drove the change. The "why did this doc say that" question is answered by `git blame`, not a re-index.

## It's queryable without an index

Plain files don't mean dumb files. The bundle is a concept graph, and okforge reads it:

```bash
npx okforge graph overview
npx okforge graph neighbors <concept>
npx okforge graph orphans
npx okforge graph broken
```

You get the shape of the knowledge, what links to what, which concepts are stranded, which links are dead — all as JSON, no embedding step. The same engine powers a read-only browser skill, so an AI agent can walk the graph the same way you do on the command line. One source of truth, two faces.

## Where a vector DB still wins

Let me be honest about the scope, because the contrarian version of this take is wrong. This isn't "RAG is dead." Embeddings and vector search are the right tool when you have a large, unauthored corpus — support tickets, a decade of wiki sprawl, documents nobody curated — and you need fuzzy recall across all of it.

That's a different problem from "the curated truth about my own system." For that second case — bounded, authored, changing alongside code — a git-native markdown bundle is simpler, cheaper, and more honest. Match the format to the knowledge. Don't reach for retrieval infrastructure to hold the thing that fits in a folder.

## The turn

The reflex is to assume agent knowledge demands a database. Vectors, retrieval, infra. But most of what your agent needs to know about *your* system is small, curated, and already changing in your git history. Embedding it is solving a recall problem you don't have, and giving up the diffability you do.

The boring option — markdown, in git, mapped to source — turns out to be the one that stays current, stays readable, and ships with the repo.

## Takeaway

For curated knowledge about your own system, reach for a folder of markdown in git before a vector store. It's cat-readable, clone-shippable, version-controlled, and queryable — and it's the format both your teammates and your agents already understand.

That's the full okforge loop: `install`, map your folders, let the nudge keep you honest, gate it with `check`, and query the graph. Try it on one repo: `npx okforge install .claude`.

I build small AI tools that fix exactly this kind of papercut. If that's useful to your team, reach out.
