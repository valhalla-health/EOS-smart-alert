## EOS Smart Alert V5 — Project Context

**Status:** PRODUCTION · GitHub Pages live · IRB submitted
**Stack:** React 18 CDN + Babel standalone, GAS webhook, GitHub Pages (docs/) — no bundler
**Repo:** https://github.com/valhalla-health/EOS-Smart-Alert
**Live:** https://valhalla-health.github.io/EOS-Smart-Alert/

### Source of truth
```
v5/src/           ← EDIT HERE ONLY
  eos-data.jsx    [LOAD 1] data layer, GAS sync, calcEOSRisk (KP 2024), localStorage
  eos-icons.jsx   [LOAD 2] icon components
  eos-auth.jsx    [LOAD 3] login screen + Google GSI
  eos-panels.jsx  [LOAD 4] all UI panels (66 KB — biggest file)
  eos-app.jsx     [LOAD 5] app shell, routing, state (must load last)
v5/eos.css        ← design system tokens
v5/build.py       ← python v5/build.py --pages → docs/index.html
docs/index.html   ← GitHub Pages deploy target (auto-built, do not hand-edit)
backend/EOS_GAS.gs← GAS backend (doPost handler)
```

### GAS Webhook
`https://script.google.com/macros/s/AKfycbymZoPlUF1NCot_OMsm3oEzzVxq7Un5VjpVrTE2xQLLadQzvYzkq5H7NinD8UipPouF/exec`

GCP Client ID (shared): `658466851314-fq13cdqd608e4lp8tbv3n4me443b2fb0.apps.googleusercontent.com`

### Deploy command
```bash
python v5/build.py --pages
git add docs/index.html v5/src/
git commit -m "deploy: <description>"
git push
```

### Watch-outs
- Load order matters — eos-app.jsx must be last in index.html script tags
- STAFF_DB in eos-data.jsx — add staff emails here or via Admin UI
- ABX Approval: doctor + admin only; User Management: admin only
- Session: `sessionStorage['eos_sess']` 8hr expiry
- IRB docs in `docs/IRB/` — gitignored

### Known roadmap (not yet built)
- Override documentation (reason for ignoring alert)
- Quality metrics dashboard (ABX days saved, adherence rate)
- Real-time vitals from bedside monitors (Phase 3)
