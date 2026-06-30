# Documentation Is a Derived Artifact. Configure It Like One.

The only thing you configure in [okforge](https://github.com/jeromeetienne/okforge) is a single file that says which docs come from which source. That one map is the entire idea.

Everything else — the markdown, the staleness checks, the reminders — falls out of it. Get the map right and the tool works. There is nothing else to tune.

> The complete project is open source: [github.com/jeromeetienne/okforge](https://github.com/jeromeetienne/okforge)

![One map, and drift becomes computable — okforge](images/02-derived-artifact-configure-it.png)

## The whole config

It lives at the project root as `.okforge.config.json`:

```json
{
  "folders": {
    "runtime_concepts": ["packages/foo/src/model/", "packages/foo/src/event/"],
    "config_formats": ["packages/foo/data/schemas/thing.schema.json"]
  }
}
```

Each key is a docs folder. Each value is the list of source paths that folder is derived from. That's it. `runtime_concepts` is generated from those two source directories; `config_formats` is generated from that schema. okforge ships with zero repo-specific paths — this file is the only project-specific part, and you write it once.

## Why one tiny file does so much

Here's the move. Most doc tools treat documentation as prose you maintain by discipline. okforge treats it as an artifact derived from source — the way a compiled binary is derived from code.

The instant you write down "this folder comes from those files," drift stops being a feeling and becomes arithmetic. Source file changed, its doc didn't? The system knows. It can flag the exact folder that went stale, automatically, the moment the thing it describes moves.

You didn't configure a documentation tool. You declared a dependency. Everything okforge does after that is just reading the graph you drew.

## Start small, grow it

You don't map the whole repo on day one. Add the folders you care about — the config schema, the public API, the runtime core — and leave the rest. With no config at all, the mapping is simply empty and the staleness check is a no-op; the conformance lint still runs on whatever markdown exists.

So there's no big-bang setup. One folder mapped is already useful. Add the next when you feel the next one drift.

## The turn

I used to think the hard part of docs was writing them. The hard part is knowing which ones to trust, and that's a property of the map, not the prose. A page with no declared source is a page you can't reason about — you can't tell if it's current, so you quietly stop believing it.

Declaring the source is what makes a doc checkable. The prose is the easy half. The map is the half that makes the prose worth keeping.

## Takeaway

If you adopt one habit from okforge, adopt this: write down which docs derive from which source. That single mapping turns "are the docs stale" from a vibe into a computed answer — and it's about ten lines of JSON.

Map one folder today. Next: how okforge keeps you honest without nagging — the reminder that fires once and shuts up.
