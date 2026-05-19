// EOS Smart Alert — App shell + routing
// SRP: app state, sidebar nav, session management only.

// ── PIN / CONFIRM MODAL ──────────────────────────
function PinModal({ msg, onConfirm, onCancel }) {
  const [txt, setTxt] = React.useState('');
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{maxWidth:380,textAlign:'center'}} onClick={e=>e.stopPropagation()}>
        <h3>🔒 ยืนยันการดำเนินการ</h3>
        <div className="sub">{msg}</div>
        <input
          type="text" value={txt} onChange={e=>setTxt(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&onConfirm(txt)}
          placeholder="พิมพ์ข้อความยืนยัน" autoFocus
          style={{width:'100%',padding:'10px 13px',border:'1.5px solid var(--border-2)',borderRadius:8,fontSize:16,textAlign:'center',letterSpacing:2,marginBottom:14,fontFamily:'IBM Plex Mono, monospace',outline:'none'}}
          onFocus={e=>e.target.style.borderColor='var(--teal)'}
          onBlur={e=>e.target.style.borderColor='var(--border-2)'}
        />
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-primary" style={{flex:1}} onClick={()=>onConfirm(txt)}>ยืนยัน</button>
          <button className="btn btn-ghost"   style={{flex:1}} onClick={onCancel}>ยกเลิก</button>
        </div>
      </div>
    </div>
  );
}

// ── SIDEBAR NAV CONFIG ───────────────────────────
const NAV = [
  { key:'dashboard', icon:'board',    label:'Ward Board',      section:'Clinical',  roles:['doctor','nurse','admin'] },
  { key:'patients',  icon:'patients', label:'Patients',        section:'Clinical',  roles:['doctor','nurse','admin'] },
  { key:'triage',    icon:'triage',   label:'Triage',          section:'Clinical',  roles:['doctor','nurse','admin'] },
  { key:'calc',      icon:'calc',     label:'EOS Calculator',  section:'Clinical',  roles:['doctor','nurse','admin'] },
  { key:'handoff',   icon:'handoff',  label:'Handoff Summary', section:'รายงาน',   roles:['doctor','nurse','admin'] },
  { key:'alerts',    icon:'bell',     label:'Alerts',          section:'รายงาน',   roles:['doctor','nurse','admin'] },
  { key:'schedule',  icon:'calendar', label:'Schedule',        section:'รายงาน',   roles:['doctor','nurse','admin'] },
  { key:'abx',       icon:'abx',      label:'ABX Approval',    section:'รายงาน',   roles:['doctor','admin'] },
  { key:'records',   icon:'list',     label:'All Records',     section:'ระบบ',     roles:['doctor','nurse','admin'] },
  { key:'metrics',   icon:'chart',    label:'Quality Metrics', section:'ระบบ',     roles:['doctor','admin'] },
  { key:'audit',     icon:'eye',      label:'Audit Log',       section:'ระบบ',     roles:['admin'] },
  { key:'config',    icon:'cog',      label:'Config',          section:'ระบบ',     roles:['admin'] },
  { key:'users',     icon:'users',    label:'จัดการผู้ใช้',     section:'ระบบ',     roles:['admin'] },
];

const VIEW_TITLES = {
  dashboard:'Ward Board', patients:'Patients', triage:'Triage', calc:'EOS Calculator',
  handoff:'Handoff Summary', alerts:'Alerts Log', schedule:'Schedule', abx:'ABX Approval',
  records:'All Records', metrics:'Quality Metrics', audit:'Audit Log', config:'Config', users:'จัดการผู้ใช้',
  patient:'Patient Detail',
};

