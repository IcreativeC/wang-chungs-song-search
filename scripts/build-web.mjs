// build-web.mjs
// Generate web/index.html: a single self-contained karaoke search page with the
// full catalog embedded (works when double-clicked OR hosted, no server needed).
//
// Run:  node scripts/build-web.mjs   (after export-songlist.mjs)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data", "songlist.json");
// Output to /docs so GitHub Pages can serve it directly (Pages source = main /docs).
const OUT = join(__dirname, "..", "docs", "index.html");

const rows = JSON.parse(readFileSync(DATA, "utf8"));
// Compact form: [number, artist, title] to shrink the embedded payload.
const compact = rows.map((r) => [r.number, r.artist, r.title]);
// Escape "<" so a stray "</script>" inside any title can't break the data block.
const dataJson = JSON.stringify(compact).replace(/</g, "\\u003c");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Wang Chung's — Karaoke Song Search</title>
<style>
  :root {
    --bg: #0a0a0b;
    --panel: #141416;
    --panel-2: #1c1c20;
    --line: #2a2a30;
    --text: #f4f4f5;
    --muted: #8a8a95;
    --gold: #e8b04b;
    --gold-dim: #b98a2f;
    --radius: 12px;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 780px; margin: 0 auto; padding: 28px 18px 80px; }
  header { text-align: center; margin-bottom: 22px; }
  .brand { font-size: 13px; letter-spacing: .22em; text-transform: uppercase; color: var(--gold); font-weight: 700; }
  h1 { font-size: 26px; margin: 6px 0 2px; font-weight: 800; letter-spacing: -.01em; }
  .sub { color: var(--muted); font-size: 13.5px; margin: 0; }
  .searchbar {
    position: sticky; top: 0; z-index: 5;
    background: linear-gradient(var(--bg) 70%, rgba(10,10,11,0));
    padding: 14px 0 12px;
  }
  .field {
    display: flex; align-items: center; gap: 10px;
    background: var(--panel); border: 1px solid var(--line);
    border-radius: var(--radius); padding: 0 14px;
    transition: border-color .15s, box-shadow .15s;
  }
  .field:focus-within { border-color: var(--gold-dim); box-shadow: 0 0 0 3px rgba(232,176,75,.12); }
  .field svg { flex: none; opacity: .55; }
  #q {
    flex: 1; background: transparent; border: 0; outline: 0;
    color: var(--text); font-size: 17px; padding: 15px 0;
  }
  #q::placeholder { color: var(--muted); }
  .clear {
    border: 0; background: var(--panel-2); color: var(--muted);
    width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
    font-size: 16px; line-height: 1; display: none;
  }
  .clear:hover { color: var(--text); }
  .meta { color: var(--muted); font-size: 13px; margin: 4px 2px 12px; min-height: 18px; }
  .meta b { color: var(--gold); font-weight: 700; }
  ul#results { list-style: none; margin: 0; padding: 0; }
  li.row {
    display: grid; grid-template-columns: 64px 1fr; gap: 4px 14px;
    align-items: baseline; padding: 12px 14px; border: 1px solid var(--line);
    border-radius: 10px; margin-bottom: 8px; background: var(--panel);
  }
  li.row .num {
    grid-row: 1 / span 2; align-self: center;
    font-variant-numeric: tabular-nums; font-weight: 700; font-size: 13px;
    color: var(--gold); background: var(--panel-2); border-radius: 8px;
    padding: 8px 6px; text-align: center;
  }
  li.row .artist { font-weight: 700; font-size: 15.5px; }
  li.row .title { color: #cfcfd6; font-size: 14.5px; }
  mark { background: rgba(232,176,75,.28); color: #fff; border-radius: 3px; padding: 0 1px; }
  .empty { text-align: center; color: var(--muted); padding: 46px 20px; }
  .empty .big { font-size: 40px; margin-bottom: 8px; }
  .more { text-align: center; color: var(--muted); font-size: 13px; padding: 14px 0 4px; }
  footer { text-align: center; color: var(--muted); font-size: 12px; margin-top: 34px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="brand">Wang Chung's Karaoke</div>
    <h1>Song Search</h1>
    <p class="sub">Search by artist, song title, or song number</p>
  </header>

  <div class="searchbar">
    <div class="field">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <input id="q" type="search" autocomplete="off" autocapitalize="off" spellcheck="false"
             placeholder="Try &quot;journey&quot;, &quot;sweet caroline&quot;, or a number" />
      <button class="clear" id="clear" aria-label="Clear">×</button>
    </div>
  </div>

  <div class="meta" id="meta"></div>
  <ul id="results"></ul>
  <div class="more" id="more"></div>

  <footer>Prototype · <span id="count"></span> songs · data exported from wangchungs.com</footer>
</div>

<script id="data" type="application/json">${dataJson}</script>
<script>
(function () {
  var DATA = JSON.parse(document.getElementById("data").textContent);
  var LIMIT = 300; // max rows rendered per search (prototype-friendly, stays fast)

  // Pre-lowercase haystacks once for speed. cols: 0=number 1=artist 2=title
  var HAY = DATA.map(function (r) {
    return (r[1] + " " + r[2] + " " + r[0]).toLowerCase();
  });

  var qEl = document.getElementById("q");
  var clearEl = document.getElementById("clear");
  var metaEl = document.getElementById("meta");
  var resEl = document.getElementById("results");
  var moreEl = document.getElementById("more");
  document.getElementById("count").textContent = DATA.length.toLocaleString();

  function score(row, hay, q, tokens) {
    var artist = row[1].toLowerCase(), title = row[2].toLowerCase(), num = row[0].toLowerCase();
    var s = 0;
    if (artist === q || title === q || num === q) s += 1000;
    if (artist.indexOf(q) === 0) s += 400;
    if (title.indexOf(q) === 0) s += 380;
    if (num.indexOf(q) === 0) s += 360;
    if ((" " + artist).indexOf(" " + q) >= 0) s += 120; // word-start in artist
    if ((" " + title).indexOf(" " + q) >= 0) s += 110;  // word-start in title
    // reward tokens hitting word boundaries
    for (var i = 0; i < tokens.length; i++) {
      if ((" " + hay).indexOf(" " + tokens[i]) >= 0) s += 20;
    }
    s -= title.length * 0.02; // gentle tiebreak toward shorter titles
    return s;
  }

  function esc(str) {
    return str.replace(/[&<>]/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
    });
  }
  function highlight(text, tokens) {
    // Case-insensitive highlight via indexOf (no regex, no escaping headaches).
    var lower = text.toLowerCase();
    var ranges = [];
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      if (!tk) continue;
      var from = 0, idx;
      while ((idx = lower.indexOf(tk, from)) !== -1) {
        ranges.push([idx, idx + tk.length]);
        from = idx + tk.length;
      }
    }
    if (!ranges.length) return esc(text);
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [ranges[0].slice()];
    for (var j = 1; j < ranges.length; j++) {
      var last = merged[merged.length - 1];
      if (ranges[j][0] <= last[1]) last[1] = Math.max(last[1], ranges[j][1]);
      else merged.push(ranges[j].slice());
    }
    var out = "", pos = 0;
    for (var m = 0; m < merged.length; m++) {
      out += esc(text.slice(pos, merged[m][0]));
      out += "<mark>" + esc(text.slice(merged[m][0], merged[m][1])) + "</mark>";
      pos = merged[m][1];
    }
    return out + esc(text.slice(pos));
  }

  function render(matches, tokens, total) {
    if (total === 0) {
      resEl.innerHTML = "";
      moreEl.textContent = "";
      metaEl.innerHTML = "";
      resEl.innerHTML =
        '<div class="empty"><div class="big">🎤</div>No songs match that search.<br>Try fewer or different words.</div>';
      return;
    }
    metaEl.innerHTML = "<b>" + total.toLocaleString() + "</b> " + (total === 1 ? "match" : "matches");
    var html = "";
    for (var i = 0; i < matches.length; i++) {
      var r = matches[i];
      html +=
        '<li class="row"><span class="num">' + esc(r[0]) + "</span>" +
        '<span class="artist">' + highlight(r[1], tokens) + "</span>" +
        '<span class="title">' + highlight(r[2], tokens) + "</span></li>";
    }
    resEl.innerHTML = html;
    moreEl.textContent = total > matches.length
      ? "Showing top " + matches.length + " of " + total.toLocaleString() + " — keep typing to narrow it down."
      : "";
  }

  function browse() {
    // Empty state: show a small sample so the page never looks broken.
    metaEl.innerHTML = "<b>" + DATA.length.toLocaleString() + "</b> songs available — start typing to search";
    var html = "";
    for (var i = 0; i < 25; i++) {
      var r = DATA[i];
      html +=
        '<li class="row"><span class="num">' + esc(r[0]) + "</span>" +
        '<span class="artist">' + esc(r[1]) + "</span>" +
        '<span class="title">' + esc(r[2]) + "</span></li>";
    }
    resEl.innerHTML = html;
    moreEl.textContent = "";
  }

  function search() {
    var q = qEl.value.trim().toLowerCase();
    clearEl.style.display = qEl.value ? "block" : "none";
    if (!q) { browse(); return; }
    var tokens = q.split(/\\s+/).filter(Boolean);
    var hits = [];
    for (var i = 0; i < DATA.length; i++) {
      var hay = HAY[i], ok = true;
      for (var t = 0; t < tokens.length; t++) {
        if (hay.indexOf(tokens[t]) === -1) { ok = false; break; }
      }
      if (ok) hits.push(i);
    }
    hits.sort(function (a, b) {
      return score(DATA[b], HAY[b], q, tokens) - score(DATA[a], HAY[a], q, tokens);
    });
    var top = [];
    for (var k = 0; k < hits.length && k < LIMIT; k++) top.push(DATA[hits[k]]);
    render(top, tokens, hits.length);
  }

  var timer = null;
  qEl.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(search, 110);
  });
  clearEl.addEventListener("click", function () {
    qEl.value = ""; qEl.focus(); search();
  });

  browse();
})();
</script>
</body>
</html>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log(`Wrote ${OUT} (${kb} KB, ${rows.length} songs embedded)`);
