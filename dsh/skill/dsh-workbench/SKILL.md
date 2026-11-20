---
name: dsh-workbench
description: Use when someone wants a workbench-style page inside DeepSeek Harness — one panel that gathers several tools (API client, database, JSON, diff, timestamps), an AI chat, quick links, or a todo list — rather than a single decoration or a Host-only tool. Covers the entry/panel/exit anatomy (sidebar.panellist + main + conversation.input.left), placeholder-first delivery, the render smoke test that catches a blank page before the user does, and the edit-refresh iteration loop. Also use when reviewing, copying, or extending an existing DSH workbench bundle.
---

# DSH workbench pages

A **workbench** here means one page in the DSH main panel that gathers several small
surfaces — toolbox, chat, quick links, todo — behind its own navigation, reachable from more
than one entry, with an explicit way back to the conversation.

It is not a decoration (a badge under the composer), not a settings page, and not a Host tool.
Those have their own place; read `dsh-doc` when you need their contracts instead.

## Decide before building

Ask these three questions; each answer changes the shape of the bundle:

1. **One page with sections, or one small surface?** Sections → this skill. One badge, one
   button, one overlay → a decoration is enough; do not build a page for it.
2. **Does the model need to call it?** If the assistant must run the same operation
   ("format this JSON", "run this query"), the logic belongs in the Host half as a tool, and
   the page renders the result. If only a person clicks it, keep it in the browser half.
3. **Where does state live?** In-memory client state dies on refresh. A workbench whose
   sections must survive refresh needs a Host-owned source of truth (a JSON file plus a
   read-only route, or a tool that writes it) — decide this before the first section ships.

## The anatomy

Five parts, all of them small:

| Part | Mechanism | Why it is not optional |
|---|---|---|
| Bundle shell | `package.json` with `dsh.bundle.patch` + `dsh.client`, Host `index.js` exporting a no-op `apply` | a bundle row must resolve; the page lives in the browser half |
| Page | `slots.register({ name: 'main', key: PANEL_ID })` | the reserved `conversation` key is the chat; every other key receives no session binding |
| Primary entry | `slots.register({ name: 'sidebar.panellist', id: PANEL_ID })` | the sidebar addresses the main panel by that same id |
| Secondary entry | `slots.register({ name: 'conversation.input.left', id })` | skins that replace the sidebar drop unknown panellist rows; the composer usually survives |
| Exit | `layout.selectPanel(null)` from the page header | without it the user is trapped in a page whose only door is a browser refresh |

`PANEL_ID` must be the same string in the sidebar `id`, the `main` key, and every
`selectPanel(PANEL_ID)` call. A mismatch gives a dead icon, not an error.

## Build order

1. **Copy the template**, do not author from scratch: `templates/` has a working bundle
   (package.json, patch, no-op Host half, client half, locale, detail doc, icon, smoke script).
   Rename: package name, `client.js` module id, `PANEL_ID`, locale meta.
2. **Ship placeholders first.** Sections, cards, chips, disabled inputs, a footer that says
   what is not implemented. The user asked for a page; a page with honest labels is reviewable
   in minutes, a half-wired feature is not.
3. **Register all three entries in one `apply`**, inside a `try`, so a missing slot in an older
   build degrades to "no page" instead of a broken plugin.
4. **Run the render smoke test** (`node templates/tools/smoke-client.mjs`, adapted to the new
   texts) before touching the browser. Client-half exceptions are swallowed by the page loader;
   without this step a typo is indistinguishable from a rendering bug.
5. **Install from the local directory** with `plugin_manager install_bundle` and require
   `application: applied`. Then confirm the live registrations with `cordis_inspect_query`
   (`Slots.listSubTree`, roots `sidebar.panellist`, `main`, `conversation.input.left`) — an
   occupant that is present with `active: true` is the only proof that the module really loaded.
6. **Ask the person to look.** Registration and a smoke test do not prove layout, contrast, or
   density. Say what to check, and say that the visual layer is unverified.
7. **Iterate by editing the client half**: `client.js` is re-fetched on every page refresh, so
   no restart is needed; `index.js` changes need a restart because Node caches the module by URL.

## Facts that cost time to rediscover

- Register every visible resource inside `apply`; return cleanup through `ctx.effect`, including
  the injected `<style>` element.
- Inherit the theme: use `--dsw-alias-bg-base`, `-bg-layer-1/2`, `-bg-overlay`, `-border-l1/l2`,
  `-label-primary/secondary`, `-brand-primary`, `-state-*`, `-specific-sidebar-fill`. Do not
  hard-code one palette for a page that must live in both light and dark.
- The sidebar icon component receives `{ size, active }`; ignore them and the icon looks broken
  next to shipped ones.
- Do not append a second application or a floating launcher to `document.body` for a page that
  already has entries — two doorways for one room is how panels get orphaned.
- Hard-coded Chinese read from `TEXT`/`SECTIONS` objects is acceptable for a first version, but
  keep every string in one place; the host half already needs `locale/zh.json` + `locale/en.json`
  for its title and description.
- On Windows PowerShell 5.1, `Get-Content`/`Set-Content` mangle UTF-8 source into GBK and break
  quotes. Move text with the file tools or Node's `fs`, never with those cmdlets.

## Read next

| Task | File |
|---|---|
| Exact slot ids, registration options, layout API, CSS tokens, verification commands | `references/anatomy.md` |
| Turning placeholders into real tools: sequencing, state, credentials, Host tools | `references/roadmap.md` |
| A working copyable bundle | `templates/package.json`, `templates/cordis.patch.yml`, `templates/index.js`, `templates/client.js`, `templates/locale/zh.json`, `templates/locale/en.json`, `templates/docs/DETAIL.md`, `templates/icon.svg`, `templates/tools/smoke-client.mjs` |
