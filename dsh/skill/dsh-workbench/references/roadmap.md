# From placeholders to real tools

The placeholder page is the cheap part. This is the order that keeps risk proportional to value,
each stage adding exactly one new kind of dependency.

## Stage 1 — pure, local, deterministic

Timestamp conversion, JSON format/validate, text diff, Base64/URL codec, hash, regex tester, JWT
decode. No network, no credentials, no persistence: the whole thing lives in `client.js`.

- Keep the pure functions at the top of the client file and expose them for tests through an
  extra key on the returned object — the loader only reads `inject` / `apply`, so
  `return { inject, apply, PANEL_ID, __pure: { parseTimestamp, diffLines } }` is legal.
- Then unit-test them from the smoke harness (`node --test` or plain assertions) without a browser.
  This is the only way to keep math and encoding honest, because the page cannot show you a wrong
  answer that looks right.
- A tool that only reformats text should never call the Host. A round trip to the Host adds latency
  and a failure mode for zero benefit.

## Stage 2 — needs persistence

An API client with collections, and a todo list that survives refresh, both need storage. Pick one:

| Option | Good for | Cost |
|---|---|---|
| Client memory | throwaway scratch work | lost on refresh; simplest |
| `localStorage` | per-browser preferences, panel layout | invisible to the model, invisible to another machine |
| Host file + read-only route + write tool | anything the assistant should also see or change | needs a Host half: file location, atomic writes, a route, and handling two windows at once |

Whatever you pick, keep **one source of truth**. The failure mode is two writers (page and tool)
with different ideas of the current state; the page then shows stale data and every bug report
becomes unreproducible. Model it as: the Host owns the file, the route serves a revision number,
the page polls the revision and re-reads on change, and any mutation goes through one entry point.

Also decide, before shipping, what a verification run may touch. A workbench that overwrites the
user's current view when a tool runs will be blamed for "losing my work" — either give the tools a
scratch namespace or make the page open on demand instead of auto-switching.

## Stage 3 — credentials

The API client and the database connection both need secrets.

- Never write tokens or passwords into the plugin directory, the workspace, or the page bundle.
- Use DSH's configuration/credential surface for the plugin, and read the value in the Host half
  only; the browser should receive results, never the secret.
- Write down in the bundle's detail page where the secret is stored and how to clear it. A
  workbench that holds a database password is a security surface, and "I forgot where it went"
  is the failure that costs the most.

## Stage 4 — the heavy ones

**Database (DBX).** Driver + connection lifecycle belong in the Host. Ship read-only first:
statement allowlist (`select`/`with`/`explain` only), a row cap, and a timeout. A write path is a
separate decision with its own confirmation.

**API client.** Requests can be made from the browser (CORS-dependent) or proxied by the Host
(no CORS, but the Host now has SSRF reach). State which one you chose in the detail page; the
security review differs completely.

**AI chat.** Before building a chat surface, ask whether the real conversation already suffices —
a second chat that cannot see the session is usually worse than a deep link back to it. If a
dedicated assistant is genuinely wanted, it needs a model route and streaming, and its value comes
from **tools**: register the same capabilities as Host tools (`ctx.tools.register`) so the page and
the assistant act on one implementation. Build the tool first, the chat bubble second.

## Testing strategy per stage

| Stage | What to test | How |
|---|---|---|
| pure functions | exact values, boundaries, encoding | node assertions against `__pure` |
| components | tree expands, labels and counts present | `tools/smoke-client.mjs` |
| routes | status, shape, revision bump | `fetch` against the running Host |
| layout | contrast, density, scroll, light/dark | a person, with a written checklist |

## Delivery statement

Say which layer you verified, in the same words every time:

- **registered** — install applied and the slot occupants are live (machine-checked)
- **renders** — smoke test passed (component tree, not pixels)
- **needs your eyes** — visual layer, listed as an explicit checklist

Writing the first two as if they were the third is the one mistake that makes a workbench
untrustworthy; a page nobody checked looks finished right up until someone clicks it.
