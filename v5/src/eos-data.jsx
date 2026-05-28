// EOS Smart Alert — Data layer (v8 Sentinel merge)
// SRP: localStorage, GAS sync, EOS utilities + v8 additions. No React/JSX here.
// Exposes: window.EOS + convenience aliases for panels

const EOS = window.EOS = (() => {

  // ── CONSTANTS ──────────────────────────────────────────
  const TIMEPOINTS = ['1-2 hr','3-4 hr','10 hr','18 hr','22 hr','36 hr','44 hr'];
  const OFFSETS    = {'1-2 hr':1.5,'3-4 hr':3.5,'10 hr':10,'18 hr':18,'22 hr':22,'36 hr':36,'44 hr':44};
  const ABX_TPS    = new Set(['36 hr','44 hr']);
  const SESSION_HR = 8;
  const DEFAULT_WEBHOOK = 'https://script.google.com/macros/s/AKfycbymZoPlUF1NCot_OMsm3oEzzVxq7Un5VjpVrTE2xQLLadQzvYzkq5H7NinD8UipPouF/exec';

  const RANGES = {
    T:    {lo:36.5,hi:37.4,hardLo:36.0,hardHi:38.0,unit:'°C',   label:'อุณหภูมิ',  en:'Temp'},
    P:    {lo:110, hi:160, hardLo:100, hardHi:180, unit:'bpm',  label:'ชีพจร',     en:'HR'},
    R:    {lo:40,  hi:60,  hardLo:30,  hardHi:70,  unit:'/min', label:'การหายใจ',  en:'RR'},
    SpO2: {lo:95,  hi:100, hardLo:92,  hardHi:100, unit:'%',    label:'ออกซิเจน',  en:'SpO₂'},
  };
  const SKIN_OPTS = ['Rosy','Pale','Marbled','Cyanotic'];
  const RD_OPTS   = ['tachypnea','nasal flaring','retractions','grunting'];

  // ── AUTH / ROLE ─────────────────────────────────────────
  const AUTH = {
    GOOGLE_CLIENT_ID: '658466851314-1a9ub51gpilmg32abobrtqp7772s8dbu.apps.googleusercontent.com',
    ALLOW_DEMO_MODE: false,
  };

  const STAFF_DB = {};

  const ROLE_CFG = {
    doctor: {label:'แพทย์',    icon:'👨‍⚕️',bg:'#eff6ff',color:'#1e40af',canApproveAbx:true, canDischarge:true, canConfig:false,canManageUsers:false},
    nurse:  {label:'พยาบาล',  icon:'👩‍⚕️',bg:'#f0fdf4',color:'#166534',canApproveAbx:false,canDischarge:false,canConfig:false,canManageUsers:false},
    admin:  {label:'ผู้ดูแลระบบ',icon:'🛡️', bg:'#fdf4ff',color:'#7e22ce',canApproveAbx:true, canDischarge:true, canConfig:true, canManageUsers:true},
  };

  // ── STORE KEYS ──────────────────────────────────────────
  const STORE = {
    patients:'eos_patients',
    vitals:  'eos_vitals',
    audit:   'eos_audit',
    users:   'eos_users',
    cfg:     'eos_cfg',
  };

  // ── STORAGE ─────────────────────────────────────────────
  const sj = (s, def) => { try { const v=JSON.parse(s); return v??def; } catch { return def; } };
  const getStore = (k, def=[]) => sj(localStorage.getItem(k), def);
  const setStore = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ── SESSION (sessionStorage, 8 hr) ──────────────────────
  const getSession = () => {
    const s = sj(sessionStorage.getItem('eos_sess'), null);
    if (!s) return null;
    if ((Date.now()-new Date(s.loginAt))/3600000 > SESSION_HR) {
      sessionStorage.removeItem('eos_sess'); return null;
    }
    return s;
  };
  const setSession   = s => sessionStorage.setItem('eos_sess', JSON.stringify(s));
  const clearSession = () => sessionStorage.removeItem('eos_sess');

  // ── USER MANAGEMENT ─────────────────────────────────────
  const getUsers = () => {
    const ov = sj(localStorage.getItem(STORE.users), null);
    return (ov && typeof ov === 'object') ? ov : STAFF_DB;
  };
  const saveUsers = db => setStore(STORE.users, db);
  const findStaffByEmail = email => {
    if (!email) return null;
    const key = String(email).trim().toLowerCase();
    const db  = getUsers();
    for (const k in db) if (k.toLowerCase()===key) return {email:k, ...db[k]};
    return null;
  };

  // ── AUDIT LOG ───────────────────────────────────────────
  const auditLog = (action, detail='') => {
    const s     = getSession();
    const entry = { ts:new Date().toISOString(), staff:s?.name||'?', role:s?.role||'?', action, detail };
    const arr = getStore(STORE.audit);
    arr.push(entry);
    if (arr.length > 1000) arr.splice(0, arr.length-1000);
    setStore(STORE.audit, arr);
    const url = getCfg?.() ? (getCfg().url || DEFAULT_WEBHOOK) : DEFAULT_WEBHOOK;
    const token = s?.token || null;
    if (token) {
      fetch(url, {
        method:'POST', headers:{'Content-Type':'text/plain'},
        body: JSON.stringify({sheet:'AuditLog', ...entry, token}),
      }).catch(()=>{});
    }
  };

  // ── CONFIG & SYNC ────────────────────────────────────────
  const getCfg = () => sj(localStorage.getItem(STORE.cfg), {});
  const setCfg = c => setStore(STORE.cfg, {...getCfg(), ...c});

  const fetchT = (url, opts={}, ms=10000) => {
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), ms);
    return fetch(url, {...opts, signal:ctrl.signal}).finally(()=>clearTimeout(t));
  };
  const getToken = () => getSession()?.token || null;

  const syncRow = async (sheet, row) => {
    const url   = getCfg().url || DEFAULT_WEBHOOK;
    const token = getToken();
    try {
      const r = await fetchT(url, {
        method:'POST', headers:{'Content-Type':'text/plain'},
        body:JSON.stringify({sheet, ...row, token}),
      }, 8000);
      return r.ok;
    } catch { return false; }
  };

  const loginGAS = async token => {
    const url = getCfg().url || DEFAULT_WEBHOOK;
    try {
      const r = await fetchT(url, {
        method:'POST', headers:{'Content-Type':'text/plain'},
        body:JSON.stringify({action:'login', token}),
      }, 10000);
      if (!r.ok) return { status:'network_error', code:r.status };
      const data = await r.json();
      return data;
    } catch (e) {
      return { status:'error', message: e?.message||'unknown' };
    }
  };

  const loadFromGAS = async (tokenOverride) => {
    const url = getCfg().url || DEFAULT_WEBHOOK;
    const tok = tokenOverride || getToken();
    if (!tok) return { ok: false };
    try {
      const r = await fetchT(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'load', token: tok }),
      }, 20000);
      if (!r.ok) return { ok: false };
      const data = await r.json();
      if (data.status !== 'ok') return { ok: false };

      const patients = (data.triage || []).map(p => ({
        ...p,
        ga:        p.ga   != null ? Number(p.ga)   : 39,
        bw:        p.bw   != null ? Number(p.bw)   : 3000,
        archived:  p.archived  === true || String(p.archived).toUpperCase()  === 'TRUE',
        isSerialPE:p.isSerialPE=== true || String(p.isSerialPE).toUpperCase()=== 'TRUE',
        // v8: ensure birthAt field
        birthAt: p.birthAt || p.dob || null,
        intake: {
          chorio:       p.chorio        ?? false,
          maternalFever:p.maternalFever ?? 'no',
          fever:        p.fever  != null ? Number(p.fever) : null,
          gbs:          p.gbs   ?? 'unk',
          rom:          p.rom   != null ? Number(p.rom)   : 0,
          iap:          p.iap   ?? 'none',
        },
        synced: true,
      }));

      const vitals = (data.serialPE || []).map(v => ({
        ...v,
        T:    v.T    != null ? Number(v.T)    : null,
        P:    v.P    != null ? Number(v.P)    : null,
        R:    v.R    != null ? Number(v.R)    : null,
        SpO2: v.SpO2 != null ? Number(v.SpO2) : null,
        rd:   v.rd   ? String(v.rd).split('|').filter(Boolean) : [],
        abxApproved: v.abxApproved === true || String(v.abxApproved).toUpperCase() === 'TRUE',
        synced: true,
      }));

      return { ok: true, patients, vitals };
    } catch (e) {
      console.error('loadFromGAS:', e.message);
      return { ok: false };
    }
  };

  // ── UTILS ────────────────────────────────────────────────
  const nowISO = () => new Date().toISOString();
  const hoursSince = iso => (Date.now() - new Date(iso).getTime()) / 3600000;
  const maskHn = hn => hn ? String(hn).replace(/(\d{2}\/\d{2})\d+/,'$1****') : '?';
  const esc    = s  => String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');

  const fmtTime = iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  };
  const fmtDateTime = iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('th-TH',{day:'2-digit',month:'short'})+' '+fmtTime(iso);
  };
  const fmtRelative = iso => {
    if (!iso) return '—';
    const diff = (Date.now()-new Date(iso))/3600000;
    if (diff < 1/60) return 'เมื่อกี้';
    if (diff < 1)    return Math.round(diff*60)+' นาทีที่แล้ว';
    if (diff < 24)   return (Math.round(diff*10)/10)+' hr ที่แล้ว';
    return Math.round(diff/24)+' วันที่แล้ว';
  };
  const fmtDate = iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
  };

  // ── v8 AGE FORMAT UTILS ──────────────────────────────────
  const fmtAge = hr => {
    if (hr == null) return '—';
    if (hr < 1) return Math.round(hr * 60) + ' m';
    if (hr < 24) {
      const half = Math.round(hr * 2) / 2;
      const s = half % 1 === 0 ? String(half) : half.toFixed(1);
      return s + ' hr';
    }
    const d = Math.floor(hr / 24);
    const h = Math.floor(hr % 24);
    return h === 0 ? d + ' d' : d + ' d ' + h + ' h';
  };
  const fmtAgeShort = hr => {
    if (hr == null) return '—';
    if (hr < 24) {
      const half = Math.round(hr * 2) / 2;
      const s = half % 1 === 0 ? String(half) : half.toFixed(1);
      return s + ' hr';
    }
    return (hr / 24).toFixed(1) + ' d';
  };
  const fmtAgeParts = hr => {
    if (hr == null) return { n: '—', unit: '' };
    if (hr < 1) return { n: String(Math.round(hr * 60)), unit: 'm' };
    if (hr < 24) {
      const half = Math.round(hr * 2) / 2;
      const s = half % 1 === 0 ? String(half) : half.toFixed(1);
      return { n: s, unit: 'hr' };
    }
    const d = Math.floor(hr / 24);
    const h = Math.floor(hr % 24);
    return { n: String(d), unit: h === 0 ? 'd' : `d ${h} h` };
  };
  const fmtGA = (weeks, days) => {
    if (weeks == null) return '—';
    const w = Math.floor(weeks);
    const d = days ?? Math.round((weeks - w) * 7);
    return d > 0 ? `${w}+${d} wk` : `${w} wk`;
  };

  // ── PDPA: initials display ──────────────────────
  const THAI_CONSONANT_STRICT = /[ก-ฮ]/;
  const firstLetter = (word) => {
    if (!word) return '';
    for (const ch of word) {
      if (THAI_CONSONANT_STRICT.test(ch)) return ch;
      if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
    }
    for (const ch of word) {
      if (!/\s/.test(ch)) return ch;
    }
    return '';
  };
  const initials = (fullName, fallback = '?') => {
    if (!fullName) return fallback;
    const skip = new Set(['baby', 'ของ', 'นาง', 'นาย', 'น.ส.', 'นางสาว', 'ด.ช.', 'ด.ญ.', 'mr', 'mrs', 'ms', 'dr']);
    const parts = String(fullName).trim().split(/\s+/).filter(p => !skip.has(p.toLowerCase()));
    if (parts.length === 0) return fallback;
    const letters = parts.slice(0, 3).map(firstLetter).filter(Boolean).join('');
    return letters || fallback;
  };
  const displayName = (patient) => {
    if (!patient) return '—';
    return initials(patient.name || patient.motherName || patient.hn, patient.bed || '?');
  };
  const floorLabel = (floor) => {
    if (!floor) return '';
    return String(floor).match(/^\d/) ? `ชั้น ${floor}` : String(floor);
  };

  // ── BABY AGE ─────────────────────────────────────────────
  // v8: use birthAt || dob (v5 compat)
  const ageHours = p => hoursSince(p.birthAt || p.dob || p.createdAt);

  // ── VITALS HELPERS ────────────────────────────────────────
  const vitalsFor = (hn, store) => (store||getStore(STORE.vitals)).filter(v=>v.hn===hn).sort((a,b)=>new Date(a.ts)-new Date(b.ts));
  const doneTPs   = (hn, store) => new Set(vitalsFor(hn, store).map(v=>v.ageHr));
  const nextTP    = (hn, store) => { const done=doneTPs(hn,store); return TIMEPOINTS.find(tp=>!done.has(tp))||null; };
  const tpDueAt   = (p, tp)    => new Date(new Date(p.birthAt || p.dob).getTime()+OFFSETS[tp]*3600000);

  // ── VITAL EVALUATION ─────────────────────────────────────
  // v8 format: {k, val, sev, critical}
  const evalVitals = v => {
    const issues = [];
    if (!v) return issues;
    if (v.wellbeing === 'no') issues.push({ k:'Wellbeing', val:'ผิดปกติ', sev:'red', critical:true });
    if (v.skin && v.skin !== 'Rosy') {
      const critical = v.skin === 'Cyanotic';
      issues.push({ k:'skin', val:v.skin, sev:'red', critical });
    }
    [['T',v.T],['P',v.P],['R',v.R],['SpO2',v.SpO2]].forEach(([k,val]) => {
      if (val == null) return;
      const r = RANGES[k]; if (!r) return;
      const n = +val;
      const critical = n < r.hardLo || n > r.hardHi;
      if (n < r.lo || n > r.hi) {
        issues.push({ k, val:n, txt:n+r.unit, sev:'red', critical });
      }
    });
    if (v.rd && v.rd.length) {
      const critical = v.rd.length > 1;
      issues.push({ k:'rd', val:v.rd.join(', '), txt:v.rd.join(', '), sev:'red', critical });
    }
    return issues;
  };

  const vitalFlag = (key, value) => {
    if (value==null||value==='') return null;
    const r=RANGES[key]; if(!r) return null;
    const v=+value;
    if (v<r.hardLo||v>r.hardHi) return 'red';
    if (v<r.lo||v>r.hi)         return 'amber';
    return null;
  };

  // ── TREND DETECTION ──────────────────────────────────────
  // v8: simpler 3-reading pattern for Sentinel
  const evalTrend = (hn, store) => {
    const vs = vitalsFor(hn, store);
    if (vs.length < 3) return [];
    const last3 = vs.slice(-3);
    const trends = [];
    const rs = last3.map(v => v.R).filter(x => x != null);
    const sps = last3.map(v => v.SpO2).filter(x => x != null);
    if (rs.length === 3 && rs[2] > rs[1] && rs[1] > rs[0] && rs[2] - rs[0] >= 8)
      trends.push({ txt: `RR ↑ ${rs[0]}→${rs[1]}→${rs[2]}` });
    if (sps.length === 3 && sps[2] < sps[1] && sps[1] < sps[0] && sps[0] - sps[2] >= 3)
      trends.push({ txt: `SpO₂ ↓ ${sps[0]}→${sps[1]}→${sps[2]}` });
    return trends;
  };

  // ── TP STATUS — v8 format ─────────────────────────────────
  // Returns: { tp, cat, label, hoursLate?, hoursUntil? }
  const tpStatus = (patient, store) => {
    const age = ageHours(patient);
    if (patient.archived) return { tp: null, cat: 'done', label: 'เสร็จสิ้น 44 hr' };
    const done = doneTPs(patient.hn, store);

    let nextDue = null, nextSoon = null;
    for (const tp of TIMEPOINTS) {
      if (done.has(tp)) continue;
      const off = OFFSETS[tp];
      if (age >= off + 1) { nextDue = tp; break; }      // overdue (>1hr past)
      if (age >= off - 0.5 && age <= off + 1) { nextDue = tp; break; } // due now
      if (age < off - 0.5) { nextSoon = tp; break; }    // upcoming
    }
    if (nextDue) {
      const off = OFFSETS[nextDue];
      const cat = age > off + 1 ? 'overdue' : 'due';
      return { tp: nextDue, cat, label: cat === 'overdue' ? `เลย ${nextDue}` : `ถึงเวลา ${nextDue}`, hoursLate: Math.max(0, age - off) };
    }
    if (nextSoon) {
      const off = OFFSETS[nextSoon];
      const cat = (off - age) <= 2 ? 'soon' : 'ok';
      return { tp: nextSoon, cat, label: cat === 'soon' ? `ใน ${(off-age).toFixed(1)}h` : `ถัดไป ${nextSoon}`, hoursUntil: off - age };
    }
    if (done.size === TIMEPOINTS.length) return { tp: null, cat: 'complete', label: 'เสร็จสมบูรณ์' };
    return { tp: null, cat: 'done', label: 'รอ' };
  };

  // ── KP 2024 EOS CALCULATOR (v8 format) ───────────────────
  const KP = {
    INCIDENCE_DEFAULT: 0.5,
    LR: {
      ga: {
        '34': 2.4, '35': 1.8, '36': 1.4, '37': 1.0, '38': 0.85, '39': 0.75, '40': 0.70, '41+': 0.70,
      },
      tempMax: {
        '<37.5': 0.6, '37.5-38.0': 1.0, '38.0-38.5': 2.2, '38.5-39.0': 4.0, '≥39.0': 6.5,
      },
      rom: {
        '0-6': 0.8, '6-12': 1.0, '12-18': 1.6, '18-24': 2.1, '>24': 3.2,
      },
      gbs: {
        'neg': 0.7, 'unk': 1.0, 'pos': 2.4,
      },
      iap: {
        'broad-spec-≥4hr':   0.30,
        'broad-spec-<4hr':   0.55,
        'gbs-spec-≥2hr':     0.45,
        'gbs-spec-<2hr':     0.75,
        'none':              1.0,
      },
    },

    compute(inputs) {
      const { incidence, ga, tempMax, rom, gbs, iap } = inputs;
      const inc = (incidence ?? this.INCIDENCE_DEFAULT) / 1000;
      let posterior = inc;
      const factors = [];

      const apply = (k, v, label) => {
        if (v == null || v === undefined) return;
        const lr = this.LR[k]?.[v];
        if (!lr) return;
        const oddsBefore = posterior / (1 - posterior);
        const oddsAfter = oddsBefore * lr;
        posterior = oddsAfter / (1 + oddsAfter);
        factors.push({ key: k, label, value: v, lr, posteriorPer1k: posterior * 1000 });
      };

      apply('ga',      String(ga ?? ''),       'GA');
      apply('tempMax', tempMax,                'ไข้มารดา');
      apply('rom',     rom,                    'ROM');
      apply('gbs',     gbs,                    'GBS');
      apply('iap',     iap,                    'IAP');

      const per1k = posterior * 1000;
      const priorPer1k = inc * 1000;
      let band, action;
      if (per1k >= 3.0) {
        band = 'high';
        action = 'พิจารณาให้ Empiric ATB + ส่งเลือดเพาะเชื้อ';
      } else if (per1k >= 1.0) {
        band = 'medium';
        action = 'Enhanced observation: Serial PE q4–6h × 24–36 ชม.';
      } else {
        band = 'low';
        action = 'Routine well-baby care + observation';
      }
      return { priorPer1k, posteriorPer1k: per1k, factors, band, action };
    },

    applyExam(prePosterior, exam) {
      const lr = { well: 0.41, equivocal: 5.0, 'clinical-illness': 21.5 }[exam];
      if (!lr) return prePosterior;
      const odds = prePosterior / (1000 - prePosterior);
      const newOdds = odds * lr;
      const p = newOdds / (1 + newOdds);
      return p * 1000;
    },
  };

  // ── LEGACY CALC (kept for v5 compatibility reference) ─────
  const calcEOSRisk = ({ gaWeeks=39, gaDays=0, romHours=12, maternalTempC=37.0, gbsStatus='unk', iapType='none', incidence=0.5 }) => {
    const ga = gaWeeks + (gaDays || 0) / 7;
    let gaFactor;
    if (ga < 35) gaFactor = 8.0;
    else if (ga < 36) gaFactor = 4.0;
    else if (ga < 37) gaFactor = 2.3;
    else if (ga < 38) gaFactor = 1.5;
    else if (ga < 39) gaFactor = 1.0;
    else if (ga < 40) gaFactor = 0.75;
    else if (ga < 41) gaFactor = 0.60;
    else gaFactor = 0.50;
    let risk = incidence * gaFactor;
    if (gbsStatus === 'pos') risk *= 6.0;
    else if (gbsStatus === 'neg') risk *= 0.18;
    if (romHours >= 24) risk *= 1.9;
    else if (romHours >= 18) risk *= 1.4;
    else if (romHours >= 12) risk *= 1.1;
    else risk *= 0.7;
    if (maternalTempC >= 39.0) risk *= 4.2;
    else if (maternalTempC >= 38.0) risk *= 2.3;
    if (iapType === 'broad_4plus') risk *= 0.065;
    else if (iapType === 'broad_2to4') risk *= 0.12;
    else if (iapType === 'gbs_2plus') risk *= 0.15;
    return Math.max(0.001, Math.round(risk * 10000) / 10000);
  };

  const calcEOSTable = (birthRisk) => [
    { exam: 'Clinical Illness', examTh: 'อาการหนัก', risk: Math.min(999, Math.round(birthRisk * 6.5 * 100) / 100), recommend: 'Blood culture + Empiric antibiotics', recommendTh: 'เริ่ม Empirical ABX ทันที + blood culture', badge: 'red', vitals: 'Hemodynamic instability, NCPAP/HFNC, O₂ ≥ 2 hr' },
    { exam: 'Equivocal', examTh: 'กำกวม', risk: Math.min(999, Math.round(birthRisk * 2.2 * 100) / 100), recommend: 'Blood culture + CBC → individualize', recommendTh: 'เจาะ CBC + blood culture พิจารณา ABX', badge: 'amber', vitals: 'HR ≥ 160 / RR ≥ 60 / Temp instability ≥ 4 hr' },
    { exam: 'Well Appearing', examTh: 'ดูดี', risk: Math.min(999, Math.round(birthRisk * 0.45 * 100) / 100), recommend: 'Routine newborn care', recommendTh: 'ดูแลตามปกติ — Serial PE ตาม protocol', badge: 'green', vitals: 'ไม่มีความผิดปกติคงที่' },
  ];

  const riskCategory = risk => {
    if (risk<0.5)  return {level:'low', label:'ความเสี่ยงต่ำ',    en:'Low',       badge:'green',recommend:'Routine care',                    detail:'Continue routine newborn care. No additional workup.'};
    if (risk<1.0)  return {level:'med', label:'ความเสี่ยงปานกลาง',en:'Moderate',  badge:'amber',recommend:'Serial PE × 48 hr',              detail:'No labs needed; clinical surveillance is sufficient if exam remains reassuring.'};
    if (risk<3.0)  return {level:'high',label:'ความเสี่ยงสูง',    en:'High',      badge:'amber',recommend:'Blood culture + CBC · Serial PE', detail:'Obtain blood culture and CBC at 0–6 hr. Continue serial PE.'};
    return           {level:'crit',label:'ความเสี่ยงสูงมาก',  en:'Very high', badge:'red',  recommend:'Empirical ABX + full sepsis workup',detail:'Start empirical broad-spectrum antibiotics. Full sepsis workup required.'};
  };

  // ── DEMO SEED — v8 format (birthAt, floor, integer ga+gaDays, kpRisk) ──
  // Returns {patients, vitals} AND writes to localStorage.
  function makeMockPatient(idx, hn, babyFirst, babyLast, motherFirst, motherLast, ga, gaDays, bw, ageHr, floor, bed, opts) {
    opts = opts || {};
    const birthAt = new Date(Date.now() - ageHr * 3600000).toISOString();
    return {
      hn, babyFirst, babyLast, motherFirst, motherLast,
      name: `${babyFirst} ${babyLast}`,
      motherName: `${motherFirst} ${motherLast}`,
      ga, gaDays: gaDays || 0, bw, bed, floor,
      sex: opts.sex || (idx % 2 ? 'F' : 'M'),
      birthAt, createdAt: birthAt, dob: birthAt,
      archived: false,
      intake: {
        chorio:        opts.chorio || false,
        maternalFever: opts.maternalFever || 'no',
        fever:         opts.fever || null,
        gbs:           opts.gbs || 'unk',
        rom:           opts.rom || 6,
        iap:           opts.iap || 'none',
      },
      kpRisk: opts.kpRisk ?? null,
      labs: opts.labs || null,
      isSerialPE: true, synced: false, ts: birthAt,
    };
  }

  function makeVital(hn, ageHr, babyAgeHr, opts) {
    opts = opts || {};
    const ts = new Date(Date.now() - (babyAgeHr - ageHr) * 3600000).toISOString();
    const tpLabel = ageHr === 1.5 ? '1-2 hr' : ageHr === 3.5 ? '3-4 hr' : `${Math.round(ageHr)} hr`;
    return {
      ts, hn, ageHr: tpLabel,
      T:    opts.T    ?? 36.9 + (Math.random() - .5) * .4,
      P:    opts.P    ?? 140  + (Math.random() - .5) * 20,
      R:    opts.R    ?? 50   + (Math.random() - .5) * 12,
      SpO2: opts.SpO2 ?? 97   + (Math.random() - .5) * 3,
      skin: opts.skin || 'Rosy',
      rd:   opts.rd   || [],
      note: opts.note || '',
      by:   opts.by   || 'พ.ยานี',
      wellbeing: 'yes',
      abxApproved: opts.abxApproved || false,
      synced: false,
    };
  }

  const seedDemoData = () => {
    const patients = [
      makeMockPatient(0, '1234/69', 'สมศรี', 'ทองเย็น',     'มาริษา', 'ทองเย็น',     39, 2, 3120, 26, '22B', '01', { gbs:'pos', rom:18, iap:'broad-spec-<4hr', kpRisk:1.84, maternalFever:'yes', fever:38.4 }),
      makeMockPatient(1, '1248/69', 'ณรงค์', 'สุขสันต์',    'พิมพ์ใจ', 'สุขสันต์',     38, 4, 2780, 8,  '22B', '02', { gbs:'neg', rom:4,  iap:'none', kpRisk:0.31, sex:'M' }),
      makeMockPatient(2, '1257/69', 'อนัญญา', 'รุ่งโรจน์',  'สุริยา', 'รุ่งโรจน์',     37, 5, 2650, 19, '22B', '03', { gbs:'unk', rom:22, iap:'none', kpRisk:2.13, sex:'F' }),
      makeMockPatient(3, '1263/69', 'ภาณุพงศ์', 'คงทรัพย์', 'จันทร์เพ็ญ', 'คงทรัพย์',  40, 0, 3450, 4,  '22B', '04', { gbs:'neg', rom:8,  iap:'none', kpRisk:0.22, sex:'M' }),
      makeMockPatient(4, '1271/69', 'ปวีณ์', 'พิสุทธิ์',     'ดวงใจ', 'พิสุทธิ์',       36, 6, 2410, 12, '22B', '05', { gbs:'pos', rom:14, iap:'gbs-spec-≥2hr', kpRisk:0.88, sex:'F', maternalFever:'yes', fever:37.9 }),
      makeMockPatient(5, '1283/69', 'อรปรียา', 'เพ็ญแข',    'สุกัญญา', 'เพ็ญแข',      39, 3, 3010, 38, '17A', '06', { gbs:'unk', rom:22, iap:'none', kpRisk:1.42, sex:'F', maternalFever:'yes', fever:38.1, labs:{ cbc:{wbc:14.2,anc:5.4,plt:220,hb:16.2,drawnAtHr:4}, hsCRP:{value:18.5,drawnAtHr:10}, hc:{status:'no growth',drawnAtHr:4}, abxStartedAtHr:6 } }),
      makeMockPatient(6, '1295/69', 'ฐาปกรณ์', 'จันทร์ฉาย', 'นภา', 'จันทร์ฉาย',       34, 1, 2050, 16, '17A', '12', { gbs:'unk', rom:28, iap:'none', kpRisk:4.21, sex:'M', chorio:true, maternalFever:'yes', fever:38.6 }),
      makeMockPatient(7, '1304/69', 'ชญาดา', 'ไพรวัลย์',    'พลอย', 'ไพรวัลย์',       38, 4, 2900, 23, '17A', '14', { gbs:'pos', rom:10, iap:'broad-spec-≥4hr', kpRisk:0.42, sex:'F' }),
      makeMockPatient(8, '1316/69', 'ธีรเดช', 'วาสนา',      'อัจฉรา', 'วาสนา',        39, 2, 3280, 30, '17A', '18', { gbs:'neg', rom:5,  iap:'none', kpRisk:0.14, sex:'M' }),
      makeMockPatient(9, '1327/69', 'กมลวรรณ', 'แก้วใส',     'ปิยดา', 'แก้วใส',        40, 5, 3380, 6,  'SCN', '03', { gbs:'neg', rom:3,  iap:'none', kpRisk:0.12, sex:'F' }),
      makeMockPatient(10,'1342/69', 'ปฤษฎา', 'อินทร์งาม',  'สุพัตรา', 'อินทร์งาม',  35, 1, 2280, 14, 'SCN', '07', { gbs:'pos', rom:20, iap:'broad-spec-<4hr', kpRisk:1.42, sex:'F', maternalFever:'yes', fever:38.1 }),
      makeMockPatient(11,'1358/69', 'ปุณณภา', 'ศรีสวัสดิ์', 'พัชรินทร์', 'ศรีสวัสดิ์', 38, 1, 2980, 1,  '22B', '06', { gbs:'unk', rom:9,  iap:'none', kpRisk:0.42, sex:'F' }),
      makeMockPatient(12,'1361/69', 'ธนกฤต', 'มหาทรัพย์', 'รัตนาภรณ์', 'มหาทรัพย์', 34, 3, 2110, 16, 'SCN', '09', { gbs:'unk', rom:26, iap:'none', kpRisk:3.84, sex:'M', maternalFever:'yes', fever:38.7, labs:{ cbc:{wbc:4.2,anc:1.1,plt:165,hb:17.8,drawnAtHr:4}, hsCRP:{value:42.5,drawnAtHr:12}, hc:{status:'pending',drawnAtHr:4}, abxStartedAtHr:5 } }),
    ];

    const vitals = [];
    // Baby 0 (สมศรี, 26h, high-risk)
    vitals.push(makeVital(patients[0].hn, 1.5, 26, {T:37.0,P:142,R:48,SpO2:98}));
    vitals.push(makeVital(patients[0].hn, 3.5, 26, {T:37.1,P:138,R:52,SpO2:97}));
    vitals.push(makeVital(patients[0].hn, 10,  26, {T:37.3,P:150,R:56,SpO2:96}));
    vitals.push(makeVital(patients[0].hn, 18,  26, {T:37.8,P:172,R:68,SpO2:93,rd:['tachypnea','retractions'],skin:'Pale'}));
    vitals.push(makeVital(patients[0].hn, 22,  26, {T:37.6,P:165,R:62,SpO2:95,rd:['tachypnea']}));
    // Baby 1 (ณรงค์, 8h)
    vitals.push(makeVital(patients[1].hn, 1.5, 8, {T:36.8,P:132,R:44,SpO2:99}));
    vitals.push(makeVital(patients[1].hn, 3.5, 8, {T:36.9,P:128,R:46,SpO2:99}));
    // Baby 2 (อนัญญา, 19h)
    vitals.push(makeVital(patients[2].hn, 1.5, 19, {T:36.9,P:145,R:50,SpO2:97}));
    vitals.push(makeVital(patients[2].hn, 3.5, 19, {T:37.0,P:148,R:54,SpO2:96}));
    vitals.push(makeVital(patients[2].hn, 10,  19, {T:37.2,P:158,R:60,SpO2:95}));
    // Baby 3 (ภาณุพงศ์, 4h)
    vitals.push(makeVital(patients[3].hn, 1.5, 4, {T:36.7,P:130,R:42,SpO2:99}));
    // Baby 4 (ปวีณ์, 12h)
    vitals.push(makeVital(patients[4].hn, 1.5, 12, {T:36.7,P:138,R:50,SpO2:98}));
    vitals.push(makeVital(patients[4].hn, 3.5, 12, {T:36.8,P:142,R:52,SpO2:97}));
    vitals.push(makeVital(patients[4].hn, 10,  12, {T:36.9,P:144,R:54,SpO2:97}));
    // Baby 5 (อรปรียา, 38h)
    [1.5,3.5,10,18,22,36].forEach(off => { vitals.push(makeVital(patients[5].hn, off, 38, {T:36.9,P:132,R:46,SpO2:99})); });
    // Baby 6 (ฐาปกรณ์, 16h, chorio HIGH-RISK)
    vitals.push(makeVital(patients[6].hn, 1.5, 16, {T:36.4,P:165,R:64,SpO2:95,rd:['grunting']}));
    vitals.push(makeVital(patients[6].hn, 3.5, 16, {T:36.2,P:172,R:70,SpO2:92,rd:['grunting','retractions'],skin:'Marbled'}));
    vitals.push(makeVital(patients[6].hn, 10,  16, {T:36.0,P:178,R:74,SpO2:90,rd:['grunting','retractions','nasal flaring'],skin:'Pale'}));
    // Baby 7 (ชญาดา, 23h)
    [1.5,3.5,10,18].forEach(off => { vitals.push(makeVital(patients[7].hn, off, 23, {T:36.9,P:140,R:50,SpO2:98})); });
    // Baby 8 (ธีรเดช, 30h)
    [1.5,3.5,10,18,22].forEach(off => { vitals.push(makeVital(patients[8].hn, off, 30, {T:36.8,P:134,R:48,SpO2:99})); });
    // Baby 9 (กมลวรรณ, 6h)
    [1.5,3.5].forEach(off => { vitals.push(makeVital(patients[9].hn, off, 6, {T:36.9,P:138,R:48,SpO2:99})); });
    // Baby 10 (ปฤษฎา, 14h)
    vitals.push(makeVital(patients[10].hn, 1.5, 14, {T:36.8,P:145,R:50,SpO2:98}));
    vitals.push(makeVital(patients[10].hn, 3.5, 14, {T:37.0,P:150,R:54,SpO2:97}));
    vitals.push(makeVital(patients[10].hn, 10,  14, {T:37.2,P:158,R:60,SpO2:96}));
    // Baby 11 (ปุณณภา, 1h)
    vitals.push(makeVital(patients[11].hn, 1.5, 1, {T:36.8,P:138,R:46,SpO2:99}));
    // Baby 12 (ธนกฤต, 16h, preterm + sepsis)
    vitals.push(makeVital(patients[12].hn, 1.5, 16, {T:36.4,P:160,R:60,SpO2:95,skin:'Pale'}));
    vitals.push(makeVital(patients[12].hn, 3.5, 16, {T:36.2,P:168,R:66,SpO2:93,rd:['tachypnea'],skin:'Pale'}));
    vitals.push(makeVital(patients[12].hn, 10,  16, {T:35.9,P:175,R:72,SpO2:91,rd:['tachypnea','retractions'],skin:'Marbled'}));

    // Always write to localStorage (for ?demo=1 mode)
    setStore(STORE.patients, patients);
    setStore(STORE.vitals,   vitals);

    return { patients, vitals };
  };

  return {
    TIMEPOINTS, OFFSETS, ABX_TPS, RANGES, SKIN_OPTS, RD_OPTS,
    AUTH, STAFF_DB, ROLE_CFG, STORE, SESSION_HR, DEFAULT_WEBHOOK,
    sj, getStore, setStore,
    getSession, setSession, clearSession,
    getUsers, saveUsers, findStaffByEmail,
    auditLog, getCfg, setCfg, syncRow, loginGAS, getToken, fetchT,
    loadFromGAS,
    nowISO, hoursSince, maskHn, esc,
    fmtTime, fmtDateTime, fmtRelative, fmtDate,
    fmtAge, fmtAgeShort, fmtAgeParts, fmtGA,
    initials, displayName, floorLabel,
    evalVitals, evalTrend, vitalFlag, calcEOSRisk, calcEOSTable, riskCategory, KP,
    ageHours, vitalsFor, doneTPs, nextTP, tpDueAt, tpStatus,
    seedDemoData,
  };
})();

// Convenience globals — used across all panel files
const { TIMEPOINTS, OFFSETS, ABX_TPS, RANGES, SKIN_OPTS, RD_OPTS } = EOS;
const { evalVitals, evalTrend, vitalFlag, calcEOSRisk, riskCategory } = EOS;
const { ageHours, vitalsFor, doneTPs, nextTP, tpDueAt, tpStatus } = EOS;
const { fmtTime, fmtDateTime, fmtRelative } = EOS;
const { initials, floorLabel, fmtAge, fmtAgeParts, fmtAgeShort, fmtGA } = EOS;
