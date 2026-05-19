// EOS Smart Alert — Data layer
// SRP: localStorage, GAS sync, EOS utilities. No React/JSX here.
// Exposes: window.EOS + convenience aliases for panels

const EOS = window.EOS = (() => {

  // ── CONSTANTS ──────────────────────────────────────────
  const TIMEPOINTS = ['1-2 hr','3-4 hr','10 hr','18 hr','22 hr','36 hr','44 hr'];
  const OFFSETS    = {'1-2 hr':1.5,'3-4 hr':3.5,'10 hr':10,'18 hr':18,'22 hr':22,'36 hr':36,'44 hr':44};
  const ABX_TPS    = new Set(['36 hr','44 hr']);
  const SESSION_HR = 8;
  const DEFAULT_WEBHOOK = 'https://script.google.com/macros/s/AKfycbyeF4SJ_EK5JBZDkUknY1uGzXGJIzLGCUrzVhXrkbXREwgxmbXb9qzkOVzpB0-Ro4sH/exec';

  const RANGES = {
    T:    {lo:36.5,hi:37.4,hardLo:36.0,hardHi:38.0,unit:'°C'},
    P:    {lo:110, hi:160, hardLo:100, hardHi:180, unit:'bpm'},
    R:    {lo:40,  hi:60,  hardLo:30,  hardHi:70,  unit:'/min'},
    SpO2: {lo:95,  hi:100, hardLo:92,  hardHi:100, unit:'%'},
  };
  const SKIN_OPTS = ['Rosy','Pale','Marbled','Cyanotic'];
  const RD_OPTS   = ['tachypnea','nasal flaring','retractions','grunting'];

  // ── AUTH / ROLE ─────────────────────────────────────────
  const AUTH = {
    GOOGLE_CLIENT_ID: '658466851314-1a9ub51gpilmg32abobrtqp7772s8dbu.apps.googleusercontent.com',
    ALLOW_DEMO_MODE: false,
  };

  // Staff managed via GAS Staff sheet — authorization is server-side (verifyToken)
  // This local DB is fallback only; leave empty for production
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
    // 1. Persist locally
    const arr = getStore(STORE.audit);
    arr.push(entry);
    if (arr.length > 1000) arr.splice(0, arr.length-1000);
    setStore(STORE.audit, arr);
    // 2. Sync to GAS immediately — fire-and-forget (Vera #7)
    // syncRow defined below in same closure scope — safe to call
    const url = getCfg?.() ? (getCfg().url || DEFAULT_WEBHOOK) : DEFAULT_WEBHOOK;
    const token = s?.token || null;
    if (token) {
      fetch(url, {
        method:'POST', headers:{'Content-Type':'text/plain'},
        body: JSON.stringify({sheet:'AuditLog', ...entry, token}),
      }).catch(()=>{}); // silent fail — audit is best-effort sync
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
  const getToken = () => {
    const s = sj(sessionStorage.getItem('eos_sess'), null);
    return s?.token || null;
  };

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

  /** loginGAS — ตรวจสอบ Google JWT กับ GAS (server-side verify) */
  const loginGAS = async token => {
    const url = getCfg().url || DEFAULT_WEBHOOK;
    try {
      const r = await fetchT(url, {
        method:'POST', headers:{'Content-Type':'text/plain'},
        body:JSON.stringify({action:'login', token}),
      }, 10000);
      if (!r.ok) return { status:'network_error', code:r.status };
      const data = await r.json();
      return data; // ส่งคืน object เต็ม: {status:'ok'|'unauthorized', email, name, role}
    } catch (e) {
      return { status:'error', message: e?.message||'unknown' };
    }
  };

  // ── UTILS ────────────────────────────────────────────────
  const nowISO = () => new Date().toISOString();
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

  // ── VITAL EVALUATION ────────────────────────────────────

  /**
   * evalTrend — KP "Equivocal" criterion detection across consecutive PEs
   * Returns issues[] if HR/RR/Temp/RD abnormal in ≥2 consecutive readings
   * (simulates "persistent physiologic abnormality")
   */
  const evalTrend = (hn, store) => {
    const vits = vitalsFor(hn, store);
    if (vits.length < 2) return [];
    const last2 = vits.slice(-2);
    const issues = [];

    // Check each numeric vital: both readings must be outside normal (lo/hi)
    [['P', 'HR'], ['R', 'RR'], ['T', 'Temp']].forEach(([k, label]) => {
      const r = RANGES[k];
      if (!r) return;
      const allAbnormal = last2.every(v => {
        const val = v[k];
        return val != null && (+val < r.lo || +val > r.hi);
      });
      if (allAbnormal) {
        const lastVal = last2[last2.length - 1][k];
        const sev = (+lastVal < r.hardLo || +lastVal > r.hardHi) ? 'red' : 'amber';
        issues.push({ k: label, txt: `persistent ${label}=${lastVal}${r.unit}`, sev, trend: true });
      }
    });

    // Persistent respiratory distress (both readings have rd)
    if (last2.every(v => v.rd && v.rd.length > 0)) {
      issues.push({ k: 'RD', txt: 'persistent respiratory distress', sev: 'red', trend: true });
    }

    return issues;
  };

  const evalVitals = v => {
    const issues = [];
    if (v.wellbeing==='no') issues.push({k:'Wellbeing',txt:'ผิดปกติ',sev:'red'});
    if (v.skin && v.skin!=='Rosy') issues.push({k:'Skin',txt:v.skin,sev:v.skin==='Cyanotic'?'red':'amber'});
    [['T',v.T],['P',v.P],['R',v.R],['SpO2',v.SpO2]].forEach(([k,val]) => {
      if (val==null) return;
      const r=RANGES[k]; if(!r) return;
      const n=+val;
      if (n<r.hardLo||n>r.hardHi) issues.push({k,txt:n+r.unit,sev:'red'});
      else if (n<r.lo||n>r.hi)    issues.push({k,txt:n+r.unit,sev:'amber'});
    });
    if (v.rd && v.rd.length) issues.push({k:'Distress',txt:v.rd.join(', '),sev:'red'});
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

  // ── EOS RISK CALCULATOR — KP 2024 (Kuzniewicz / Puopolo) ─
  // Reference: neonatalsepsiscalculator.kaiserpermanente.org
  // version: '2017' (no universal GBS screening) | '2024' (universal GBS screening)
  // iapType: 'broad_4plus' | 'broad_2to4' | 'gbs_2plus' | 'none'
  // gbsStatus: 'neg' | 'pos' | 'unk'
  // maternalTempC: in Celsius
  // incidence: base EOS rate at your institution per 1000 live births
  const calcEOSRisk = ({
    gaWeeks=39, gaDays=0,
    romHours=12, maternalTempC=37.0,
    gbsStatus='unk', iapType='none',
    incidence=0.5, version='2024',
  }) => {
    const ga = gaWeeks + (gaDays || 0) / 7;

    // GA factor (relative to GA 39 wk reference)
    let gaFactor;
    if (ga < 35)      gaFactor = 8.0;
    else if (ga < 36) gaFactor = 4.0;
    else if (ga < 37) gaFactor = 2.3;
    else if (ga < 38) gaFactor = 1.5;
    else if (ga < 39) gaFactor = 1.0;
    else if (ga < 40) gaFactor = 0.75;
    else if (ga < 41) gaFactor = 0.60;
    else              gaFactor = 0.50;

    let risk = incidence * gaFactor;

    // GBS status
    if (version === '2024') {
      // Universal screening: negative result more reliable
      if (gbsStatus === 'pos') risk *= 6.0;
      else if (gbsStatus === 'neg') risk *= 0.18;
      // unk = ×1.0
    } else {
      // 2017: no universal screening
      if (gbsStatus === 'pos') risk *= 6.0;
      else if (gbsStatus === 'neg') risk *= 0.27;
    }

    // ROM duration
    if (romHours >= 24)      risk *= 1.9;
    else if (romHours >= 18) risk *= 1.4;
    else if (romHours >= 12) risk *= 1.1;
    else                     risk *= 0.7; // < 12hr

    // Maternal temperature (Celsius)
    if (maternalTempC >= 39.0)      risk *= 4.2;
    else if (maternalTempC >= 38.0) risk *= 2.3;
    // < 38°C = ×1.0

    // Intrapartum antibiotics — 4-level (KP 2024)
    if (iapType === 'broad_4plus')  risk *= 0.065; // most protective
    else if (iapType === 'broad_2to4') risk *= 0.12;
    else if (iapType === 'gbs_2plus')  risk *= 0.15;
    // 'none' / < 2hr = ×1.0

    return Math.max(0.001, Math.round(risk * 10000) / 10000);
  };

  // Clinical presentation table — risk modifier after exam
  const calcEOSTable = (birthRisk) => [
    {
      exam: 'Clinical Illness', examTh: 'อาการหนัก',
      risk: Math.min(999, Math.round(birthRisk * 6.5 * 100) / 100),
      recommend: 'Blood culture + Empiric antibiotics',
      recommendTh: 'เริ่ม Empirical ABX ทันที + blood culture',
      badge: 'red',
      vitals: 'Hemodynamic instability, NCPAP/HFNC, O₂ ≥ 2 hr',
    },
    {
      exam: 'Equivocal', examTh: 'กำกวม',
      risk: Math.min(999, Math.round(birthRisk * 2.2 * 100) / 100),
      recommend: 'Blood culture + CBC → individualize',
      recommendTh: 'เจาะ CBC + blood culture พิจารณา ABX',
      badge: 'amber',
      vitals: 'HR ≥ 160 / RR ≥ 60 / Temp instability ≥ 4 hr',
    },
    {
      exam: 'Well Appearing', examTh: 'ดูดี',
      risk: Math.min(999, Math.round(birthRisk * 0.45 * 100) / 100),
      recommend: 'Routine newborn care',
      recommendTh: 'ดูแลตามปกติ — Serial PE ตาม protocol',
      badge: 'green',
      vitals: 'ไม่มีความผิดปกติคงที่',
    },
  ];

  const riskCategory = risk => {
    if (risk<0.5)  return {level:'low', label:'ความเสี่ยงต่ำ',    en:'Low',       badge:'green',recommend:'Routine care',                    detail:'Continue routine newborn care. No additional workup.'};
    if (risk<1.0)  return {level:'med', label:'ความเสี่ยงปานกลาง',en:'Moderate',  badge:'amber',recommend:'Serial PE × 48 hr',              detail:'No labs needed; clinical surveillance is sufficient if exam remains reassuring.'};
    if (risk<3.0)  return {level:'high',label:'ความเสี่ยงสูง',    en:'High',      badge:'amber',recommend:'Blood culture + CBC · Serial PE', detail:'Obtain blood culture and CBC at 0–6 hr. Continue serial PE.'};
    return           {level:'crit',label:'ความเสี่ยงสูงมาก',  en:'Very high', badge:'red',  recommend:'Empirical ABX + full sepsis workup',detail:'Start empirical broad-spectrum antibiotics. Full sepsis workup required.'};
  };

  // ── PATIENT HELPERS ─────────────────────────────────────
  const ageHours  = p => Math.round((Date.now()-new Date(p.dob))/36e5*10)/10;
  const vitalsFor = (hn, store) => (store||getStore(STORE.vitals)).filter(v=>v.hn===hn).sort((a,b)=>new Date(a.ts)-new Date(b.ts));
  const doneTPs   = (hn, store) => new Set(vitalsFor(hn, store).map(v=>v.ageHr));
  const nextTP    = (hn, store) => { const done=doneTPs(hn,store); return TIMEPOINTS.find(tp=>!done.has(tp))||null; };
  const tpDueAt   = (p, tp)    => new Date(new Date(p.dob).getTime()+OFFSETS[tp]*3600000);

  const tpStatus = (p, store) => {
    if (p.archived) return {cat:'done',label:'เสร็จสิ้น 44 hr',dueIn:null};
    const tp = nextTP(p.hn, store);
    if (!tp) return {cat:'done',label:'เสร็จสิ้น',dueIn:null};
    const dueAt = tpDueAt(p, tp);
    const diffH = (dueAt-Date.now())/3600000;
    const issues = vitalsFor(p.hn, store).flatMap(v=>evalVitals(v));
    const hasRed = issues.some(i=>i.sev==='red');
    if (hasRed && diffH<2) return {cat:'overdue',label:'ผิดปกติ — รอประเมิน',dueIn:0,tp,isAlert:true};
    if (diffH<-0.5) return {cat:'overdue',label:`เลยกำหนด ${Math.abs(Math.round(diffH*10)/10)} hr`,dueIn:diffH,tp};
    if (diffH<1.5)  return {cat:'soon',   label:`ครบในอีก ${Math.round(diffH*60)} นาที`,           dueIn:diffH,tp};
    return               {cat:'ok',    label:`ครบในอีก ${Math.round(diffH*10)/10} hr`,            dueIn:diffH,tp};
  };

  // ── DEMO SEED ───────────────────────────────────────────
  const seedDemoData = () => {
    if (getStore(STORE.patients).length > 0) return;
    const now=Date.now();
    const ago = h => new Date(now-h*3600000).toISOString();
    const pts = [
      {hn:'68/12047',name:'Baby ของ คุณสุพรรณี', motherName:'คุณสุพรรณี ใจดี',  sex:'M',ga:38.4,bw:3120,bed:'NICU-3',dob:ago(38.5),intake:{maternalFever:'yes',fever:38.6,chorio:false,gbs:'pos',rom:14,iap:'partial'},  triageOutcome:'serialPE',isSerialPE:true,archived:false,staff:'system',ts:ago(38.6),synced:false},
      {hn:'68/12053',name:'Baby ของ คุณนภาพร',   motherName:'คุณนภาพร แสงทอง', sex:'F',ga:39.1,bw:3380,bed:'NICU-1',dob:ago(22),  intake:{maternalFever:'no', fever:null,  chorio:false,gbs:'unk',rom:20,iap:'none'},   triageOutcome:'serialPE',isSerialPE:true,archived:false,staff:'system',ts:ago(22.1),synced:false},
      {hn:'68/12058',name:'Baby ของ คุณวันเพ็ญ', motherName:'คุณวันเพ็ญ ทับทิม',sex:'M',ga:36.2,bw:2580,bed:'NICU-5',dob:ago(11.5),intake:{maternalFever:'no', fever:null,  chorio:false,gbs:'pos',rom:6, iap:'adequate'},triageOutcome:'serialPE',isSerialPE:true,archived:false,staff:'system',ts:ago(11.6),synced:false},
    ];
    const vts = [
      {hn:'68/12047',ageHr:'1-2 hr', ts:ago(37),  wellbeing:'yes',skin:'Rosy',   T:37.0,P:142,R:48,SpO2:98,BP:'62/38',rd:[],staff:'พ.สมศรี',management:'',abxApproved:false,synced:false},
      {hn:'68/12047',ageHr:'3-4 hr', ts:ago(35),  wellbeing:'yes',skin:'Rosy',   T:36.9,P:138,R:50,SpO2:97,BP:'60/36',rd:[],staff:'พ.สมศรี',management:'',abxApproved:false,synced:false},
      {hn:'68/12047',ageHr:'10 hr',  ts:ago(28.5),wellbeing:'yes',skin:'Rosy',   T:37.1,P:148,R:54,SpO2:96,BP:'63/40',rd:[],staff:'พ.สมศรี',management:'',abxApproved:false,synced:false},
      {hn:'68/12047',ageHr:'18 hr',  ts:ago(20.5),wellbeing:'no', skin:'Marbled',T:37.8,P:168,R:66,SpO2:94,BP:'58/34',rd:['tachypnea','retractions'],staff:'พ.มาลี',management:'NPO · IV access',abxApproved:false,synced:false},
      {hn:'68/12053',ageHr:'1-2 hr', ts:ago(20.5),wellbeing:'yes',skin:'Rosy',   T:36.8,P:140,R:46,SpO2:97,BP:'64/40',rd:[],staff:'พ.สมศรี',management:'',abxApproved:false,synced:false},
      {hn:'68/12053',ageHr:'3-4 hr', ts:ago(18.5),wellbeing:'yes',skin:'Rosy',   T:36.9,P:136,R:48,SpO2:98,BP:'65/40',rd:[],staff:'พ.สมศรี',management:'',abxApproved:false,synced:false},
      {hn:'68/12053',ageHr:'10 hr',  ts:ago(12),  wellbeing:'yes',skin:'Rosy',   T:37.0,P:138,R:50,SpO2:98,BP:'64/40',rd:[],staff:'พ.มาลี',management:'',abxApproved:false,synced:false},
      {hn:'68/12058',ageHr:'1-2 hr', ts:ago(10),  wellbeing:'yes',skin:'Rosy',   T:36.9,P:144,R:50,SpO2:97,BP:'62/38',rd:[],staff:'พ.สมศรี',management:'',abxApproved:false,synced:false},
    ];
    setStore(STORE.patients, pts);
    setStore(STORE.vitals,   vts);
  };

  return {
    TIMEPOINTS, OFFSETS, ABX_TPS, RANGES, SKIN_OPTS, RD_OPTS,
    AUTH, STAFF_DB, ROLE_CFG, STORE, SESSION_HR, DEFAULT_WEBHOOK,
    sj, getStore, setStore,
    getSession, setSession, clearSession,
    getUsers, saveUsers, findStaffByEmail,
    auditLog, getCfg, setCfg, syncRow, loginGAS, getToken, fetchT,
    calcEOSTable,
    nowISO, maskHn, esc, fmtTime, fmtDateTime, fmtRelative,
    evalVitals, evalTrend, vitalFlag, calcEOSRisk, riskCategory,
    ageHours, vitalsFor, doneTPs, nextTP, tpDueAt, tpStatus,
    seedDemoData,
  };
})();

// Convenience globals — used across all panel files
const { TIMEPOINTS, OFFSETS, ABX_TPS, RANGES, SKIN_OPTS, RD_OPTS } = EOS;
const { evalVitals, evalTrend, vitalFlag, calcEOSRisk, riskCategory } = EOS;
const { ageHours, vitalsFor, doneTPs, nextTP, tpDueAt, tpStatus } = EOS;
const { fmtTime, fmtDateTime, fmtRelative } = EOS;
