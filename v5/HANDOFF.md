# EOS Smart Alert — Dev Handoff
**Date:** 2026-05-15  **Version:** V5 (React, multi-file)  **Owner:** Pp / Valhalla Team

---

## What This Is
EOS Smart Alert V5 — Early-Onset Sepsis monitoring web app for KCMH NICU.  
Target users: Neonatologist + Nurse. GA ≥ 34 wk. Serial PE × 7 timepoints.  
Backend: Google Apps Script (GAS). Deploy: single HTML file → GAS `doGet()`.

---

## Architecture
```
EOS-Smart-Alert/
├── v5/                 ← ✅ ACTIVE — edit here
│   ├── index.html      ← Dev entry. Loads React CDN + Babel + src/ files.
│   ├── eos.css         ← Design system tokens. 29 KB.
│   ├── build.py        ← python build.py → dist/EOS_Smart_Alert.html
│   ├── dist/
│   │   └── EOS_Smart_Alert.html  ← 143 KB, GAS-ready single file ✅
│   └── src/
│       ├── eos-data.jsx    ← [LOAD 1] Data layer: EOS namespace, localStorage, GAS sync
│       ├── eos-icons.jsx   ← [LOAD 2] Icon component (createElement, no JSX syntax)
│       ├── eos-auth.jsx    ← [LOAD 3] LoginScreen component + Google Sign-In
│       ├── eos-panels.jsx  ← [LOAD 4] ALL panel components (66 KB)
│       └── eos-app.jsx     ← [LOAD 5] App shell + routing + state (must be last)
├── archive/            ← V1–V4 history (read-only)
│   ├── EOS_Monitor.html        ← V1 (corrupted, retired)
│   ├── EOS_Dashboard.html      ← V2 (Staff ID + PIN auth)
│   ├── EOS smart alert/        ← V3 (vanilla JS, Google Sign-In)
│   ├── EOS smart alert V2–V4/  ← V4 React drafts (iterative sessions)
│   └── v4-app/                 ← V4b (incomplete rebuild attempt)
├── backend/
│   └── EOS_GAS.gs      ← GAS webhook handler (doPost)
└── docs/
    └── IRB/            ← Ethics submission forms (AF-06 full set)
```

**Stack:** React 18 (CDN) + Babel standalone (in-browser transpile) + Vanilla CSS.  
**No bundler. No npm. No build tools except build.py.**

---

