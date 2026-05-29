// EOS Smart Alert — App shell v8 Sentinel
// Keeps v5 auth/session/GAS logic, replaces UI shell with v8 layout.

const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

// ── ERROR BOUNDARY — catches render crashes, shows message instead of blank ──
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0a1628', color: '#fca5a5', fontFamily: 'monospace', padding: 40, gap: 16,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>⚠ Render Error</div>
        <div style={{ fontSize: 13, opacity: .7, maxWidth: 480, textAlign: 'center', wordBreak: 'break-all' }}>
          {String(this.state.err?.message || this.state.err)}
        </div>
        <button
          style={{ marginTop: 8, padding: '10px 24px', background: '#1e3a5f', border: '1px solid #3b82f6',
            color: '#93c5fd', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            location.reload();
          }}>
          Clear cache &amp; reload
        </button>
      </div>
    );
  }
}

// ── MAIN APP ──────────────────────────────────────
function App() {
  // ── Theme (simple localStorage, no tweaks dependency) ──
  const [theme, setTheme] = useStateApp(() => localStorage.getItem('eos_theme') || 'ot');
  useEffectApp(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('eos_theme', theme);
  }, [theme]);

  // ── Session — restore from sessionStorage, or force login ──
  const [session, setSession] = useStateApp(() => {
    if (new URLSearchParams(location.search).get('demo') === '1') {
      EOS.seedDemoData();
      const s = { email: 'demo@eos.local', name: 'Dr. Demo', role: 'doctor', loginAt: EOS.nowISO(), token: null };
      EOS.setSession(s);
      return s;
    }
    return EOS.getSession(); // restore valid session (<8hr) instead of forcing re-login
  });

  // ── Patient / vitals state ──
  const [patients, setPatients] = useStateApp(() => EOS.getStore(EOS.STORE.patients, []));
  const [vitals,   setVitals]   = useStateApp(() => EOS.getStore(EOS.STORE.vitals, []));

  // ── Persist on change ──
  useEffectApp(() => { EOS.setStore(EOS.STORE.patients, patients); }, [patients]);
  useEffectApp(() => { EOS.setStore(EOS.STORE.vitals,   vitals);   }, [vitals]);

  // ── Navigation ──
  const [view,        setView]        = useStateApp('floor');
  const [openHn,      setOpenHn]      = useStateApp(null);
  const [activeFloor, setActiveFloor] = useStateApp('22B');

  // ── Modals ──
  const [vitalsTarget, setVitalsTarget] = useStateApp(null);
  const [pinModal,     setPinModal]     = useStateApp(null);
  const [cmdOpen,      setCmdOpen]      = useStateApp(false);
  const [gasLoading,   setGasLoading]   = useStateApp(false);

  // ── Clock ──
  const [now, setNow] = useStateApp(new Date());
  const [, tick] = useStateApp(0);

  useEffectApp(() => {
    const t = setInterval(() => {
      tick(x => x + 1);
      setNow(new Date());
      if (!EOS.getSession()) setSession(null);
    }, 30000);
    return () => clearInterval(t);
  }, []);

  // ── Keyboard shortcuts ──
  useEffectApp(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
        return;
      }
      if (e.target.matches('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      const map = { '1': 'floor', '2': 'handoff', '3': 'alerts', '4': 'abx', '5': 'calc', '6': 'triage' };
      if (map[k]) { setView(map[k]); setOpenHn(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Auth guard ──
  if (!session) {
    const handleLogin = async sess => {
      // Clear stale localStorage from previous session/demo before loading fresh data
      setPatients([]);
      setVitals([]);
      setSession(sess);
      setView('floor');
      setGasLoading(true);
      try {
        const result = await EOS.loadFromGAS(sess.token);
        if (result.ok) {
          EOS.setStore(EOS.STORE.patients, result.patients);
          EOS.setStore(EOS.STORE.vitals,   result.vitals);
          setPatients(result.patients);
          setVitals(result.vitals);
        }
      } finally {
        setGasLoading(false);
      }
    };
    return <LoginScreen onLogin={handleLogin}/>;
  }

  // ── Handlers ──
  const openPatient = hn => { setOpenHn(hn); setView('patient'); };
  const goFloor = () => { setView('floor'); setOpenHn(null); };

  const doLogout = () => {
    EOS.auditLog('LOGOUT', session.name);
    EOS.clearSession();
    EOS.setStore(EOS.STORE.patients, []);
    EOS.setStore(EOS.STORE.vitals, []);
    try { if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect(); } catch {}
    setSession(null);
  };

  const showPin = msg => new Promise(resolve => setPinModal({ msg, resolve }));

  const handleCreatePatient = p => {
    setPatients(arr => [p, ...arr]);
    EOS.syncRow('Triage', p);
    openPatient(p.hn);
  };

  const handleSaveVitals = entry => {
    setVitals(arr => [...arr, entry]);
    setVitalsTarget(null);
    EOS.syncRow('SerialPE', entry).then(ok => {
      if (ok) setVitals(arr => arr.map(v => v.ts === entry.ts ? {...v, synced: true} : v));
    });
  };

  const handleDischarge = async hn => {
    const txt = await showPin(`Discharge HN ${hn}?\nพิมพ์ "ยืนยัน" เพื่อยืนยัน`);
    setPinModal(null);
    if ((txt || '').trim() !== 'ยืนยัน') return;
    setPatients(arr => arr.map(p => p.hn === hn ? {...p, archived: true} : p));
    EOS.auditLog('DISCHARGE', `HN:${EOS.maskHn(hn)}`);
    setView('floor'); setOpenHn(null);
  };

  const handleApproveAbx = async (ts, decision, patientName, overrideReason = '', abxActualStart = null) => {
    const label = decision === 'stop' ? 'หยุด Antibiotic' : 'ต่อ Antibiotic';
    const txt = await showPin(`${label}\n${patientName || ''}\nพิมพ์ "ยืนยัน" เพื่อยืนยัน`);
    setPinModal(null);
    if ((txt || '').trim() !== 'ยืนยัน') return;
    const nowTs = EOS.nowISO();
    const abxStartAt = decision === 'continue' ? (abxActualStart || nowTs) : null;
    setVitals(arr => arr.map(v => v.ts === ts ? {
      ...v, abxApproved: true, abxDecision: decision,
      abxBy: session.name, abxAt: nowTs,
      abxReason: overrideReason,
      abxStartAt,
    } : v));
    EOS.auditLog('ABX_DECISION', `${decision.toUpperCase()} by ${session.name} reason:${overrideReason} abxStart:${abxStartAt || 'n/a'} ts:${ts}`);
  };

  // ── Sentinel-aware counts ──
  const counts = useMemoApp(() => {
    let critN = 0, abxPending = 0, watchN = 0;
    patients.forEach(p => {
      const s = window.Sentinel.score(p, vitals);
      const allV = EOS.vitalsFor(p.hn, vitals);
      const status = EOS.tpStatus(p, vitals);
      if (s.band.key === 'critical' || s.band.key === 'concern' || status.cat === 'overdue') critN++;
      else if (s.band.key === 'watch') watchN++;
      allV.forEach(v => { if (EOS.ABX_TPS.has(v.ageHr) && !v.abxApproved) abxPending++; });
    });
    return { critN, abxPending, watchN };
  }, [patients, vitals]);

  // ── Command palette items ──
  const cmdItems = useMemoApp(() => {
    const items = [];
    items.push({ id: 'go-floor',   label: 'ไป Ward',           sub: '1', icon: 'beds',    section: 'NAVIGATION', action: () => { setView('floor'); setOpenHn(null); } });
    items.push({ id: 'go-handoff', label: 'ไป Shift Handoff',  sub: '2', icon: 'handoff', section: 'NAVIGATION', action: () => setView('handoff') });
    items.push({ id: 'go-alerts',  label: 'ไป Alerts',          sub: '3', icon: 'bell',    section: 'NAVIGATION', action: () => setView('alerts') });
    items.push({ id: 'go-abx',     label: 'ไป ABX Approval',   sub: '4', icon: 'abx',     section: 'NAVIGATION', action: () => setView('abx') });
    items.push({ id: 'go-calc',    label: 'เปิด KP Calculator', sub: '5', icon: 'calc',    section: 'NAVIGATION', action: () => setView('calc') });
    items.push({ id: 'go-triage',  label: 'รับเข้าใหม่',        sub: '6', icon: 'plus',    section: 'NAVIGATION', action: () => setView('triage') });
    items.push({ id: 'toggle-theme', label: theme === 'ot' ? 'เปลี่ยนเป็น Dawn (light)' : 'เปลี่ยนเป็น Operating Theatre (dark)', icon: 'eye', section: 'ACTIONS', action: () => setTheme(t => t === 'ot' ? 'dawn' : 'ot') });
    items.push({ id: 'reset-mock', label: 'รีเซ็ตข้อมูลสาธิต', icon: 'sync', section: 'ACTIONS', action: () => { const d = EOS.seedDemoData(); setPatients(d.patients); setVitals(d.vitals); setView('floor'); } });
    items.push({ id: 'logout', label: 'ออกจากระบบ', icon: 'logout', section: 'ACTIONS', action: doLogout });
    patients.forEach(p => {
      const s = window.Sentinel.score(p, vitals);
      items.push({
        id: 'pt-' + p.hn,
        label: `${EOS.initials(p.name)} · ${p.bed} · ${EOS.floorLabel(p.floor)} · Sentinel ${s.score}`,
        sub: `HN ${p.hn}`,
        icon: 'baby',
        section: 'BABIES',
        keywords: p.hn + ' ' + p.name + ' ' + p.bed,
        action: () => openPatient(p.hn),
      });
    });
    return items;
  }, [patients, vitals, theme]);

  const currentPatient = openHn ? patients.find(p => p.hn === openHn) : null;
  const rc = EOS.ROLE_CFG[session.role] || EOS.ROLE_CFG['nurse'];
  const userInitials = session.name ? session.name.slice(0, 2) : 'NN';

  // ── Page info ──
  const pageInfo = {
    floor:   { h1: 'Ward',          sub: 'NICU · Sentinel monitoring' },
    patient: { h1: currentPatient ? EOS.initials(currentPatient.name) : 'Patient',
               sub: currentPatient ? `HN ${currentPatient.hn} · ${currentPatient.bed} · ${EOS.floorLabel(currentPatient.floor)}` : '' },
    handoff: { h1: 'Shift Handoff', sub: 'SBAR sign-out · sorted by Sentinel' },
    alerts:  { h1: 'Alerts',        sub: `${counts.critN} active` },
    abx:     { h1: 'ABX Approval',  sub: `${counts.abxPending} pending` },
    calc:    { h1: 'KP Calculator', sub: 'Kaiser Permanente 2024 · EOS risk' },
    triage:  { h1: 'รับเข้าใหม่',   sub: 'New admission · Bayesian triage' },
  };
  const info = pageInfo[view] || { h1: 'EOS Smart Alert', sub: '' };

  // ── Sidebar nav ──
  const NAV = [
    { key: 'floor',   label: 'Ward',    icon: 'beds',    badge: 0,                badgeKind: 'crit' },
    { key: 'handoff', label: 'Handoff', icon: 'handoff', badge: 0 },
    { key: 'alerts',  label: 'Alerts',  icon: 'bell',    badge: counts.critN,     badgeKind: 'crit' },
    { key: 'abx',     label: 'ABX',     icon: 'abx',     badge: counts.abxPending,badgeKind: 'warn' },
    { key: 'calc',    label: 'Calc',    icon: 'calc' },
    { key: 'triage',  label: 'Admit',   icon: 'plus' },
  ];

  // ── Screen renderer ──
  const renderScreen = () => {
    switch (view) {
      case 'floor':
        return <FloorV8 patients={patients} vitals={vitals}
          onOpenPatient={openPatient}
          onTriage={() => setView('triage')}
          onEnterVitals={(p, tp) => setVitalsTarget({ patient: p, tp })}
          onGoHandoff={() => setView('handoff')}
          activeFloor={activeFloor} setActiveFloor={setActiveFloor}/>;
      case 'patient':
        return <PatientV8 patient={currentPatient} patients={patients} vitals={vitals}
          onBack={goFloor} onOpenPatient={openPatient}
          onEnterVitals={(p, tp) => setVitalsTarget({ patient: p, tp })}
          onApproveAbx={handleApproveAbx}/>;
      case 'handoff':
        return <HandoffV8 patients={patients} vitals={vitals}
          onOpenPatient={openPatient} onBack={goFloor}/>;
      case 'alerts':
        return <AlertsV7 patients={patients} vitals={vitals} onOpenPatient={openPatient} onBack={goFloor}/>;
      case 'abx':
        return <AbxV7 patients={patients} vitals={vitals} onApprove={handleApproveAbx} onBack={goFloor}/>;
      case 'calc':
        return <CalculatorV7 onCancel={goFloor}/>;
      case 'triage':
        return <TriageV7 existingPatients={patients} onCreatePatient={handleCreatePatient} onCancel={goFloor}/>;
      default:
        return null;
    }
  };

  return (
    <div className="shell">
      {/* ── SIDEBAR ── */}
      <div className="side">
        <div className="side-mark" title="EOS Smart Alert v8 Sentinel">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <div className="side-divider"/>
        {NAV.map(n => (
          <button key={n.key}
            className={`side-btn ${(view === n.key || (n.key === 'floor' && view === 'patient')) ? 'active' : ''}`}
            onClick={() => { setView(n.key); setOpenHn(null); }}
            data-label={n.label}
            title={n.label}>
            <Icon name={n.icon} size={20}/>
            {n.badge > 0 && <span className={`side-badge ${n.badgeKind === 'warn' ? 'warn' : ''}`}>{n.badge}</span>}
          </button>
        ))}

        <div className="side-bottom">
          <button className="side-btn" onClick={() => setTheme(t => t === 'ot' ? 'dawn' : 'ot')} title="Toggle theme" data-label="Theme">
            <Icon name={theme === 'ot' ? 'sun' : 'moon'} size={18}/>
          </button>
          <button className="side-btn" onClick={doLogout} title="ออกจากระบบ" data-label="Logout">
            <Icon name="logout" size={18}/>
          </button>
          <div className="side-avatar" title={`${session.name} · ${rc.label}`}>{userInitials}</div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="main">
        <div className="topbar">
          <div style={{ minWidth: 0 }}>
            <div className="tb-h1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.h1}</div>
            <div className="tb-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.sub}</div>
          </div>
          <div className="tb-divider"/>
          <button className="tb-cmd" onClick={() => setCmdOpen(true)}>
            <Icon name="search" size={13}/>
            <span>ค้นหา · คำสั่ง</span>
            <span className="kbd">⌘K</span>
          </button>
          <div className="tb-spacer"/>
          <div className="tb-clock">
            <span className="dot"/>
            <span>{now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="tb-divider"/>
          <button className="ico-btn" onClick={() => setCmdOpen(true)} title="Search (⌘K)">
            <Icon name="search" size={16}/>
          </button>
          <button className="ico-btn" onClick={() => setTheme(t => t === 'ot' ? 'dawn' : 'ot')} title="Toggle theme">
            <Icon name={theme === 'ot' ? 'sun' : 'moon'} size={16}/>
          </button>
        </div>

        <div className="content">
          {/* GAS loading banner */}
          {gasLoading && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 18px',
              background: 'var(--m-tint)', borderBottom: '1px solid var(--m-deep)',
              color: 'var(--m)', fontSize: 13, flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin .75s linear infinite', flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <span>กำลังโหลดข้อมูลจาก GAS…</span>
            </div>
          )}

          {renderScreen()}
        </div>
      </div>

      {/* ── MODALS ── */}
      {vitalsTarget && (
        <VitalsEntryV7 patient={vitalsTarget.patient} ageHr={vitalsTarget.tp}
          onSave={handleSaveVitals} onCancel={() => setVitalsTarget(null)}/>
      )}

      {pinModal && (
        <PinModal msg={pinModal.msg}
          onConfirm={txt => { pinModal.resolve(txt); setPinModal(null); }}
          onCancel={() => { pinModal.resolve(''); setPinModal(null); }}/>
      )}

      {cmdOpen && (
        <CommandPalette items={cmdItems}
          onClose={() => setCmdOpen(false)}
          onPick={it => { it.action(); setCmdOpen(false); }}/>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppErrorBoundary><App/></AppErrorBoundary>
);
