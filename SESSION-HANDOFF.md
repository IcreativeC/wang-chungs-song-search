# Session Handoff — Wang Chung's Karaoke Song Search

**Date:** 2026-07-28  **Built on:** personal box (pc / `GoodEnough`)  **Continue on:** BC (business box)
**Goal:** Diagnose why the client's karaoke search is clunky, then build a low-cost **prototype** of a
better search — data stored in a Google Sheet, with a fast search bar for the operator + client to test.

## Live links
- **Prototype (GitHub Pages):** https://icreativec.github.io/wang-chungs-song-search/
- **Repo:** https://github.com/IcreativeC/wang-chungs-song-search  *(public — free Pages requires it)*
- Pages source: `main` branch, `/docs` folder.

This GitHub repo **is the transport to BC** — on the business box, just:
```
gh repo clone IcreativeC/wang-chungs-song-search
```
(Or clone into `Documents\projects\` to keep it in the workspace. Note: this project is **not** part of
the synced brain, so git is how it moves between boxes.)

## What was done
1. **Diagnosed the data source.** The client's site is **Wix**; songs live in a Wix CMS collection
   `SongList`, shown by a stock Wix repeater (substring-only, no ranking, 20/page → that's the clunk).
2. **Exported the whole catalog** — **47,529 songs** — from Wix's Data API into clean `data/songlist.json`
   and `data/songlist.csv` (columns `number, artist, title`).
3. **Built the search prototype** — `docs/index.html`, a single self-contained file (all songs embedded,
   no server/internet needed). Multi-field ranked search + highlighting. Tested and working.
4. **Published it** to GitHub Pages (link above).

## Key technical facts (for re-pulling / rebuilding)
- Query endpoint: `POST https://www.wangchungs.com/_api/cloud-data/v1/items/query`
- Headers: `Authorization` (short-lived instance token — the export script scrapes a fresh one from the
  songs page HTML each run) + `x-wix-grid-app-id: 5cc4e81d-6fea-46be-b070-2f5663612bc8`
- Paging: offset paging, page size up to 1000. metaSiteId `aaad2e7b-ce4c-46ef-8fd2-609d4befff7b`.
- **Wix junk field keys → renamed:** `title`→`number`, `tateMcRae1`→`artist`, `greedy`→`title`.
- Rebuild: `node scripts/export-songlist.mjs` then `node scripts/build-web.mjs` (Node 24+, no deps).
  After a rebuild: `git add -A && git commit && git push` → Pages redeploys automatically.

## File inventory
- `scripts/export-songlist.mjs` — Wix Data API → `data/songlist.{json,csv}`
- `scripts/build-web.mjs` — embed catalog → `docs/index.html`
- `data/songlist.json` (~3.2 MB), `data/songlist.csv` (~1.6 MB)
- `docs/index.html` (~2 MB) — the search page + Pages web root
- `CLAUDE.md` — full project reference (read first on BC)
- `website-html-song-search.txt` — original page-element dump the client provided

## Open items / next steps (for BC)
1. **Google Sheet as the store.** Not created yet — the Sheets **service-account creds are not on the
   personal box** (`GOOGLE_SHEETS_CLIENT_EMAIL` / `GOOGLE_SHEETS_PRIVATE_KEY` are documented in
   `_global\env-vars.md` but live in Trigger.dev's cloud env). **BC may have them** — if so, a small
   `scripts/push-to-sheet.mjs` (googleapis/gspread) can auto-create + populate the sheet. Otherwise:
   New Sheet → File → Import → `data/songlist.csv`. Then a `Search` tab with (search word in B1, formula
   in A3):
   ```
   =FILTER(Songs!A:C,
     (ISNUMBER(SEARCH($B$1,Songs!B:B))+ISNUMBER(SEARCH($B$1,Songs!C:C))+ISNUMBER(SEARCH($B$1,Songs!A:A)))>0)
   ```
2. **Live-from-Sheet option (decision pending).** Should the page read live from the published Google
   Sheet CSV (client edits flow through) instead of the baked-in snapshot? Prototype currently uses the
   baked snapshot (zero-config). Wiring it to a published-sheet CSV is a small change to `build-web.mjs`.
3. **Data hygiene noticed:** artist names are inconsistently ordered (`NEIL DIAMOND` vs `DIAMOND NEIL`),
   casing varies, and there are ~27 duplicate song numbers. Worth a normalization pass before any real
   rebuild — but fine for the prototype.
4. **Eventual rebuild** (deferred by client for now): replace the Wix repeater with this search embedded
   in the Wix page (iframe/HTML element) or a Velo build. Keep the Sheet (or the Wix collection) as the
   source of truth.

## Notes / caveats
- The catalog is already public on the client's live site, so hosting a copy publicly is not a new
  exposure. Still, the repo is under **IcreativeC** — rename / make private / transfer to the client
  later as desired.
- Commits use the GitHub noreply email (account has email-privacy on).
