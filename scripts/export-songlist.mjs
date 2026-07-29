// export-songlist.mjs
// Pull the full Wang Chung's karaoke catalog from the Wix Data API and write
// data/songlist.json + data/songlist.csv (columns: number, artist, title).
//
// The song data lives in a Wix CMS collection named "SongList". Wix auto-named
// the fields with junk keys, so we rename them here:
//   title       -> number   (the song code, e.g. "98704")
//   tateMcRae1  -> artist    (e.g. "Giveon")
//   greedy      -> title     (the song title, e.g. "Heartbreak Anniversary")
//
// Run:  node scripts/export-songlist.mjs
// Node 24+ (uses global fetch). No dependencies.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SONGS_PAGE = "https://www.wangchungs.com/songs";
const API = "https://www.wangchungs.com/_api/cloud-data/v1/items/query";
const GRID_APP_ID = "5cc4e81d-6fea-46be-b070-2f5663612bc8";
const COLLECTION = "SongList";
const PAGE_SIZE = 1000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");

// The instance token is short-lived, so scrape a fresh one from the live page
// on every run. This keeps the export repeatable.
async function getAuthToken() {
  const res = await fetch(SONGS_PAGE, {
    headers: { "User-Agent": "Mozilla/5.0 (song-export)" },
  });
  if (!res.ok) throw new Error(`Failed to load songs page: HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/"Authorization":"([^"]+)"/);
  if (!m) throw new Error("Could not find Authorization token in page HTML");
  return m[1];
}

async function queryPage(token, offset) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "x-wix-grid-app-id": GRID_APP_ID,
      Referer: SONGS_PAGE,
    },
    body: JSON.stringify({
      collectionName: COLLECTION,
      query: { paging: { limit: PAGE_SIZE, offset } },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Query failed at offset ${offset}: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  console.log("Fetching fresh auth token...");
  const token = await getAuthToken();

  const rows = [];
  let offset = 0;
  let total = null;

  while (true) {
    const data = await queryPage(token, offset);
    if (total === null) {
      total = data.totalCount ?? data.totalResults ?? null;
      console.log(`Collection reports ${total} total records.`);
    }
    const items = data.items ?? [];
    if (items.length === 0) break;

    for (const it of items) {
      rows.push({
        number: String(it.title ?? "").trim(),
        artist: String(it.tateMcRae1 ?? "").trim(),
        title: String(it.greedy ?? "").trim(),
      });
    }
    process.stdout.write(`\rPulled ${rows.length}${total ? ` / ${total}` : ""}...`);
    offset += PAGE_SIZE;
    if (total !== null && rows.length >= total) break;
  }
  process.stdout.write("\n");

  mkdirSync(OUT_DIR, { recursive: true });

  const jsonPath = join(OUT_DIR, "songlist.json");
  writeFileSync(jsonPath, JSON.stringify(rows, null, 0));

  const header = "number,artist,title";
  const csv =
    header +
    "\n" +
    rows.map((r) => `${csvEscape(r.number)},${csvEscape(r.artist)},${csvEscape(r.title)}`).join("\n") +
    "\n";
  const csvPath = join(OUT_DIR, "songlist.csv");
  writeFileSync(csvPath, csv);

  console.log(`\nDone. Wrote ${rows.length} rows.`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  CSV:  ${csvPath}`);
  if (total !== null && rows.length !== total) {
    console.warn(`\n  WARNING: pulled ${rows.length} but collection reports ${total}.`);
  }

  // Spot-check output
  const sample = rows.filter((r) => /wow/i.test(r.title)).slice(0, 3);
  console.log("\nSample matches for 'wow':");
  for (const s of sample) console.log(`  ${s.number} | ${s.artist} | ${s.title}`);
}

main().catch((err) => {
  console.error("\nExport failed:", err.message);
  process.exit(1);
});
