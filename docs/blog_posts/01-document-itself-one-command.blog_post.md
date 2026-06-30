# Your Repo Can Document Itself in One Command

You don't need to sit down and write documentation. You need to run one command and review what comes back.

That sounds like a sales line. It's just what [okforge](https://github.com/jeromeetienne/okforge) does. Point it at a repo, and it drafts a folder of markdown docs derived from your actual code — then hands them to you to check.

> The complete project is open source: [github.com/jeromeetienne/okforge](https://github.com/jeromeetienne/okforge)

![One command, then you review — okforge](images/01-document-itself-one-command.png)

## The thirty-second version

Three steps, from nothing to a docs bundle:

```bash
npx okforge install .claude
```

Then a tiny `.okforge.config.json` that says which folders map to which source. Then you ask Claude to "set up okf" — and a `.okf/` directory of plain markdown appears, each file describing a real part of your system.

No install step, no build, Node >= 20.12, and the whole tool is around 1,200 lines. You're not adopting a platform. You're running a script and reading the output.

## The part people get wrong

The usual assumption is that documentation tooling only helps repos that are already documented. Blank repo, blank output.

Backwards. okforge works *best* on the undocumented mess, because the "what" of your system is already latent in the code. The structure is there — the modules, the routes, the config schema, the commands. A model can read it and reconstruct the description. You weren't starting from a blank page. You were starting from a page written in a language you hadn't transcribed yet.

So the messy repo you've been avoiding is exactly the one to try this on.

## It drafts; you decide

One thing okforge will not do is silently overwrite your judgment. Regeneration is a draft-then-review loop: the model writes the prose, you read it, you commit what's right. It never claims a doc is correct because it generated it.

That's the difference between a tool you trust and a tool you babysit. The machine does the typing. You keep the final say.

## The turn

I spent years treating documentation as a writing task — a thing I owed the repo and never paid. The reframe was realizing most of it isn't writing at all. It's transcription. The information already exists in the code; someone just has to render it as prose and keep it current.

Once that's a command, the cost of starting drops to almost nothing. And the hardest doc to write — the first one, on the repo that has none — becomes the easiest.

## Takeaway

If your excuse for no docs is "I never have time to write them," okforge removes the excuse. Run one command on your least-documented repo and review the draft. Worst case, you spent a minute. Best case, you finally have docs you'll open.

Try it: `npx okforge install .claude`. Next: how it knows what to document — the one file you actually configure.
