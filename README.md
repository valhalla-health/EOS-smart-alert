# EOS Smart Alert v5

Early-Onset Sepsis monitoring web app for **KCMH NICU** — GA ≥ 34 weeks.

🌐 **Live:** https://valhalla-health.github.io/EOS-Smart-Alert/

---

## Stack

- **Frontend:** React 18 (CDN) + Babel standalone + Vanilla CSS — single HTML file, no bundler
- **Backend:** Google Apps Script (GAS) webhook → Google Sheets
- **Auth:** Google Sign-In (GSI) + server-side JWT verification via GAS
- **Hosting:** GitHub Pages (`docs/index.html`)

## Project Structure

```
EOS-Smart-Alert/
├── docs/index.html       ← GitHub Pages (auto-generated, do not edit)
├── v5/
│   ├── src/              ← Source files (edit here)
│   │   ├── eos-data.jsx  ← Data layer, auth, GAS sync
│   │   ├── eos-auth.jsx  ← Login screen, Google Sign-In
│   │   ├── eos-panels.jsx← All UI panels (66 KB)
│   │   ├── eos-icons.jsx ← Icon components
│   │   └── eos-app.jsx   ← App shell, routing, state
│   ├── eos.css           ← Design system tokens
│   ├── build.py          ← Build script
│   └── dist/             ← GAS-deploy version
├── backend/
│   └── EOS_GAS.gs        ← Google Apps Script backend v3.0
├── archive/              ← V1–V4 history
└── docs/                 ← IRB documents
```

## Development

```bash
# Dev server (open index.html via local server)
cd v5
python -m http.server 8080
# → http://localhost:8080

# Build for GAS deploy
python build.py
# → dist/EOS_Smart_Alert.html

# Build for GitHub Pages
python build.py --pages
# → docs/index.html (at repo root)

# Watch mode
python build.py --watch
```

## GAS Backend Setup

1. Open Google Sheet **"EOS_KCMH_Dashboard"**
2. Extensions → Apps Script → paste `backend/EOS_GAS.gs` → Save
3. Run `setupSheets()` once
4. Run `setupStaffSheet()` once (creates Staff sheet + seeds admin)
5. Deploy → New deployment → Web app
   - Execute as: Me | Who has access: Anyone
6. Copy URL → EOS app Config panel

## Add Staff

Open the GAS-linked Google Sheet → **Staff** tab → add row:

| email | name | role | active |
|-------|------|------|--------|
| nurse@example.com | พ.ยาบาลมาลี | nurse | TRUE |

Roles: `admin` / `doctor` / `nurse`

## Deploy to GitHub Pages

```bash
python v5/build.py --pages     # generates docs/index.html
git add docs/index.html
git commit -m "deploy: update GitHub Pages"
git push
```

GitHub Pages auto-serves from `docs/` on `main` branch.

## IRB

Ethics approval: KCMH IRB — AF-06 forms complete. See `docs/IRB/`.

---

Valhalla Team · KCMH NICU · 2026
