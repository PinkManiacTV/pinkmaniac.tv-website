---
name: pmtv-website
description: >-
  Guides changes to the PinkManiacTV static website and PM APP tools. Use when
  editing HTML, CSS, or vanilla JS in this repo, adding pages, or working on
  meander, proli, or site-wide styling.
---

# PMTV Website

## Project layout

| Path | Purpose |
|------|---------|
| `index.html`, `*.html` (root) | Marketing / hub pages (racing, music, leagues, etc.) |
| `style.css` | Shared site styles (header, typography, brand colors) |
| `app/` | PM APP section — interactive tools |
| `app/meander-v2/` | River meander simulator (canvas + `MeanderEngine`) |
| `app/meander/` | Legacy meander app |
| `app/proli/` | Prompt library tool |

No build step — static files served as-is. Keep changes minimal and self-contained.

## Brand & UI conventions

- **Primary accent:** `#ff2961` (pink)
- **Background:** `#000000`, text `#ffffff`
- **Fonts:** `Poppins` (body), `Chakra Petch` (headings)
- **Header:** fixed 80px bar, `border-bottom: 2px solid #ff2961`
- **Language:** Dutch (`lang="nl"`) on public pages

Match existing class naming (`meander-v2-*`, `app-page`, BEM-ish modifiers like `--primary`).

## App pages pattern

Apps under `app/` follow this structure:

1. Link shared `../../style.css` plus a local `*.css`
2. Use `body class="app-page …"` and `header class="header header--app"`
3. Nav links: PMTV HOME → `https://pinkmaniac.tv/`, PM APP HOME → `https://pinkmaniac.tv/app`
4. Vanilla JS in IIFE: `(function () { 'use strict'; … })();`
5. No frameworks — canvas apps use plain `requestAnimationFrame`

## Meander V2 specifics

- **Engine:** `meander-engine.js` — simulation logic
- **UI/render:** `meander-v2.js` — canvas drawing, controls, sinuosity chart
- **Reference:** `ref/meanderpy/` — upstream Python reference (read-only, do not modify unless asked)

When changing simulation behavior, edit `meander-engine.js`. When changing visuals or controls, edit `meander-v2.js` / `meander-v2.css`.

## Checklist before finishing

- [ ] Styles reuse existing tokens; no new color/font unless requested
- [ ] New pages include favicon, OG meta, and header nav consistent with siblings
- [ ] JS changes stay in strict-mode IIFEs with no global leaks
- [ ] Relative asset paths work from the page's directory depth
