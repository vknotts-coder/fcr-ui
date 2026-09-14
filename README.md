# @fcr/ui

Shared **React UI** for the FCR platform (the `robert83976/fcr-*` app fleet): the Salesforce-style
**list-view grid** and the **report builder**, extracted from `fcr-dispatch` so a new app wires a list or a
report surface in a few lines instead of copy-pasting-and-drifting. Sibling of `@fcr/core` (which stays
**React-free** and holds the headless engine + catalog). Tracked by **robert83976/fcr-dispatch#107** (and the
report-builder half of #99).

## Consume it (public HTTPS tarball, no registry, no token)

This repo is **public**, so apps consume it as a plain **HTTPS tag tarball** — anonymous, no registry, no
token; works on local builds, GitHub Actions CI, and Vercel alike:

```jsonc
// package.json
"dependencies": {
  "@fcr/ui": "https://github.com/vknotts-coder/fcr-ui/archive/refs/tags/v0.1.0.tar.gz"
}
```

Pin a **tag**, never a branch. Bump = a new tag here + bump the URL in each app. (The committed `dist/` is
included in the tag tarball — same recipe as `@fcr/core`; the `github:…#tag` shortcut is avoided because npm
normalizes it to `git+ssh`, which needs a key even for a public repo and breaks remote builders.)

## Peer dependencies

`react` (>=19), `react-dom` (>=19), `next` (>=16), and `@fcr/core` (the engine + report types). The consuming
app already has all four.

## ⚠ Tailwind: the consumer owns the theme

The components use the FCR `fcr-*` Tailwind tokens (`fcr-ink`, `fcr-line`, `fcr-red`, `fcr-steel`,
`fcr-paper`, `fcr-amber`, `fcr-red-dark`) verbatim — `@fcr/ui` ships **no CSS of its own**. A consumer must
add the package's built output to its Tailwind `content` so those classes are generated:

```js
// tailwind config content globs
"./node_modules/@fcr/ui/dist/**/*.js"
```

## Injection seam (the package owns no app policy)

`@fcr/ui` carries no server actions, no locale/currency policy, and no route paths — the consuming app
supplies them:

- **Formatters** (`CellFormatters` from `@fcr/ui/cells`): `{ money, number }`, each `(value) => string`, applied
  to money/number columns. **Optional** — `fmt` defaults to `defaultFormatters` (en-US USD + grouped number,
  the same output as dispatch's `fmtMoney`/`fmtNumber`), so most consumers pass nothing. ⚠ A plain function
  can't cross the RSC boundary as a prop, so a **server** page cannot inject `fmt` into the `'use client'`
  builder/results — override the default only from a client boundary (a `'use client'` wrapper). The default
  covers every FCR app today.
- **Server actions** (`ReportBuilderActions` from `@fcr/ui/reports`): `{ runReport, saveReport, deleteReport }`.
  Each is the app's own Next server action, which **re-gates + re-validates** the definition server-side — the
  builder is a convenience, never the security boundary. A shared package can't own Next server actions, so
  they're injected.
- **CSV export path** (`exportPath`, default `/reports/export`): the app route the builder POSTs a run
  definition to for a CSV download.

## Exports

- `@fcr/ui/cells` — `renderCell(value, col, fmt)`, `cellTd`/`cellTdNum` (shared body-cell classes), and the
  `Formatter` / `CellFormatters` types. Pure; safe in both server and client components.
- `@fcr/ui/listviews` — a convenience barrel re-exporting `ListGrid` + `SortableHeader` (**server** components;
  URL-driven sort, no client JS) and `StatusSelect` (`'use client'` dropdown). The barrel mixes a server and a
  client module, so the client chunk is kept out of a server-only consumer by tree-shaking (backed by
  `"sideEffects": false`), not by the import path itself.
- `@fcr/ui/listviews/grid` / `@fcr/ui/listviews/status-select` — the same components as **direct** subpaths.
  Import the grid from `…/grid` in a server component for a hard guarantee the `'use client'` `StatusSelect`
  module never enters the graph (no reliance on tree-shaking).
- `@fcr/ui/reports` — `ReportBuilder` (`'use client'`; the designer) and `ReportResults` (`'use client'`; its
  results grid, also usable standalone on a saved-report page), plus the `ReportBuilderActions` /
  `ReportBuilderInitial` / `SaveResult` types.

## Develop

```
npm install
npm run build   # tsc → dist/ (committed; the tarball ships dist)
npm test        # vitest
```