## Version History
| Ver | Location | Stack | Auth | Status |
|-----|----------|-------|------|--------|
| V1 | archive/EOS_Monitor.html | Vanilla JS | Staff PIN | ❌ Corrupted |
| V2 | archive/EOS_Dashboard.html | Vanilla JS | Staff ID + PIN | ✅ Stable |
| V3 | archive/EOS smart alert/ | Vanilla JS | Google Sign-In | ✅ Stable |
| V4 | archive/EOS smart alert V2–V4/ | React drafts | Google Sign-In | 🗄 Draft |
| **V5** | **v5/** | **React 18 + JSX** | **Google Sign-In** | **🚀 ACTIVE** |

---

## Data Flow
```
localStorage ←→ EOS.getStore/setStore
                        ↓
              React state (patients, vitals)
                        ↓
              GAS Webhook (EOS.syncRow)
                        ↑
              Config panel → setCfg({url})
```

**Store keys:**
| Key | Content |
|-----|---------|
| `eos_patients` | Patient[] from Triage |
| `eos_vitals` | Vitals[] from Serial PE |
| `eos_audit` | Audit log entries |
| `eos_users` | Staff DB overrides |
| `eos_cfg` | `{url: webhookUrl}` |

**Session:** `sessionStorage['eos_sess']` — 8hr expiry, auto-logout.

---

## Auth
- **Google Sign-In (GSI)** — real Client ID: `658466851314-...apps.googleusercontent.com`
- **STAFF_DB** in `src/eos-data.jsx` — add staff emails here, or via Admin > จัดการผู้ใช้
- **Roles:** `doctor` | `nurse` | `admin`  
  - ABX Approval → doctor + admin only  
  - User Management → admin only  
  - Discharge → doctor + admin only

**Current registered staff:** only `praew.tvl@gmail.com` (admin). Add more in `STAFF_DB` or UI.

---

## Panels (all in src/eos-panels.jsx)
| Panel | View key | Notes |
|-------|----------|-------|
| Ward Board | `dashboard` | Kanban 4-col + stat cards + alert ticker |
| Patients | `patients` | Table + search + filter |
| Patient Detail | `patient` | Timeline + SparkTile vitals + EOS risk |
| Triage | `triage` | 3-step chip flowchart → creates patient |
| Serial PE | modal (`peTarget`) | vital-input fields + live flag |
| EOS Calculator | `calc` | SVG gauge + Kaiser-Permanente formula |
| Alerts Log | `alerts` | All abnormal vitals sorted by time |
| Handoff Summary | `handoff` | Per-patient card, last vitals, print button |
| Schedule | `schedule` | Per-patient TP table with target times |
| ABX Approval | `abx` | Doctor/admin only; approve stop/continue |
| All Records | `records` | Triage + Vitals tables + CSV export |
| Audit Log | `audit` | Admin only; auto-refresh 15s |
| Config | `config` | Webhook URL + test + sync all |
| User Management | `users` | Admin only; add/edit/delete staff |

---

## Clinical Logic (src/eos-data.jsx)
- **evalVitals(v)** — returns `[{k, txt, sev:'red'|'amber'}]`  
  Ranges: T 36.5–37.4 (hard: 36–38), P 110–160 (hard: 100–180), R 40–60 (hard: 30–70), SpO2 95–100 (hard: 92–100)
- **calcEOSRisk({ga, romHours, maternalTemp, gbsStatus, iapStatus})** — Kaiser-Permanente formula → risk per 1000 live births
- **tpStatus(patient, vitals)** → `{cat:'overdue'|'soon'|'ok'|'done', label, dueIn, tp}`
- **TIMEPOINTS:** `['1-2 hr','3-4 hr','10 hr','18 hr','22 hr','36 hr','44 hr']`
- **ABX_TPS:** `Set(['36 hr','44 hr'])` — triggers ABX Time-Out banner

---

## State Management (src/eos-app.jsx)
```js
// App() top-level state
const [patients, setPatients] = useState(() => EOS.getStore('eos_patients', []));
const [vitals,   setVitals]   = useState(() => EOS.getStore('eos_vitals', []));

// Auto-persist
useEffect(() => EOS.setStore('eos_patients', patients), [patients]);
useEffect(() => EOS.setStore('eos_vitals',   vitals),   [vitals]);
```

All mutations via callbacks passed as props:
- `handleCreatePatient(p)` — Triage saves here
- `handleSavePE(entry)` — PEForm saves here → calls syncRow('SerialPE') → sets synced:true
- `handleDischarge(hn)` — shows PinModal, sets `archived:true`
- `handleApproveAbx(ts, decision)` — marks `abxApproved:true`

---

## Demo Data
`EOS.seedDemoData()` runs on first load (when `eos_patients` is empty).  
Seeds 3 patients + 8 vitals entries. One patient (68/12047) has abnormal vitals at 18hr → triggers alert ticker + red status.

---

## Build & Deploy
```bash
# Dev: open v5/index.html via local server
cd "EOS-Smart-Alert/v5"
python -m http.server 8080   # then open http://localhost:8080

# Build single file
python build.py

# Watch mode
python build.py --watch   # requires: pip install watchdog

# Output
dist/EOS_Smart_Alert.html  # upload to GAS
```

**GAS deploy:** paste content into `doGet()` returning `HtmlService.createHtmlOutput(html)`.

---

## Known Issues / TODO
- [ ] `src/eos-icons.jsx` uses `React.createElement` (not JSX) — could be refactored if needed.
- [ ] No offline queue — unsynced records need manual "Sync All" in Config.
- [ ] CSS: `--surface-3` referenced in calc gauge but not defined — add `--surface-3: #f0efe8` to eos.css if needed.
- [x] ~~PinModal doesn't close after confirm~~ — fixed 2026-05-15
- [x] ~~handleSavePE never calls syncRow~~ — fixed 2026-05-15

---

## Next Session Priorities
1. **Test in browser** — `cd v5 && python -m http.server 8080`, verify login + demo data
2. **GAS backend** — verify webhook URL, test doPost handler accepts `{sheet, ...row}`
3. **Add staff** — add nurse/doctor emails to STAFF_DB in `src/eos-data.jsx` before go-live
4. **CSS fix** — add `--surface-3: #f0efe8` to eos.css if calc gauge looks broken

---

## Key File Locations
| What | Path |
|------|------|
| Source files | `EOS-Smart-Alert/v5/src/` |
| Deploy file | `EOS-Smart-Alert/v5/dist/EOS_Smart_Alert.html` |
| GAS backend | `EOS-Smart-Alert/backend/EOS_GAS.gs` |
| IRB docs | `EOS-Smart-Alert/docs/IRB/` |
| GAS webhook URL | `https://script.google.com/macros/s/AKfycbytT15UN3J9Orp1gG-2f2IIJNgQxFmXzBTt9kAVwLCjfyzxv7h813jnC71boKVpr7yL/exec` |
