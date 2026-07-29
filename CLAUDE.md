# Project: wang-chungs

## Purpose
Client work for **Wang Chung's Karaoke Bar** (Honolulu, `wangchungs.com`). Their existing karaoke
song-search page is hard to use. This project is a **prototype** of a better search experience,
plus a clean export of their song catalog. It is **not** (yet) a full rebuild of their site.

Status: **prototype built & verified** (2026-07-28).

## Where the data comes from (investigation result)
Their site is **Wix**. The songs live in a Wix CMS collection named **`SongList`**, shown by a
stock Wix **Repeater bound to a dataset** — no custom code, substring-only match, 20 results per
page. That stock setup is why it feels clunky.

The full catalog is pullable from Wix's own Data API:

| Detail | Value |
|---|---|
| Collection | `SongList` |
| Total records | **47,529** (as of 2026-07-28) |
| Query endpoint | `POST https://www.wangchungs.com/_api/cloud-data/v1/items/query` |
| Headers | `Authorization` (instance token, scraped from the songs page HTML) + `x-wix-grid-app-id: 5cc4e81d-6fea-46be-b070-2f5663612bc8` |
| Paging | offset paging works to full depth; page size up to 1000 |
| metaSiteId | `aaad2e7b-ce4c-46ef-8fd2-609d4befff7b` |

**Field mapping** — Wix auto-generated junk field keys; the export renames them:

| Meaning | Wix key | Export column |
|---|---|---|
| Song number/code | `title` | `number` |
| Artist | `tateMcRae1` | `artist` |
| Song title | `greedy` | `title` |

(System fields `_id`, `_owner`, `_createdDate`, `_updatedDate`, `link-song-list-all` are dropped.)

## Layout
```
wang-chungs\
├── scripts\
│   ├── export-songlist.mjs   ← pull full catalog from Wix Data API -> data\songlist.{json,csv}
│   └── build-web.mjs         ← embed catalog into web\index.html (single self-contained file)
├── data\
│   ├── songlist.json         ← 47,529 rows [{number, artist, title}]  (~3.2 MB)
│   └── songlist.csv          ← same, for Google Sheets import          (~1.6 MB)
└── docs\
    └── index.html            ← the prototype search page (data embedded; ~2 MB, no server needed)
                                 also the GitHub Pages web root (Pages source = main /docs)
```

## Rebuild / refresh (Node 24+, no dependencies)
```
node scripts/export-songlist.mjs   # re-pull the live catalog (fresh token scraped automatically)
node scripts/build-web.mjs         # regenerate docs/index.html from the new data
```

## The prototype search page (`docs/index.html`)
Single self-contained file — **double-click to open**, no server or internet needed. Searches all
47,529 songs by **artist + title + number** at once, with token-AND matching, relevance ranking
(exact > starts-with > contains), keyword highlighting, and a top-300 cap on huge queries. Verified
2026-07-28: `journey`, `sweet caroline`, number `98704`, `bow wow`, and no-match all behave.

**Live link:** hosted free on **GitHub Pages** from this project's own GitHub repo (Pages source =
`main` / `docs`). See `SESSION-HANDOFF.md` for the repo + Pages URLs.

## Google Sheet (the "store")
Service-account creds for automated push are **not on this box** (`GOOGLE_SHEETS_PRIVATE_KEY` is
documented in `_global\env-vars.md` but lives in Trigger.dev's cloud env, not local `.env`). So the
sheet is created by a one-time CSV import, which also keeps it owned by the client's own Google
account:

1. New Google Sheet → **File → Import → Upload** `data/songlist.csv` → *Replace current sheet*.
   Rename tab to **`Songs`**. Columns: A `number`, B `artist`, C `title`.
2. Add a **`Search`** tab. Put the search word in **B1**, and in **A3**:
   ```
   =FILTER(Songs!A:C,
     (ISNUMBER(SEARCH($B$1, Songs!B:B)) + ISNUMBER(SEARCH($B$1, Songs!C:C)) + ISNUMBER(SEARCH($B$1, Songs!A:A))) > 0)
   ```
   `SEARCH` is case-insensitive substring; the `+` gives an OR across artist/title/number.
   (Works, but recalculating over 47k rows per keystroke is sluggish — the HTML page is the
   snappier experience. This satisfies the "can we search in the sheet" question.)

## Notes
- This project is **local to this machine** — it is not in the synced brain set (see root
  `.gitignore`). If it needs to reach the other box, arrange transport deliberately.
- `planning\evidence`-style sensitivity does not apply here; the catalog is already public on the
  client's live site.

## Global context
See `..\..\CLAUDE.md` (loaded automatically) and `..\..\_global\` for workspace-wide conventions.
