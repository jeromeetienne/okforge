# The Best Doc Reminder Fires Once and Shuts Up

Most documentation tooling nags you until you turn it off. Then it's gone, and so is the docs hygiene it was supposed to enforce.

[okforge](https://github.com/jeromeetienne/okforge) takes the opposite bet. Its reminder fires at most once per session, stays silent when you're already doing the right thing, and never blocks anything. It's quiet on purpose — because a tool you don't disable is a tool that keeps working.

> The complete project is open source: [github.com/jeromeetienne/okforge](https://github.com/jeromeetienne/okforge)

![A reminder you never need to mute — okforge](images/03-reminder-fires-once.png)

## What the nudge actually does

When you install okforge into `.claude`, it registers a Stop hook: `npx okforge nudge`. After a coding session, it checks one thing — did you change source that a docs folder is mapped to, but leave that folder untouched?

If yes, it reminds you, gently. If you already edited the docs that session, it says nothing. It reminds you at most once, and it never stops you from finishing what you're doing.

Under the hood it just calls `okforge stale`, which lists folders whose source moved since HEAD while the folder itself stayed put. Same map you configured, same answer the reminder uses. The nudge and the tool can't disagree, because they read the same source of truth.

## Why restraint is the feature

Here's the thing about doc reminders: their value decays the instant they become noise. The first false alarm, the third redundant ping, and you reach for the off switch. Once it's off, your docs drift exactly as far as they would have with no tool at all.

So the engineering wasn't in detecting drift — that's a deterministic check, the easy part. It was in deciding how little to interrupt. Once per session. Silent when you're already handling it. Non-blocking, always. Restraint isn't a missing feature here. It's the whole design.

## Adoption is a retention problem

A dev tool doesn't win at install. It wins at the moment you'd normally uninstall it and don't. Every annoying default is a small push toward that moment.

okforge is built to never give you the push. It earns its keep by staying out of the way until the one time it's actually useful — when you shipped a change and forgot the doc that describes it.

## The turn

I've muted more well-meaning tooling than I've kept. Linters that scream about style I don't care about, bots that comment on every PR, reminders that fire whether or not they're warranted. The pattern is always the same: a tool optimized for catching everything, which trains you to ignore all of it.

The fix isn't smarter detection. It's the discipline to speak rarely, so that when the tool does speak, you listen.

## Takeaway

A reminder you mute is worth nothing. okforge's nudge is designed to never get muted — once per session, silent when you've done the work, never in your way. That restraint is why it's still installed a month later.

Install it and forget it's there until it helps: `npx okforge install .claude`. Next: turning a soft reminder into a hard check your CI can enforce.
