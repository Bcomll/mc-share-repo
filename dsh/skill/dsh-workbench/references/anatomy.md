# Anatomy of a workbench bundle

Every contract below was read from a live DSH 0.2.2 build (`cordis_inspect_query`, client
`Slots.listSubTree`) and confirmed by a page that renders. Treat slot catalogs as version-
dependent: re-inspect before assuming an option exists.

## 1. Package manifest

```json
{
  "name": "my-workbench",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "files": ["index.js", "client.js", "cordis.patch.yml", "locale/*.json", "docs", "icon.svg"],
  "dsh": {
    "engines": { "dsh": ">=0.1.5-rc.1" },
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "immediately": true, "inject": [] }
  }
}
```

- `dsh.client.inject` lists **client module** dependencies, not services; keep `[]`. Service
  injection belongs in the client module's own `inject` array.
- `immediately: true` loads the client half at page boot — required for a permanent entry.
- `files` matters only for packed/published installs; a local directory install links the whole
  checkout, so a file missing from `files` still works locally and breaks after packing.

## 2. Patch

```yaml
- insert:
    - id: my-workbench
      name: 'my-workbench'
      config: {}
```

`id` is the Loader row id (yours, unique); `name` must be the package name the profile can
resolve. A `config:` object is merged over the Host defaults and is where page-affecting options
(section list, state dir) can live when the Host half reads them.

## 3. Host half

```js
export function apply() {}
```

A page-only bundle needs nothing else. Add `export const Config` plus real `apply(ctx, config)`
when the bundle gains options; register every resource through `ctx.effect` / `ctx.on`.

## 4. Client half wrapper

```js
window.__ModuleLoader__.load({
  id: 'my-workbench',            // MUST equal the package name
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const PANEL_ID = 'my-workbench'
    const inject = ['slots', 'layout']

    function apply(ctx) { /* ... */ }

    return { inject, apply, PANEL_ID }
  },
})
```

- React comes from the browser module table; there is no bundler and no relative `require`.
  Everything lives in this one file.
- `slots` registers; `layout` switches panels. If you want to tolerate their absence, read them
  defensively: `ctx.get ? ctx.get('slots') : undefined`.

## 5. The three registrations

```js
// primary entry: sidebar icon, id addresses the main panel
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
  name: 'sidebar.panellist', id: PANEL_ID, order: 35, label: 'My workbench',
}, SidebarIcon))

// the page itself
ctx.slots.inject('main', () => ctx.slots.register({
  name: 'main', key: PANEL_ID,
}, WorkbenchPage))

// secondary entry: survives a sidebar-replacing skin
ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
  name: 'conversation.input.left', id: 'my-workbench-open', order: 35,
}, ComposerEntry))
```

| Slot | Kind / scope | Options | Component receives |
|---|---|---|---|
| `sidebar.panellist` | list, root | `id` (required), `order`, `label` | `{ size, active }` |
| `main` | keyed, root | `key` (required) | no owner props; other keys get no session binding |
| `conversation.input.left` | list, session | `id` (required), `order`, `label` | composer/input hooks as standard props |

`main`'s `conversation` key is reserved for the chat — never reuse it. A fresh key adds a cell;
reusing an occupied key replaces that occupant.

`slots.inject(slot, () => slots.register(options, Component))` keeps the registration tied to
slot availability; do not call `register` directly at module scope.

## 6. Switching panels

```js
function open()  { try { layout.selectPanel(PANEL_ID) } catch {} }
function close() { try { layout.selectPanel(null) } catch {} }
function isOpen() {
  try { return layout.panelInfo.getSnapshot().activePanelId === PANEL_ID } catch { return false }
}
```

Always guard: a missing `layout` must leave the page inert, not throw during `apply`.
`selectPanel(null)` is "show the Conversation" — that is the page's exit.

## 7. Styles

Inject one `<style data-plugin="my-workbench">` in `apply`, remove it in `ctx.effect` teardown.
Theme tokens (light + dark resolved by the host):

| Token | Use |
|---|---|
| `--dsw-alias-bg-base` | page background |
| `--dsw-alias-bg-layer-1` | cards, rows, composer |
| `--dsw-alias-bg-layer-2` | raised/selected surfaces, icon tiles |
| `--dsw-alias-bg-overlay` | popovers |
| `--dsw-alias-border-l1` / `-l2` | subtle / stronger borders |
| `--dsw-alias-label-primary` / `-secondary` | text, muted text |
| `--dsw-alias-brand-primary` | accent, active nav marker |
| `--dsw-alias-state-*` | success / warn / error / idle |
| `--dsw-specific-sidebar-fill` | the left nav rail |

Give each `var(--token, fallback)` a literal fallback so a page rendered before the theme
service is ready still has contrast.

Page sizing follows the shipped pattern: `width:100%; height:100%; min-height:0; overflow:hidden`
on the root, with an internal scroll area (`overflow:auto; min-width:0`) for the content column.

## 8. Verification ladder

| Step | Command | Proves | Does not prove |
|---|---|---|---|
| Install | `plugin_manager` `install_bundle`, target = absolute directory | the bundle resolves, the row is active (`application: "applied"`) | anything about the page |
| Live registration | `cordis_inspect_query` → client `Slots.listSubTree` with `{"root":"sidebar.panellist"}`, then `main`, then `conversation.input.left` | the client module loaded and each occupant is `active: true` | that the component renders |
| Render smoke | `node tools/smoke-client.mjs` | the component tree expands; sections, counts, and texts exist | real React, real CSS, layout |
| Human review | refresh the page, click the entry | contrast, spacing, density, scroll behavior | — |

The smoke script works because the client half only touches `window.__ModuleLoader__` and
`document` at load time: stub both, hand a fake React (`createElement`, `useState`) to the
factory, call `apply` with a fake `ctx` whose `slots.register` records `(options, component)`,
then walk the returned element trees and invoke function components in place.

## 9. Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Icon appears, page is blank | the page component threw; the loader swallows client exceptions | run the smoke test; keep components free of host-only APIs |
| No icon at all | sidebar `id` ≠ `main` key, registration threw, or a skin replaced the sidebar | align the ids; check the composer entry |
| Page renders but does not fill / double scrollbars | parent has no definite height, or the root lacks `height:100%` | mirror the shipped sizing; make one element the scroller |
| Edited `client.js`, page unchanged | page not reloaded | refresh; the client module is re-fetched per load |
| Edited host `index.js`, nothing happens | Node caches ESM by URL | restart DSH |
| Chinese turned into mojibake after an edit | Windows PowerShell 5.1 `Get-Content`/`Set-Content` read UTF-8 as GBK | edit with file tools or Node `fs` only |
| Page works for the author, "missing" for a colleague | skin replaced the sidebar, or the bundle was packed without a `files` entry | secondary entry; check the packed file list |
