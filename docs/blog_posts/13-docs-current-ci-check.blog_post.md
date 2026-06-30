# Make "Are the Docs Current" a CI Check, Not a Vibe

You gate merges on tests and lint. Doc quality gets a shrug and a hope. That asymmetry is why your docs rot and your tests don't.

[okforge](https://github.com/jeromeetienne/okforge) closes the gap with one command. `okforge check` turns "are these docs well-formed and intact" into a green-or-red your CI can enforce — exactly like the rest of your pipeline.

> The complete project is open source: [github.com/jeromeetienne/okforge](https://github.com/jeromeetienne/okforge)

![Doc freshness, green or red — okforge](images/13-docs-current-ci-check.png)

## One command, non-zero on problems

```bash
npx okforge check
```

It verifies the things that have a single correct answer: names are snake_case, every non-index doc carries a non-empty frontmatter `type`, sub-folder index files carry no frontmatter, and every internal markdown link actually resolves. Find a problem, exit non-zero. Drop it in CI and a broken bundle fails the build like a broken test.

No model runs here. None should. Whether a link resolves isn't a judgment call — it's a fact you compute. So it's plain code, fast and deterministic, the kind of check you can put on the merge gate without flake.

## What the check is — and isn't

`check` is about integrity, not opinion. It won't tell you a paragraph is poorly written; that's not its job and never could be. It tells you the bundle is structurally sound — naming holds, required metadata is present, nothing links into a void.

That boundary is deliberate. The model writes the prose, because there's no single right paragraph. Code verifies the structure, because there is exactly one right answer to "does this link resolve." Put each on the side it belongs, and the check is something you can trust enough to block a merge on.

## Why this is the step that earns trust

A reminder is a suggestion. A CI check is a contract. The moment a broken bundle can fail the build, your docs join the set of things the repo guarantees instead of the set of things it merely hopes for.

And that guarantee is what makes the whole exercise pay off. A docs bundle that passes `check` on every commit is one your teammates open without hesitating — and one your AI agents can read as ground truth instead of stale guesswork.

## The turn

Tests don't keep your code correct because engineers are disciplined. They keep it correct because the build goes red. We outsourced the discipline to the machine, and that's why it sticks.

Documentation never got that treatment, so it never got that reliability. `okforge check` is just the overdue move of holding docs to the same standard we already hold code: not "please remember," but "the gate won't open until it's right."

## Takeaway

Stop relying on goodwill to keep docs intact. Make `okforge check` a CI step, and bundle integrity becomes a property the build enforces — not a thing you hope someone remembered.

Add it to your pipeline today: `npx okforge check`. Next: now that the docs are trustworthy, the payoff — letting humans and agents actually query them.