// ── MAIN APP ─────────────────────────────────────
function App() {
  const { useState, useEffect } = React;

  // ── State ─────────────────────────────────────
  // เริ่มต้นด้วย null เสมอ — บังคับ login ทุกครั้งที่โหลดหน้า
  const [session, setSession]   = useState(null);
  const [view,    setView]      = useState('dashboard');
  const [openHn,  setOpenHn]    = useState(null);
  const [patients, setPatients] = useState(() => { EOS.seedDemoData(); return EOS.getStore(EOS.STORE.patients, []); });
  const [vitals,   setVitals]   = useState(() => EOS.getStore(EOS.STORE.vitals, []));
  const [peTarget, setPeTarget] = useState(null);
  const [pinModal, setPinModal] = useState(null);   // {msg, resolve}
  const [, tick]          = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Effects ───────────────────────────────────
  useEffect(() => { EOS.setStore(EOS.STORE.patients, patients); }, [patients]);
  useEffect(() => { EOS.setStore(EOS.STORE.vitals,   vitals);   }, [vitals]);

  // Auto-refresh ward board + session check every 30s
  useEffect(() => {
    const t = setInterval(() => {
      tick(x => x + 1);
      if (!EOS.getSession()) { setSession(null); }
    }, 30000);
    return () => clearInterval(t);
  }, []);

  // ── Not logged in ──────────────────────────────
  if (!session) {
    return <LoginScreen onLogin={sess => { setSession(sess); setView('dashboard'); }}/>;
  }

  const rc = EOS.ROLE_CFG[session.role];
  const currentPatient = openHn ? patients.find(p => p.hn === openHn) : null;

  // ── Handlers ──────────────────────────────────
  const goPatient = hn => { setOpenHn(hn); setView('patient'); };
  const doLogout  = () => {
    EOS.auditLog('LOGOUT', session.name);
    EOS.clearSession();
    // Clear patient PII from localStorage (Vera #3 — shared workstation protection)
    EOS.setStore(EOS.STORE.patients, []);
    EOS.setStore(EOS.STORE.vitals, []);
    // Reset Google Sign-In
    try { if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect(); } catch {}
    setSession(null);
  };

  const showPin = msg => new Promise(resolve => setPinModal({ msg, resolve }));

  const handleCreatePatient = p => {
    setPatients(arr => [p, ...arr]);
    EOS.syncRow('Triage', p);
    goPatient(p.hn);
  };

  const handleSavePE = entry => {
    setVitals(arr => [...arr, entry]);
    setPeTarget(null);
    EOS.syncRow('SerialPE', entry).then(ok => {
      if (ok) setVitals(arr => arr.map(v => v.ts === entry.ts ? {...v, synced:true} : v));
    });
  };

  const handleDischarge = async hn => {
    const txt = await showPin(`Discharge HN ${hn}?\nพิมพ์ "ยืนยัน" เพื่อยืนยัน`);
    setPinModal(null);
    if ((txt||'').trim() !== 'ยืนยัน') return alert('การยืนยันไม่ถูกต้อง');
    setPatients(arr => arr.map(p => p.hn===hn ? {...p, archived:true} : p));
    EOS.auditLog('DISCHARGE', `HN:${EOS.maskHn(hn)}`);
    setView('dashboard'); setOpenHn(null);
  };

  const handleApproveAbx = async (ts, decision, patientName, overrideReason='') => {
    const label = decision==='stop' ? 'หยุด Antibiotic' : 'ต่อ Antibiotic';
    const txt = await showPin(`${label}\n${patientName||''}\nพิมพ์ "ยืนยัน" เพื่อยืนยัน`);
    setPinModal(null);
    if ((txt||'').trim() !== 'ยืนยัน') return;
    const now = EOS.nowISO();
    setVitals(arr => arr.map(v => v.ts===ts ? {
      ...v, abxApproved:true, abxDecision:decision,
      abxBy:session.name, abxAt:now,
      abxReason: overrideReason,
      abxStartAt: decision==='continue' ? now : null,
    } : v));
    EOS.auditLog('ABX_DECISION', `${decision.toUpperCase()} by ${session.name} reason:${overrideReason} ts:${ts}`);
  };

  // ── Nav counts ────────────────────────────────
  let alertCount=0, dueCount=0;
  patients.forEach(p => {
    const st = tpStatus(p, vitals);
    if (st.cat==='overdue'||st.cat==='soon') dueCount++;
    vitalsFor(p.hn, vitals).forEach(v => { if (evalVitals(v).some(i=>i.sev==='red')) alertCount++; });
    if (EOS.evalTrend(p.hn, vitals).length > 0) alertCount++; // trend-based alert
  });
  const abxPending = vitals.filter(v => EOS.ABX_TPS.has(v.ageHr) && !v.abxApproved).length;

  // ── Alert ticker ──────────────────────────────
  const tickerItems = []; // {msg, hn}
  patients.forEach(p => {
    const last = vitalsFor(p.hn, vitals).slice(-1)[0];
    if (last && evalVitals(last).some(i=>i.sev==='red'))
      tickerItems.push({msg:`${p.name} · ${p.bed||p.hn} · ผิดปกติที่ ${last.ageHr}`, hn:p.hn});
    const trends = EOS.evalTrend(p.hn, vitals);
    if (trends.length) tickerItems.push({msg:`${p.bed||p.hn} · Trend: ${trends[0].txt}`, hn:p.hn});
    const st = tpStatus(p, vitals);
    if (st.cat==='overdue'&&!p.archived)
      tickerItems.push({msg:`${p.bed||p.hn} · เลยกำหนด ${st.tp}`, hn:p.hn});
  });
  const tickerMsgs = tickerItems.map(t=>t.msg); // backward compat for alertCount

  // ── Sidebar nav items (role-filtered) ─────────
  const navItems = NAV.filter(n => n.roles.includes(session.role));
  let lastSection = '';

  return (
    <div className="app-shell">
      {/* ─── MOBILE SIDEBAR OVERLAY ───────────── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)}/>
      )}

      {/* ─── SIDEBAR ──────────────────────────── */}
      <aside className={`sidebar${sidebarOpen?' open':''}`}>
        <div className="sidebar-brand">
          <div className="brand-row">
            <div className="brand-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z"/>
                <path d="M9 12h2v-2h2v2h2v2h-2v2h-2v-2H9z"/>
              </svg>
            </div>
            <div>
              <div className="brand-name">EOS Smart Alert</div>
              <div className="brand-sub">v3.0 · KCMH NICU</div>
            </div>
          </div>
          <div className="ward-chip">
            <span className="ward-dot"/>
            <div>
              <div className="label">WARD</div>
              <div className="val">NICU · จุฬาลงกรณ์</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(n => {
            const showSection = n.section !== lastSection;
            lastSection = n.section;
            const isActive = view === n.key || (n.key==='dashboard' && view==='patient');
            const count = n.key==='alerts' ? alertCount : n.key==='abx' ? abxPending : n.key==='dashboard' ? dueCount : 0;
            return (
              <React.Fragment key={n.key}>
                {showSection && <div className="nav-section">{n.section}</div>}
                <button
                  className={`nav-item${isActive?' active':''}`}
                  onClick={() => { setView(n.key); if (n.key!=='patient') setOpenHn(null); setSidebarOpen(false); }}>
                  <Icon name={n.icon} size={17}/>
                  <span>{n.label}</span>
                  {count>0 && <span className={`nav-count ${n.key==='alerts'?'alert':n.key==='abx'?'warn':n.key==='dashboard'?'warn':''}`}>{count}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="avatar" style={{background:rc.bg, color:rc.color}}>{session.name.slice(0,2)}</div>
          <div className="info">
            <div className="name">{session.name}</div>
            <div className="role">{rc.icon} {rc.label}</div>
          </div>
          <button className="icon-btn" style={{color:'rgba(255,255,255,.5)'}} onClick={doLogout} title="ออกจากระบบ"><Icon name="logout"/></button>
        </div>
      </aside>

      {/* ─── MAIN ─────────────────────────────── */}
      <main className="main">
        {/* Alert ticker — clickable → go to patient or alerts */}
        {tickerItems.length>0 && (
          <div className="alert-ticker" style={{cursor:'pointer'}} onClick={()=>setView('alerts')}>
            <Icon name="warn" size={16}/>
            <span className="label">URGENT</span>
            <div className="messages">
              <span>{[...tickerItems,...tickerItems].map(t=>t.msg).join('  ·  ')}</span>
            </div>
            <span style={{flexShrink:0,fontSize:11,opacity:.8,paddingLeft:8,borderLeft:'1px solid rgba(255,255,255,.25)'}}>ดูทั้งหมด →</span>
          </div>
        )}

        {/* Topbar */}
        <header className="topbar">
          {/* Hamburger — mobile only */}
          <button className="hamburger-btn icon-btn" onClick={()=>setSidebarOpen(s=>!s)} title="Menu">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="4" x2="16" y2="4"/><line x1="2" y1="9" x2="16" y2="9"/><line x1="2" y1="14" x2="16" y2="14"/>
            </svg>
          </button>
          <div className="topbar-title">
            {view==='patient'&&currentPatient ? (
              <><span className="breadcrumb">Patients /</span> {currentPatient.name}</>
            ) : (
              VIEW_TITLES[view]||'EOS Smart Alert'
            )}
          </div>
          <div className="topbar-right">
            <div className="live-clock">
              <span className="dot"/>
              LIVE · {new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}
            </div>
            <button className="icon-btn" onClick={()=>setView('alerts')} title="Alerts">
              <Icon name="bell"/>
              {alertCount>0 && <span className="badge-dot"/>}
            </button>
            <button className="icon-btn" onClick={()=>setView('config')} title="Config"><Icon name="cog"/></button>
          </div>
        </header>

        {/* Content */}
        <div className="content">
          <div className="content-inner">
            {view==='dashboard' && <Dashboard patients={patients} vitals={vitals} onOpenPatient={goPatient} onGo={setView}/>}
            {view==='patients'  && <PatientList patients={patients} vitals={vitals} onOpenPatient={goPatient}/>}
            {view==='triage'    && <Triage onCreated={handleCreatePatient} onCancel={()=>setView('dashboard')}/>}
            {view==='calc'      && <Calculator/>}
            {view==='alerts'    && <AlertsLog patients={patients} vitals={vitals} onOpenPatient={goPatient}/>}
            {view==='handoff'   && <HandoffSummary patients={patients} vitals={vitals}/>}
            {view==='schedule'  && <Schedule patients={patients} vitals={vitals} onOpenPatient={goPatient}/>}
            {view==='abx'       && <ABXApproval patients={patients} vitals={vitals} onApprove={handleApproveAbx} session={session}/>}
            {view==='records'   && <AllRecords patients={patients} vitals={vitals} session={session}/>}
            {view==='metrics'   && <QualityMetrics patients={patients} vitals={vitals}/>}
            {view==='audit'     && <AuditLog session={session}/>}
            {view==='config'    && <Config session={session} patients={patients} vitals={vitals}/>}
            {view==='users'     && <UserManagement session={session}/>}
            {view==='patient'   && currentPatient && (
              <PatientDetail
                patient={currentPatient} vitals={vitals}
                onBack={()=>setView('dashboard')}
                onAddPE={setPeTarget}
                onDischarge={handleDischarge}
                session={session}
              />
            )}
          </div>
        </div>
      </main>

      {/* PE Form Modal */}
      {peTarget && (
        <PEForm patient={peTarget} vitals={vitals} onSave={handleSavePE} onClose={()=>setPeTarget(null)} session={session}/>
      )}

      {/* Pin/Confirm Modal */}
      {pinModal && (
        <PinModal
          msg={pinModal.msg}
          onConfirm={txt => { pinModal.resolve(txt); setPinModal(null); }}
          onCancel={()  => { pinModal.resolve(null); setPinModal(null); }}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
