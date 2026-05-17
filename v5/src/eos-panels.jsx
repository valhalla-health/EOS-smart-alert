// EOS Smart Alert — All panel components
// SRP: panel UI only. One reason to change = panel layout / clinical logic display.

const { useState, useMemo, useEffect, useRef } = React;

// ══════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════

function StatusDot({ patient, vitals }) {
  const st = tpStatus(patient, vitals);
  const all = vitalsFor(patient.hn, vitals);
  const last = all[all.length - 1];
  const hasRed = last && evalVitals(last).some(i => i.sev === 'red');
  if (hasRed)               return <span className="dot-status red pulse-red"/>;
  if (st.cat === 'overdue') return <span className="dot-status red"/>;
  if (st.cat === 'soon')    return <span className="dot-status amber"/>;
  if (st.cat === 'done')    return <span className="dot-status green"/>;
  return <span className="dot-status teal"/>;
}

function SparkTile({ label, unit, value, series, flag }) {
  const clean = (series||[]).filter(s => s != null);
  const min = clean.length ? Math.min(...clean) : 0;
  const max = clean.length ? Math.max(...clean) : 1;
  const pad = (max - min) * 0.2 || 1;
  const lo = min - pad, hi = max + pad;
  const W = 100, H = 28;
  const points = clean.map((v, i) => {
    const x = (i / Math.max(1, clean.length - 1)) * W;
    const y = H - ((v - lo) / (hi - lo)) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = flag === 'red' ? 'var(--red)' : 'var(--teal)';
  return (
    <div className="spark-tile">
      <div className="lbl">{label}</div>
      <div className={`v${flag ? ' flag' : ''}`}>
        {value ?? '—'}
        <span style={{ fontSize:11, color:'var(--text-3)', marginLeft:4, fontFamily:'IBM Plex Sans Thai' }}>{unit}</span>
      </div>
      {clean.length > 1 && (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
          {clean.map((v, i) => {
            const x = (i / Math.max(1, clean.length - 1)) * W;
            const y = H - ((v - lo) / (hi - lo)) * H;
            return <circle key={i} cx={x} cy={y} r="1.4" fill={i === clean.length-1 ? color : 'var(--text-3)'}/>;
          })}
        </svg>
      )}
    </div>
  );
}

function PatientCard({ patient: p, vitals, onClick }) {
  const st = tpStatus(p, vitals);
  const done = doneTPs(p.hn, vitals);
  const all = vitalsFor(p.hn, vitals);
  const lastV = all[all.length - 1];
  const hasAlert = lastV && evalVitals(lastV).some(i => i.sev === 'red');
  return (
    <div className="patient-card" onClick={onClick}>
      <div className="top-row">
        <StatusDot patient={p} vitals={vitals}/>
        <span className="name" title={p.name} style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{p.name.replace('Baby ของ ','')}</span>
        <span className="hn mono">{p.bed||p.hn}</span>
      </div>
      <div className="meta">
        <span>GA <span className="mono">{p.ga}</span> wk</span>
        <span>BW <span className="mono">{p.bw}</span> g</span>
        <span>อายุ <span className="mono">{ageHours(p)}</span> hr</span>
      </div>
      <div className="progress-row">
        {TIMEPOINTS.map(tp => {
          const rec = all.find(v => v.ageHr === tp);
          const isAlert = rec && evalVitals(rec).some(i => i.sev === 'red');
          const cls = isAlert ? 'alert' : done.has(tp) ? 'done' : tp === st.tp ? 'next' : '';
          return <div key={tp} className={`tp-pip ${cls}`} title={tp}/>;
        })}
      </div>
      <div className="foot">
        <span className="due">{st.tp ? <>ถัดไป <strong>{st.tp}</strong></> : <>เสร็จสิ้น</>}</span>
        <span style={{ color: hasAlert?'var(--red)':st.cat==='overdue'?'var(--red-2)':st.cat==='soon'?'var(--amber-2)':'var(--text-3)', fontWeight:600, fontSize:11 }}>
          {hasAlert ? '⚠ ผิดปกติ' : st.label}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════

function Dashboard({ patients, vitals, onOpenPatient, onGo }) {
  const stats = useMemo(() => {
    let overdue=0, soon=0, ok=0, done=0, alerts=0;
    patients.forEach(p => {
      const st = tpStatus(p, vitals);
      if (st.cat==='overdue') overdue++;
      else if (st.cat==='soon') soon++;
      else if (st.cat==='ok')   ok++;
      else if (st.cat==='done') done++;
      vitalsFor(p.hn, vitals).forEach(v => { if (evalVitals(v).some(i=>i.sev==='red')) alerts++; });
    });
    return { overdue, soon, ok, done, alerts, total:patients.filter(p=>!p.archived).length };
  }, [patients, vitals]);

  const cols = [
    { key:'overdue', label:'เลยกำหนด', en:'OVERDUE' },
    { key:'soon',    label:'ใกล้ครบ',   en:'DUE SOON' },
    { key:'ok',      label:'ปกติ',      en:'ON TRACK' },
    { key:'done',    label:'เสร็จสิ้น', en:'COMPLETE' },
  ];

  return (
    <div className="panel">
      <div className="page-head">
        <div>
          <h1>Ward Board</h1>
          <div className="sub">ภาพรวม EOS Surveillance · NICU · {new Date().toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long'})}</div>
        </div>
        <div className="right">
          <button className="btn btn-primary btn-sm" onClick={() => onGo('triage')}><Icon name="plus"/>เปิดเคสใหม่</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat red"><div className="accent"/><div className="lbl">Active Alerts</div><div className="val">{stats.alerts}</div><div className="trend">Vital signs ผิดปกติ</div></div>
        <div className="stat amber"><div className="accent"/><div className="lbl">รอตรวจ / ใกล้ครบ</div><div className="val">{stats.overdue+stats.soon}</div><div className="trend">{stats.overdue} เลยกำหนด · {stats.soon} ใกล้ครบ</div></div>
        <div className="stat teal"><div className="accent"/><div className="lbl">กำลังเฝ้าระวัง</div><div className="val">{stats.total}<span className="suf">เคส</span></div><div className="trend">{stats.done} เสร็จสิ้นแล้ว</div></div>
        <div className="stat green"><div className="accent"/><div className="lbl">ครบ 7 Timepoints</div><div className="val">{stats.done}</div><div className="trend">Serial PE เสร็จสิ้น 44 hr</div></div>
      </div>

      <div className="board">
        {cols.map(col => (
          <div key={col.key} className={`board-col ${col.key}`}>
            <div className="board-col-head">
              <span className={`dot-status ${col.key==='overdue'?'red':col.key==='soon'?'amber':col.key==='ok'?'teal':'green'}`}/>
              <span className="title">{col.label} · {col.en}</span>
              <span className="count">{patients.filter(p=>tpStatus(p,vitals).cat===col.key).length}</span>
            </div>
            {patients.filter(p=>tpStatus(p,vitals).cat===col.key).map(p => (
              <PatientCard key={p.hn} patient={p} vitals={vitals} onClick={() => onOpenPatient(p.hn)}/>
            ))}
            {patients.filter(p=>tpStatus(p,vitals).cat===col.key).length===0 && (
              <div style={{padding:'24px 8px',textAlign:'center',color:'var(--text-3)',fontSize:12,fontStyle:'italic'}}>ไม่มีเคส</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// PATIENT DETAIL
// ══════════════════════════════════════════════════

function PatientDetail({ patient: p, vitals, onBack, onAddPE, onDischarge, session }) {
  const all = vitalsFor(p.hn, vitals);
  const last = all[all.length - 1];
  const lastIssues = last ? evalVitals(last) : [];
  const hasAlert = lastIssues.some(i => i.sev === 'red');
  const st = tpStatus(p, vitals);
  const rc = EOS.ROLE_CFG[session.role];
  const intakeCalc = calcEOSRisk({ ga:p.ga, romHours:p.intake?.rom||0, maternalTemp:p.intake?.fever||37, gbsStatus:p.intake?.gbs||'unk', iapStatus:p.intake?.iap||'none' });
  const intakeCat = riskCategory(intakeCalc);

  return (
    <div className="panel">
      <div className="page-head">
        <div className="flex items-center gap-12">
          <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon name="arrow_left"/>กลับ Ward Board</button>
          {rc.canDischarge && !p.archived && (
            <button className="btn btn-sm" style={{background:'#fef2f2',border:'1px solid var(--red)',color:'var(--red-2)'}} onClick={() => onDischarge(p.hn)}>Discharge</button>
          )}
        </div>
      </div>

      {hasAlert && (
        <div className="banner red mb-16" style={{borderLeft:'4px solid var(--red)'}}>
          <Icon name="warn"/>
          <div style={{flex:1}}>
            <div className="title">พบความผิดปกติ — ต้องการการประเมินทันที</div>
            <div style={{marginTop:4}}>ตรวจครั้งล่าสุด {fmtRelative(last.ts)} · {lastIssues.filter(i=>i.sev==='red').map(i=>i.k+' '+i.txt).join(' · ')}</div>
            <div style={{marginTop:10,display:'flex',gap:8}}>
              <button className="btn btn-danger btn-sm" onClick={()=>{EOS.auditLog('ABX_REQUESTED',`HN:${EOS.maskHn(p.hn)} by ${session.name}`);alert('⚠️ บันทึกแล้ว\nแจ้งแพทย์เพื่อพิจารณาสั่ง Empirical ABX\nการยืนยัน ABX ต้องดำเนินการโดยแพทย์ผ่านหน้า ABX Approval');}}><Icon name="syringe"/>เริ่ม Empirical ABX</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>EOS.auditLog('NOTIFY_DOCTOR',`HN:${EOS.maskHn(p.hn)}`)}>แจ้งแพทย์</button>
            </div>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div>
          <div className="card profile-card">
            <div className="name">{p.name}</div>
            <div className="hn-line">HN {p.hn} · {p.bed||'—'}</div>
            <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
              {p.triageOutcome==='workup'   && <span className="badge badge-red">Workup + Serial PE</span>}
              {p.triageOutcome==='serialPE' && <span className="badge badge-amber">Serial PE</span>}
              {p.triageOutcome==='observe'  && <span className="badge badge-green">Observation</span>}
              {p.archived && <span className="badge badge-grey">เสร็จสิ้น</span>}
              <span className={`badge badge-${intakeCat.badge}`}>EOS {intakeCat.en}</span>
            </div>
            <div className="kv">
              <div className="k">เพศ / GA</div><div className="v">{p.sex==='M'?'ชาย':'หญิง'} · <span className="mono">{p.ga}</span> wk</div>
              <div className="k">น้ำหนักแรกเกิด</div><div className="v mono">{p.bw} g</div>
              <div className="k">เกิดเมื่อ</div><div className="v">{fmtDateTime(p.dob)}</div>
              <div className="k">อายุปัจจุบัน</div><div className="v mono">{ageHours(p)} hr</div>
              {p.motherName && <><div className="k">มารดา</div><div className="v">{p.motherName}</div></>}
              <div className="k">Maternal Fever</div><div className="v">{p.intake?.maternalFever==='yes'?`มี ${p.intake.fever??'—'}°C`:'ไม่มีไข้'}</div>
              <div className="k">GBS</div><div className="v">{{pos:'Positive',neg:'Negative',unk:'Unknown'}[p.intake?.gbs]||'—'}</div>
              <div className="k">ROM</div><div className="v mono">{p.intake?.rom??'—'} hr</div>
              <div className="k">IAP</div><div className="v">{{adequate:'Adequate (≥4hr)',partial:'Partial',none:'None'}[p.intake?.iap]||'—'}</div>
            </div>
          </div>

          <div className="card mt-14">
            <div className="card-head">
              <span className="card-title">EOS Risk · Kaiser</span>
              <span className={`badge badge-${intakeCat.badge}`} style={{marginLeft:'auto'}}>{intakeCat.en}</span>
            </div>
            <div style={{textAlign:'center',padding:'6px 0 4px'}}>
              <div className="mono" style={{fontSize:36,fontWeight:700,letterSpacing:'-1px'}}>{intakeCalc < 0.01 ? intakeCalc.toFixed(3) : intakeCalc.toFixed(2)}</div>
              <div className="muted" style={{fontSize:11}}>ต่อ 1,000 ทารกเกิดมีชีพ</div>
            </div>
            <div className="divider"/>
            <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>{intakeCat.recommend}</div>
            <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.55}}>{intakeCat.detail}</div>
          </div>
        </div>

        <div>
          <div className="card mb-12">
            <div className="card-head">
              <span className="card-title">Latest Vitals</span>
              <span className="card-sub" style={{marginLeft:'auto'}}>{last ? fmtRelative(last.ts) : 'ยังไม่มีบันทึก'}</span>
            </div>
            {last ? (
              <div className="spark-grid">
                <SparkTile label="Temp" unit="°C" value={last.T} series={all.map(v=>v.T)} flag={vitalFlag('T',last.T)}/>
                <SparkTile label="Heart Rate" unit="bpm" value={last.P} series={all.map(v=>v.P)} flag={vitalFlag('P',last.P)}/>
                <SparkTile label="Resp Rate" unit="/min" value={last.R} series={all.map(v=>v.R)} flag={vitalFlag('R',last.R)}/>
                <SparkTile label="SpO₂" unit="%" value={last.SpO2} series={all.map(v=>v.SpO2)} flag={vitalFlag('SpO2',last.SpO2)}/>
                <div className="spark-tile">
                  <div className="lbl">Skin</div>
                  <div className="v" style={{color:last.skin==='Rosy'?'var(--text)':'var(--red)'}}>{last.skin||'—'}</div>
                  <div style={{fontSize:10,color:'var(--text-3)',marginTop:2}}>{last.wellbeing==='yes'?'Wellbeing ปกติ':'⚠ Wellbeing ผิดปกติ'}</div>
                </div>
                <div className="spark-tile">
                  <div className="lbl">Distress</div>
                  <div className="v" style={{fontSize:13,color:(last.rd&&last.rd.length)?'var(--red)':'var(--teal)'}}>
                    {(last.rd&&last.rd.length)?last.rd.join(', '):'ไม่มี'}
                  </div>
                  <div style={{fontSize:10,color:'var(--text-3)',marginTop:2}}>BP {last.BP||'—'}</div>
                </div>
              </div>
            ) : (
              <div className="muted center" style={{padding:24}}>ยังไม่มีข้อมูล vital signs</div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <span className="card-title">Serial PE Timeline</span>
              {!p.archived && (
                <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}} onClick={()=>onAddPE(p)}>
                  <Icon name="plus"/>บันทึก {st.tp||'44 hr'}
                </button>
              )}
            </div>
            <div className="timeline">
              {TIMEPOINTS.map(tp => {
                const rec = all.find(v=>v.ageHr===tp);
                const issues = rec ? evalVitals(rec) : [];
                const hasRed = issues.some(i=>i.sev==='red');
                const cls = rec ? (hasRed?'alert':'done') : tp===st.tp?'due':'';
                const dueAt = tpDueAt(p, tp);
                const isABX = EOS.ABX_TPS.has(tp);
                return (
                  <div key={tp} className={`timeline-row ${cls}`}>
                    <div className="age">
                      {tp}
                      {isABX && <div style={{fontSize:9,color:'var(--amber-2)',fontWeight:700,marginTop:2}}>ABX TO</div>}
                    </div>
                    <div className="body">
                      <div className="ts">
                        {rec ? fmtDateTime(rec.ts) : `กำหนด: ${fmtDateTime(dueAt.toISOString())}`}
                        {rec?.staff && <> · {rec.staff}</>}
                        {rec?.abxApproved && <> · <span style={{color:'var(--green)',fontWeight:600}}>ABX: {rec.abxDecision==='stop'?'หยุดแล้ว':'ต่อแล้ว'}</span></>}
                      </div>
                      {rec ? (
                        <>
                          <div className="summary">{issues.length===0?'ตรวจร่างกายปกติ':hasRed?'⚠ พบความผิดปกติ':'ค่าผิดปกติเล็กน้อย'}</div>
                          <div className="vitals-row">
                            {[['T',rec.T,'T'],['HR',rec.P,'P'],['RR',rec.R,'R'],['SpO₂',rec.SpO2,'SpO2']].map(([label,val,key])=>(
                              <span key={label} className={`v${vitalFlag(key,val)?' flag':''}`}><span className="k">{label}</span><span className="n">{val??'—'}</span></span>
                            ))}
                            <span className="v"><span className="k">Skin</span><span className="n">{rec.skin}</span></span>
                          </div>
                          {issues.length>0 && (
                            <div className="issues">
                              {issues.map((iss,idx)=><span key={idx} className={`badge badge-${iss.sev==='red'?'red':'amber'}`}>{iss.k}: {iss.txt}</span>)}
                            </div>
                          )}
                          {rec.management && <div style={{fontSize:11,color:'var(--text-2)',marginTop:4}}>Plan: {rec.management}</div>}
                        </>
                      ) : tp===st.tp ? (
                        <div className="summary muted">▸ ถัดไป — <button className="btn btn-primary btn-xs" onClick={()=>onAddPE(p)} style={{marginLeft:6}}>บันทึกเดี๋ยวนี้</button></div>
                      ) : (
                        <div className="summary muted" style={{fontStyle:'italic'}}>รอการตรวจ</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// PATIENT LIST
// ══════════════════════════════════════════════════

function PatientList({ patients, vitals, onOpenPatient }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('active');
  const filtered = patients.filter(p => {
    if (filter==='active' && p.archived) return false;
    if (filter==='done' && !p.archived) return false;
    if (q && !(p.name+p.hn+(p.bed||'')).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <div className="panel">
      <div className="page-head">
        <div><h1>Patients</h1><div className="sub">รายชื่อทารกในการเฝ้าระวัง EOS ({patients.length} ราย)</div></div>
        <div className="right">
          <div className="seg">
            {[['all','ทั้งหมด'],['active','กำลังเฝ้าระวัง'],['done','เสร็จสิ้น']].map(([k,l])=>(
              <button key={k} className={filter===k?'active':''} onClick={()=>setFilter(k)}>{l}</button>
            ))}
          </div>
          <div style={{position:'relative'}}>
            <Icon name="search" size={16} style={{position:'absolute',left:10,top:9,color:'var(--text-3)'}}/>
            <input className="input" style={{paddingLeft:32,width:200,height:36}} placeholder="HN / ชื่อ" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
        </div>
      </div>
      <div className="card" style={{padding:0,overflow:'auto'}}>
        <table className="eos">
          <thead><tr><th>สถานะ</th><th>ชื่อ / มารดา</th><th>HN</th><th>เตียง</th><th>GA</th><th>BW</th><th>อายุ</th><th>EOS Risk</th><th>ถัดไป / สถานะ</th><th></th></tr></thead>
          <tbody>
            {filtered.map(p => {
              const st = tpStatus(p, vitals);
              const cal = calcEOSRisk({ga:p.ga,romHours:p.intake?.rom||0,maternalTemp:p.intake?.fever||37,gbsStatus:p.intake?.gbs||'unk',iapStatus:p.intake?.iap||'none'});
              const cat = riskCategory(cal);
              return (
                <tr key={p.hn} onClick={()=>onOpenPatient(p.hn)} style={{cursor:'pointer'}}>
                  <td><StatusDot patient={p} vitals={vitals}/></td>
                  <td><div style={{fontWeight:600}}>{p.name}</div><div className="muted" style={{fontSize:11}}>{p.motherName}</div></td>
                  <td className="mono">{p.hn}</td>
                  <td>{p.bed||'—'}</td>
                  <td className="mono">{p.ga} wk</td>
                  <td className="mono">{p.bw} g</td>
                  <td className="mono">{ageHours(p)} hr</td>
                  <td><span className={`badge badge-${cat.badge}`}>{cal.toFixed(2)} · {cat.en}</span></td>
                  <td style={{color:st.cat==='overdue'?'var(--red)':st.cat==='soon'?'var(--amber)':'inherit',fontWeight:st.cat==='overdue'||st.cat==='soon'?600:400,fontSize:12}}>{st.label}</td>
                  <td><button className="btn btn-ghost btn-xs">เปิด →</button></td>
                </tr>
              );
            })}
            {filtered.length===0&&<tr><td colSpan={10} style={{textAlign:'center',padding:32,color:'var(--text-3)'}}>ไม่พบรายการ</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// TRIAGE
// ══════════════════════════════════════════════════

function Triage({ onCreated, onCancel }) {
  const [q1, setQ1] = useState(null);
  const [q2, setQ2] = useState(null);
  const [q3, setQ3] = useState(null);
  const [form, setForm] = useState({ motherName:'', hn:'', ga:38, bw:3000, bed:'NICU-', feverTemp:38.6, rom:12, gbsStatus:'unk', chorio:false });
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));

  let current=1;
  if (q1!==null) current=2;
  if (q1===false&&q2!==null) current=3;
  if (q1===true||(q1===false&&q2===false)||(q1===false&&q2===true&&q3!==null)) current=4;

  let outcome=null;
  if (q1===true) outcome={type:'workup',verdict:'red',title:form.chorio?'Chorioamnionitis → H/C + CBC + Empirical ABX':'H/C + CBC · Serial PE',actions:form.chorio?['Chorioamnionitis — workup บังคับ','เจาะ Blood culture และ CBC ภายในอายุ 0–6 hr','เริ่ม Empirical ABX ทันที (แพทย์ยืนยัน)','ABX Time-out ที่ 36 และ 44 hr']:['เจาะ Blood culture และ CBC ภายในอายุ 0–6 hr','เริ่ม Serial PE ทันที','พิจารณา Empirical ABX ตามอาการ','ABX Time-out ที่ 36 และ 44 hr']};
  else if (q1===false&&q2===false) outcome={type:'observe',verdict:'green',title:'Routine Care',actions:['ดูแลตามปกติ','ไม่ต้องการ Serial PE','หากอาการเปลี่ยนแปลง ให้ประเมินใหม่']};
  else if (q1===false&&q2===true&&q3===true) outcome={type:'observe',verdict:'green',title:'Routine Care (IAP Adequate)',actions:['IAP เพียงพอ — Routine care','หากอาการเปลี่ยนแปลง ให้ประเมินใหม่']};
  else if (q1===false&&q2===true&&q3===false) outcome={type:'serialPE',verdict:'amber',title:'Serial Physical Examinations',actions:['ตรวจร่างกายตาม 7 timepoints','หากพบผิดปกติ → พิจารณา ABX','ABX Time-out ที่ 36 และ 44 hr (แพทย์)']};

  const handleSubmit = () => {
    if (!outcome||!form.motherName) return;
    if (+form.ga < 34) return alert('⚠️ EOS Smart Alert ใช้สำหรับ GA ≥ 34 สัปดาห์เท่านั้น\nกรุณาตรวจสอบ GA อีกครั้ง');
    const p = {
      hn: form.hn||`68/${10000+Math.floor(Math.random()*9000)}`,
      name: 'Baby ของ '+form.motherName, motherName:form.motherName,
      sex:'M', ga:+form.ga, bw:+form.bw, bed:form.bed,
      dob:EOS.nowISO(),
      intake:{maternalFever:q1?'yes':'no',fever:q1?+form.feverTemp:null,chorio:form.chorio||false,gbs:form.gbsStatus,rom:+form.rom,iap:q3===true?'adequate':q3===false?'none':'partial'},
      triageOutcome:outcome.type, isSerialPE:outcome.type!=='observe', archived:false,
      ts:EOS.nowISO(), synced:false,
    };
    EOS.auditLog('TRIAGE_SAVE',`HN:${EOS.maskHn(p.hn)} → ${p.triageOutcome}`);
    onCreated(p);
  };

  const questions = [
    { num:1, q:'มารดามีไข้ ≥ 38°C หรือ Chorioamnionitis?', en:'Intrapartum fever ≥ 38°C or chorioamnionitis',
      state:q1, set:setQ1, locked:false, yesClass:'danger', noClass:'',
      extra:q1===true&&<div className="mt-12"><div className="row-2"><div className="field"><label>อุณหภูมิมารดา (°C)</label><input className="mono" type="number" step="0.1" value={form.feverTemp} onChange={e=>upd('feverTemp',+e.target.value)}/></div></div><div className="field mt-8" style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" id="chorio-chk" checked={form.chorio} onChange={e=>upd('chorio',e.target.checked)} style={{width:16,height:16}}/><label htmlFor="chorio-chk" style={{fontWeight:600,color:'var(--red-2)'}}>ได้รับการวินิจฉัย Chorioamnionitis (→ workup + พิจารณา Empirical ABX)</label></div></div> },
    { num:2, q:'มารดา GBS Positive หรือมี Risk Factors?', en:'GBS colonized or ROM ≥ 18 hr / prior GBS infant',
      state:q2, set:setQ2, locked:q1===null||q1===true, yesClass:'warn', noClass:'',
      extra:<div className="row-2 mb-12 mt-8"><div className="field"><label>GBS Status</label><select value={form.gbsStatus} onChange={e=>upd('gbsStatus',e.target.value)}><option value="unk">Unknown</option><option value="pos">Positive</option><option value="neg">Negative</option></select></div><div className="field"><label>ROM (hr)</label><input className="mono" type="number" value={form.rom} onChange={e=>upd('rom',+e.target.value)}/></div></div> },
    { num:3, q:'ได้รับ IAP เพียงพอ? (Penicillin/Ampicillin ≥ 4 hr ก่อนคลอด)', en:'Adequate intrapartum antibiotic prophylaxis',
      state:q3, set:setQ3, locked:q1!==false||q2!==true, yesClass:'', noClass:'warn', extra:null },
  ];

  return (
    <div className="panel">
      <div className="page-head">
        <div><h1>Triage Pathway</h1><div className="sub">คัดกรอง EOS · ทารก GA ≥ 34 สัปดาห์</div></div>
        <div className="right"><button className="btn btn-ghost btn-sm" onClick={onCancel}>ยกเลิก</button></div>
      </div>
      <div className="triage-wrap">
        <div>
          <div className="card mb-12">
            <div className="card-head"><span className="card-title">ข้อมูลทารก</span></div>
            <div className="row-2">
              <div className="field"><label>ชื่อมารดา *</label><input value={form.motherName} onChange={e=>upd('motherName',e.target.value)} placeholder="คุณ..."/></div>
              <div className="field"><label>HN</label><input className="mono" value={form.hn} onChange={e=>upd('hn',e.target.value)} placeholder="68/XXXXX"/></div>
            </div>
            <div className="row-3 mt-12">
              <div className="field"><label>GA (wk) <span style={{color:'var(--red-2)',fontSize:11}}>≥34 wk เท่านั้น</span></label><input className="mono" type="number" step="0.1" min="34" max="43" value={form.ga} onChange={e=>upd('ga',+e.target.value)} style={form.ga<34?{borderColor:'var(--red)'}:{}}/>{form.ga<34&&<div style={{color:'var(--red-2)',fontSize:11,marginTop:4}}>⚠️ EOS protocol สำหรับ GA ≥ 34 wk เท่านั้น</div>}</div>
              <div className="field"><label>BW (g)</label><input className="mono" type="number" value={form.bw} onChange={e=>upd('bw',+e.target.value)}/></div>
              <div className="field"><label>เตียง / ห้อง</label><input value={form.bed} onChange={e=>upd('bed',e.target.value)}/></div>
            </div>
          </div>
          {questions.map(({ num, q, en, state, set, locked, yesClass, noClass, extra }) => (
            <div key={num} className={`triage-step ${locked?'locked':current===num?'current':state!==null?'done':''}`}>
              <div className="flex items-center"><span className="step-no">{num}</span><span className="q">{q}</span></div>
              <div className="q-en">{en}</div>
              <div className="step-body">
                {extra}
                <div className="yn-row">
                  <button className={`chip ${yesClass} ${state===true?'active':''}`} onClick={()=>set(true)}>ใช่ · Yes</button>
                  <button className={`chip ${noClass} ${state===false?'active':''}`} onClick={()=>set(false)}>ไม่ใช่ · No</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="outcome">
          <h4>คำแนะนำ · Recommendation</h4>
          {outcome ? (
            <div className={`verdict active ${outcome.verdict}`}>
              <span className="lg">{outcome.title}</span>
              <div className="actions"><ul>{outcome.actions.map((a,i)=><li key={i}>{a}</li>)}</ul></div>
            </div>
          ) : (
            <div className="verdict">ตอบคำถามทุกข้อเพื่อรับคำแนะนำ</div>
          )}
          {outcome && <button className="btn btn-primary mt-12" style={{width:'100%',justifyContent:'center'}} onClick={handleSubmit} disabled={!form.motherName}><Icon name="check"/>สร้างเคสและเริ่มเฝ้าระวัง</button>}
          {outcome && !form.motherName && <div style={{fontSize:11,color:'var(--red)',textAlign:'center',marginTop:6}}>กรอกชื่อมารดาก่อน</div>}
          <div className="card muted mt-14" style={{fontSize:11,color:'var(--text-3)'}}>อ้างอิง: SOO EOS · KCMH NICU (GA ≥ 34 wk)</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// PE FORM (MODAL)
// ══════════════════════════════════════════════════

function PEForm({ patient: p, vitals, onSave, onClose, session }) {
  const tp = nextTP(p.hn, vitals) || '44 hr';
  const isABX = EOS.ABX_TPS.has(tp);
  const [v, setV] = useState({ wellbeing:'yes', skin:'Rosy', T:'', P:'', R:'', SpO2:'', BP:'', rd:[], management:'' });
  const upd = (k,val) => setV(s=>({...s,[k]:val}));
  const toggleRD = key => setV(s=>({...s,rd:s.rd.includes(key)?s.rd.filter(x=>x!==key):[...s.rd,key]}));
  const issues = useMemo(() => evalVitals({...v,T:v.T===''?null:+v.T,P:v.P===''?null:+v.P,R:v.R===''?null:+v.R,SpO2:v.SpO2===''?null:+v.SpO2}), [v]);
  const hasRed = issues.some(i=>i.sev==='red');

  const handleSave = () => {
    const entry = { hn:p.hn, ageHr:tp, ts:EOS.nowISO(), wellbeing:v.wellbeing, skin:v.skin, T:v.T===''?null:+v.T, P:v.P===''?null:+v.P, R:v.R===''?null:+v.R, SpO2:v.SpO2===''?null:+v.SpO2, BP:v.BP, rd:v.rd, staff:session.name, management:v.management, abxApproved:false, synced:false };
    if (hasRed) EOS.auditLog('ABNORMAL_VITALS',`HN:${EOS.maskHn(p.hn)} ${tp}`);
    else EOS.auditLog('VITALS_SAVE',`HN:${EOS.maskHn(p.hn)} ${tp}`);
    onSave(entry); // syncRow handled in handleSavePE (App) — do NOT call here to avoid duplicate GAS posts
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{maxWidth:700}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-12 mb-12">
          <div>
            <h3 style={{marginBottom:0}}>บันทึก Serial PE · <span className="mono">{tp}</span></h3>
            <div className="sub" style={{marginBottom:0}}>{p.name} · HN {p.hn} · อายุ <span className="mono">{ageHours(p)}</span> hr</div>
          </div>
          <button className="icon-btn" style={{marginLeft:'auto'}} onClick={onClose}><Icon name="x"/></button>
        </div>
        {isABX && <div className="banner amber mb-12"><Icon name="abx"/><div><div className="title">ABX Time-Out · {tp}</div>ตรวจสอบ clinical status + workup ก่อนตัดสินใจ ABX (โดยแพทย์)</div></div>}

        <div>
          <h3><span className="num">1</span>General wellbeing · Skin</h3>
          <div className="row-2 mt-8">
            <div><label className="lbl">Wellbeing</label><div className="chip-group mt-8"><button className={`chip ${v.wellbeing==='yes'?'active':''}`} onClick={()=>upd('wellbeing','yes')}>ปกติ · Yes</button><button className={`chip danger ${v.wellbeing==='no'?'active':''}`} onClick={()=>upd('wellbeing','no')}>ผิดปกติ · No</button></div></div>
            <div><label className="lbl">Skin color</label><div className="chip-group mt-8">{EOS.SKIN_OPTS.map(s=><button key={s} className={`chip ${s!=='Rosy'?'danger':''} ${v.skin===s?'active':''}`} onClick={()=>upd('skin',s)}>{s}</button>)}</div></div>
          </div>

          <h3 className="mt-16"><span className="num">2</span>Vital signs</h3>
          <div className="row-4">
            {[{k:'T',label:'Temp',unit:'°C',step:'0.1'},{k:'P',label:'Pulse',unit:'bpm',step:'1'},{k:'R',label:'Resp',unit:'/min',step:'1'},{k:'SpO2',label:'SpO₂',unit:'%',step:'1'}].map(({k,label,unit,step})=>{
              const flag=vitalFlag(k,v[k]); const r=EOS.RANGES[k];
              return (<div key={k}><label className="lbl">{label}</label><div className={`vital-input mt-8${flag?' flag':''}`}><input type="number" step={step} value={v[k]} onChange={e=>upd(k,e.target.value)} placeholder="—"/><span className="unit">{unit}</span></div><div className={`vital-range${flag?' flag':''}`}>{r.lo}–{r.hi}</div></div>);
            })}
          </div>
          <div className="row-2 mt-12"><div><label className="lbl">BP (mmHg)</label><div className="vital-input mt-8"><input value={v.BP} onChange={e=>upd('BP',e.target.value)} placeholder="60/40"/><span className="unit">mmHg</span></div></div></div>

          <h3 className="mt-16"><span className="num">3</span>Respiratory distress</h3>
          <div className="chip-group">{EOS.RD_OPTS.map(rd=><button key={rd} className={`chip danger ${v.rd.includes(rd)?'active':''}`} onClick={()=>toggleRD(rd)}>{rd}</button>)}</div>

          <h3 className="mt-16"><span className="num">4</span>Management / Plan</h3>
          <div className="field"><textarea rows={2} value={v.management} onChange={e=>upd('management',e.target.value)} placeholder="บันทึกการรักษา / แผนการดูแล..."/></div>
        </div>

        {issues.length>0 && <div className={`banner ${hasRed?'red':'amber'} mt-16`}><Icon name="warn"/><div><div className="title">{hasRed?'พบความผิดปกติ':'ค่าผิดปกติเล็กน้อย'}</div><div style={{marginTop:4,fontSize:12}}>{issues.map((i,idx)=><span key={idx} style={{marginRight:8}}>· {i.k}: {i.txt}</span>)}</div>{hasRed&&<div style={{marginTop:6,fontWeight:600,fontSize:12}}>→ แนะนำให้แพทย์ประเมินทันที</div>}</div></div>}
        {issues.length===0&&(v.T||v.P||v.R)&&<div className="banner teal mt-16"><Icon name="check"/><div><div className="title">Vital signs อยู่ในเกณฑ์ปกติ</div></div></div>}

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave}><Icon name="signature"/>บันทึก Serial PE</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// CALCULATOR
// ══════════════════════════════════════════════════

function Calculator() {
  const [p, setP] = useState({ ga:39, romHours:12, maternalTemp:37.5, gbsStatus:'unk', iapStatus:'none' });
  const upd = (k,v) => setP(s=>({...s,[k]:v}));
  const risk = calcEOSRisk(p);
  const cat = riskCategory(risk);
  const pct = Math.min(1, risk/4);
  const gc = cat.badge==='red'?'var(--red)':cat.badge==='amber'?'var(--amber)':'var(--teal)';
  return (
    <div className="panel">
      <div className="page-head"><div><h1>EOS Risk Calculator</h1><div className="sub">Kaiser Permanente neonatal EOS calculator (Puopolo 2011)</div></div></div>
      <div className="calc-grid">
        <div className="card">
          <div className="card-head"><span className="card-title">Input Parameters</span></div>
          <div className="row-2">
            <div><label className="lbl">Gestational Age</label><div className="vital-input mt-8"><input type="number" step="0.1" min="34" max="42" value={p.ga} onChange={e=>upd('ga',+e.target.value)} className="mono"/><span className="unit">wk</span></div><div className="vital-range">≥ 34 wk</div></div>
            <div><label className="lbl">Maternal Temp (max)</label><div className="vital-input mt-8"><input type="number" step="0.1" value={p.maternalTemp} onChange={e=>upd('maternalTemp',+e.target.value)} className="mono"/><span className="unit">°C</span></div><div className="vital-range">≥ 38°C เพิ่มความเสี่ยง</div></div>
          </div>
          <div className="row-2 mt-12">
            <div><label className="lbl">ROM Duration</label><div className="vital-input mt-8"><input type="number" value={p.romHours} onChange={e=>upd('romHours',+e.target.value)} className="mono"/><span className="unit">hr</span></div><div className="vital-range">≥ 18 hr = prolonged</div></div>
            <div><label className="lbl">GBS Status</label><select className="input mt-8" value={p.gbsStatus} onChange={e=>upd('gbsStatus',e.target.value)}><option value="unk">Unknown</option><option value="pos">Positive</option><option value="neg">Negative</option></select></div>
          </div>
          <div className="mt-12"><label className="lbl">Intrapartum Antibiotics</label><div className="chip-group mt-8">{[{k:'adequate',l:'Adequate ≥4hr'},{k:'partial',l:'Partial'},{k:'none',l:'None'}].map(o=><button key={o.k} className={`chip ${p.iapStatus===o.k?'active':''}`} onClick={()=>upd('iapStatus',o.k)}>{o.l}</button>)}</div></div>
          <div className="divider mt-16"/>
          <div style={{fontSize:12,color:'var(--text-3)',lineHeight:1.6}}><strong style={{color:'var(--text-2)'}}>หมายเหตุ:</strong> จำนวนทารกเกิด EOS ต่อ 1,000 ทารกเกิดมีชีพ (ก่อนพิจารณาอาการทางคลินิก)</div>
        </div>
        <div>
          <div className="gauge-card">
            <div className="gauge"><svg viewBox="0 0 200 110"><path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--surface-3)" strokeWidth="14" strokeLinecap="round"/><path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={gc} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${pct*251} 251`}/><circle cx={20+80-80*Math.cos(Math.PI*pct)} cy={100-80*Math.sin(Math.PI*pct)} r="6" fill={gc} stroke="var(--surface)" strokeWidth="2"/></svg></div>
            <div className="gauge-num">{risk<0.01?risk.toFixed(3):risk.toFixed(2)}</div>
            <div className="unit-line">ต่อ 1,000 ทารกเกิดมีชีพ</div>
            <div className={`verdict-pill badge badge-${cat.badge}`} style={{marginTop:14}}>{cat.label} · {cat.en}</div>
          </div>
          <div className="card mt-12"><div className="card-title mb-8">คำแนะนำ</div><div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{cat.recommend}</div><div style={{fontSize:12.5,color:'var(--text-2)',lineHeight:1.55}}>{cat.detail}</div></div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// ALERTS LOG
// ══════════════════════════════════════════════════

function AlertsLog({ patients, vitals, onOpenPatient }) {
  const items = useMemo(() => {
    const list = [];
    patients.forEach(p => {
      vitalsFor(p.hn, vitals).forEach(v => {
        const issues = evalVitals(v);
        const red = issues.filter(i=>i.sev==='red');
        if (red.length) list.push({kind:'red',p,v,msg:'พบผิดปกติที่ '+v.ageHr+' — '+red.map(i=>i.k+' '+i.txt).join(', ')});
        else { const amb=issues.filter(i=>i.sev==='amber'); if(amb.length) list.push({kind:'amber',p,v,msg:'ผิดปกติเล็กน้อย '+v.ageHr+' — '+amb.map(i=>i.k+' '+i.txt).join(', ')}); }
      });
      const st=tpStatus(p,vitals);
      if(st.cat==='overdue'&&st.dueIn!=null&&st.dueIn<0) list.push({kind:'amber',p,v:{ts:new Date(Date.now()-Math.abs(st.dueIn)*3600000).toISOString()},msg:`เลยกำหนดตรวจ ${st.tp}`});
    });
    return list.sort((a,b)=>new Date(b.v.ts)-new Date(a.v.ts));
  }, [patients, vitals]);
  return (
    <div className="panel">
      <div className="page-head"><div><h1>Alerts Log</h1><div className="sub">การแจ้งเตือนทั้งหมด ({items.length} รายการ)</div></div></div>
      <div className="card" style={{padding:0}}>
        {items.length===0?<div className="muted center" style={{padding:40}}>ยังไม่มีการแจ้งเตือน ✓</div>:items.map((it,idx)=>(
          <div key={idx} className={`alert-row ${it.kind}`}>
            <div className="ico"><Icon name={it.kind==='red'?'warn':'clock'}/></div>
            <div className="body"><div className="title">{it.p.name} · <span className="muted mono">{it.p.bed||it.p.hn}</span></div><div className="desc">{it.msg}</div></div>
            <div className="when">{fmtRelative(it.v.ts)}</div>
            <button className="btn btn-ghost btn-xs" onClick={()=>onOpenPatient(it.p.hn)}>เปิด →</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// HANDOFF SUMMARY
// ══════════════════════════════════════════════════

function HandoffSummary({ patients, vitals }) {
  const active = patients.filter(p=>!p.archived);
  return (
    <div className="panel">
      <div className="page-head">
        <div><h1>Handoff Summary</h1><div className="sub">สรุปส่งเวร · {new Date().toLocaleString('th-TH',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}</div></div>
        <div className="right"><button className="btn btn-ghost btn-sm" onClick={()=>window.print()}><Icon name="print"/>พิมพ์</button></div>
      </div>
      {active.length===0&&<div className="card"><div className="muted center" style={{padding:32}}>ไม่มีผู้ป่วย Active</div></div>}
      {active.map(p=>{
        const all=vitalsFor(p.hn,vitals), last=all[all.length-1];
        const done=doneTPs(p.hn,vitals), nxt=nextTP(p.hn,vitals);
        const abnorms=all.filter(v=>evalVitals(v).some(i=>i.sev==='red'));
        const lastIssues=last?evalVitals(last):[];
        const cal=calcEOSRisk({ga:p.ga,romHours:p.intake?.rom||0,maternalTemp:p.intake?.fever||37,gbsStatus:p.intake?.gbs||'unk',iapStatus:p.intake?.iap||'none'});
        const cat=riskCategory(cal);
        return (
          <div key={p.hn} className="card mb-12">
            <div className="card-head">
              <span style={{fontSize:18}}>{abnorms.length>0?'🔴':'🟢'}</span>
              <div><div style={{fontWeight:700,fontSize:15}}>{p.name} <span className="muted mono" style={{fontSize:12}}>HN {p.hn} · {p.bed||'—'}</span></div><div style={{fontSize:12,color:'var(--text-3)'}}>GA {p.ga} wk · BW {p.bw} g · อายุ {ageHours(p)} hr</div></div>
              <div style={{marginLeft:'auto',display:'flex',gap:6,flexWrap:'wrap'}}>
                {done.size>0&&<span className="badge badge-teal">ตรวจแล้ว {done.size}/7</span>}
                {nxt?<span className="badge badge-amber">ถัดไป: {nxt}</span>:<span className="badge badge-green">ครบ 7/7</span>}
                {abnorms.length>0&&<span className="badge badge-red">ผิดปกติ {abnorms.length} ครั้ง</span>}
                <span className={`badge badge-${cat.badge}`}>EOS {cal.toFixed(2)}</span>
              </div>
            </div>
            {last?(
              <>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.6px',color:'var(--text-3)',margin:'10px 0 5px'}}>ผลตรวจล่าสุด ({last.ageHr}) · {fmtDateTime(last.ts)}</div>
                <div style={{fontSize:13,color:'var(--text-2)'}}>T {last.T??'—'}°C · HR {last.P??'—'} · RR {last.R??'—'} · SpO₂ {last.SpO2??'—'}% · Skin: {last.skin||'—'} · WB: {last.wellbeing==='yes'?'ปกติ':'⚠ ผิดปกติ'}</div>
                {lastIssues.length>0&&<div style={{marginTop:6,display:'flex',gap:5,flexWrap:'wrap'}}>{lastIssues.map((i,idx)=><span key={idx} className={`badge badge-${i.sev==='red'?'red':'amber'}`}>{i.k}: {i.txt}</span>)}</div>}
                {last.management&&<div style={{marginTop:6,fontSize:12,color:'var(--text-2)'}}><strong>Plan:</strong> {last.management}</div>}
              </>
            ):<div style={{fontSize:13,color:'var(--text-3)'}}>ยังไม่มีการตรวจ</div>}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════
// SCHEDULE
// ══════════════════════════════════════════════════

function Schedule({ patients, vitals, onOpenPatient }) {
  const [selHn, setSelHn] = useState('');
  const patient = patients.find(p=>p.hn===selHn);
  const all = patient ? vitalsFor(selHn, vitals) : [];
  const now = Date.now();
  return (
    <div className="panel">
      <div className="page-head"><div><h1>Schedule</h1><div className="sub">ตาราง Serial PE Timepoints</div></div></div>
      <div className="card mb-14" style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
        <Icon name="patients" size={16} style={{color:'var(--text-3)',flexShrink:0}}/>
        <select style={{flex:1,border:'none',background:'transparent',fontSize:14,fontWeight:600,color:'var(--teal-2)',outline:'none'}} value={selHn} onChange={e=>setSelHn(e.target.value)}>
          <option value="">— เลือกผู้ป่วย —</option>
          {patients.filter(p=>!p.archived).map(p=>{const st=tpStatus(p,vitals);return <option key={p.hn} value={p.hn}>{p.hn} — {p.name} {st.tp?`→ ${st.tp}`:' ✅ ครบ'}</option>;})}
        </select>
      </div>
      {patient?(
        <div className="card" style={{overflow:'auto'}}>
          <table className="eos" style={{minWidth:700}}>
            <thead><tr><th>Timepoint</th><th>เวลาที่กำหนด</th><th>เวลาตรวจจริง</th><th>T°C</th><th>HR</th><th>RR</th><th>Skin</th><th>Status</th></tr></thead>
            <tbody>
              {TIMEPOINTS.map(tp=>{
                const rec=all.find(v=>v.ageHr===tp), dueAt=tpDueAt(patient,tp), diff=(dueAt.getTime()-now)/60000;
                let rowStyle={}, statusEl;
                if(rec){rowStyle={background:evalVitals(rec).some(i=>i.sev==='red')?'#fef2f2':'#f0fdf4'};statusEl=evalVitals(rec).some(i=>i.sev==='red')?<span className="badge badge-red">❌ ผิดปกติ</span>:<span className="badge badge-green">✅ ปกติ</span>;}
                else if(diff<-30){rowStyle={background:'#fef2f2'};statusEl=<span className="badge badge-red">เลยกำหนด</span>;}
                else if(diff<30){rowStyle={background:'#fffbeb'};statusEl=<span className="badge badge-amber">ใกล้ครบ</span>;}
                else statusEl=<span style={{color:'var(--text-3)',fontSize:12}}>รอตรวจ</span>;
                return (
                  <tr key={tp} style={rowStyle}>
                    <td className="mono" style={{fontWeight:600}}>{tp}{EOS.ABX_TPS.has(tp)&&<span className="badge badge-navy" style={{marginLeft:6,fontSize:9}}>ABX</span>}</td>
                    <td className="mono">{fmtDateTime(dueAt.toISOString())}</td>
                    <td className="mono">{rec?fmtDateTime(rec.ts):'—'}</td>
                    <td className="mono" style={{color:vitalFlag('T',rec?.T)?'var(--red)':'inherit'}}>{rec?.T??'—'}</td>
                    <td className="mono" style={{color:vitalFlag('P',rec?.P)?'var(--red)':'inherit'}}>{rec?.P??'—'}</td>
                    <td className="mono" style={{color:vitalFlag('R',rec?.R)?'var(--red)':'inherit'}}>{rec?.R??'—'}</td>
                    <td style={{color:rec?.skin&&rec.skin!=='Rosy'?'var(--red)':'inherit'}}>{rec?.skin||'—'}</td>
                    <td>{statusEl}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{marginTop:12,textAlign:'right'}}><button className="btn btn-ghost btn-sm" onClick={()=>onOpenPatient(selHn)}>Patient Detail →</button></div>
        </div>
      ):<div className="card"><div className="muted center" style={{padding:40}}>เลือกผู้ป่วยเพื่อดูตาราง</div></div>}
    </div>
  );
}

// ══════════════════════════════════════════════════
// ABX APPROVAL
// ══════════════════════════════════════════════════

function ABXApproval({ patients, vitals, onApprove, session }) {
  const rc = EOS.ROLE_CFG[session.role];
  if (!rc.canApproveAbx) return (
    <div className="panel">
      <div className="page-head"><div><h1>ABX Approval</h1></div></div>
      <div className="card" style={{textAlign:'center',padding:'56px 20px'}}>
        <Icon name="lock" size={48} style={{opacity:.2,marginBottom:14}}/>
        <div style={{fontSize:17,fontWeight:600,marginBottom:6}}>เฉพาะแพทย์เท่านั้น</div>
        <div style={{color:'var(--text-3)',fontSize:13}}>การอนุมัติหยุด/ต่อ Antibiotic สงวนสำหรับแพทย์ผู้รับผิดชอบ</div>
      </div>
    </div>
  );
  const pending = vitals.filter(v=>EOS.ABX_TPS.has(v.ageHr)&&!v.abxApproved);
  const pMap = Object.fromEntries(patients.map(p=>[p.hn,p]));
  return (
    <div className="panel">
      <div className="page-head"><div><h1>ABX Time-Out Approval</h1><div className="sub">รายการรอการอนุมัติ · เฉพาะแพทย์</div></div></div>
      {pending.length===0?<div className="card"><div className="muted center" style={{padding:40}}>ไม่มีรายการรอการอนุมัติ ✓</div></div>:pending.map(v=>{
        const pt=pMap[v.hn], issues=evalVitals(v), hasRed=issues.some(i=>i.sev==='red');
        return (
          <div key={v.ts} className="card mb-12" style={{border:'2px solid #7c3aed',background:'linear-gradient(135deg,#f5f3ff,#fff)'}}>
            <div className="card-head"><Icon name="abx" size={20} style={{color:'#7c3aed'}}/><strong style={{color:'#7c3aed'}}>ABX Time-Out — {v.ageHr}</strong><span className="badge badge-navy" style={{marginLeft:'auto'}}>{v.hn}</span>{pt&&<span style={{marginLeft:8,fontSize:12,color:'var(--text-3)'}}>{pt.name}</span>}</div>
            <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.6}}>
              ตรวจโดย: {v.staff} · {fmtDateTime(v.ts)}<br/>
              T: {v.T??'—'} · HR: {v.P??'—'} · RR: {v.R??'—'} · SpO₂: {v.SpO2??'—'}% · Skin: {v.skin||'—'}<br/>
              Status: {hasRed?<span style={{color:'var(--red)',fontWeight:600}}>❌ ผิดปกติ</span>:<span style={{color:'var(--teal)',fontWeight:600}}>✅ ปกติ</span>}
              {v.management&&<><br/>Plan: {v.management}</>}
            </div>
            <div style={{display:'flex',gap:10,marginTop:14}}>
              <button className="btn btn-sm" style={{background:'#fef2f2',border:'2px solid var(--red)',color:'var(--red-2)',fontWeight:700}} onClick={()=>onApprove(v.ts,'stop',pt?.name||v.hn)}>🛑 หยุด Antibiotic</button>
              <button className="btn btn-sm" style={{background:'#eff6ff',border:'2px solid #3b82f6',color:'#1d4ed8',fontWeight:700}} onClick={()=>onApprove(v.ts,'continue',pt?.name||v.hn)}>▶️ ต่อ Antibiotic</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════
// ALL RECORDS
// ══════════════════════════════════════════════════

function AllRecords({ patients, vitals }) {
  const [tab, setTab] = useState('vitals');
  const exportCSV = () => {
    const hdrs=['ts','hn_masked','ageHr','T','P','R','SpO2','BP','skin','rd','wellbeing','management','abxApproved','abxDecision','staff'];
    const rows=[...vitals].reverse().map(r=>hdrs.map(h=>{
      if (h==='hn_masked') return `"${EOS.maskHn(r.hn)}"`;
      if (h==='rd') return `"${(r.rd||[]).join('|')}"`;
      if (h==='abxApproved') return `"${r.abxApproved?'yes':'no'}"`;
      return `"${String(r[h]??'').replace(/"/g,'""')}"`;
    }).join(','));
    const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,﻿'+encodeURIComponent([hdrs.join(','),...rows].join('\n'));
    a.download=`EOS_${new Date().toISOString().slice(0,10)}.csv`; a.click(); EOS.auditLog('EXPORT_CSV','');
  };
  return (
    <div className="panel">
      <div className="page-head"><div><h1>All Records</h1></div><div className="right"><button className="btn btn-ghost btn-sm" onClick={exportCSV}><Icon name="download"/>Export CSV</button></div></div>
      <div className="seg mb-14"><button className={tab==='vitals'?'active':''} onClick={()=>setTab('vitals')}>Serial PE ({vitals.length})</button><button className={tab==='patients'?'active':''} onClick={()=>setTab('patients')}>Triage ({patients.length})</button></div>
      <div className="card" style={{padding:0,overflow:'auto'}}>
        {tab==='vitals'&&<table className="eos" style={{minWidth:700}}><thead><tr><th>เวลา</th><th>HN</th><th>Timepoint</th><th>T</th><th>HR</th><th>RR</th><th>Skin</th><th>Status</th><th>Staff</th></tr></thead><tbody>{[...vitals].reverse().map((r,i)=>{const hasRed=evalVitals(r).some(x=>x.sev==='red');return(<tr key={i} style={hasRed?{background:'#fef2f2'}:{}}><td className="mono">{fmtDateTime(r.ts)}</td><td className="mono">{EOS.maskHn(r.hn)}</td><td>{r.ageHr}{EOS.ABX_TPS.has(r.ageHr)&&<span className="badge badge-navy" style={{marginLeft:4,fontSize:9}}>ABX</span>}</td><td className="mono" style={{color:vitalFlag('T',r.T)?'var(--red)':'inherit'}}>{r.T??'—'}</td><td className="mono" style={{color:vitalFlag('P',r.P)?'var(--red)':'inherit'}}>{r.P??'—'}</td><td className="mono" style={{color:vitalFlag('R',r.R)?'var(--red)':'inherit'}}>{r.R??'—'}</td><td style={{color:r.skin&&r.skin!=='Rosy'?'var(--red)':'inherit'}}>{r.skin||'—'}</td><td>{hasRed?<span className="badge badge-red">ผิดปกติ</span>:<span className="badge badge-green">ปกติ</span>}</td><td>{r.staff||'—'}</td></tr>);})}</tbody></table>}
        {tab==='patients'&&<table className="eos"><thead><tr><th>เวลา</th><th>HN</th><th>ชื่อ</th><th>GA</th><th>ผลประเมิน</th><th>Staff</th></tr></thead><tbody>{[...patients].reverse().map((p,i)=><tr key={i} style={p.archived?{opacity:.5}:{}}><td className="mono">{fmtDateTime(p.ts)}</td><td className="mono">{EOS.maskHn(p.hn)}</td><td>{p.name}</td><td className="mono">{p.ga} wk</td><td><span className={`badge badge-${p.triageOutcome==='workup'?'red':p.triageOutcome==='serialPE'?'amber':'green'}`}>{p.triageOutcome}</span></td><td>{p.staff||'—'}</td></tr>)}</tbody></table>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════

function AuditLog({ session }) {
  const [log, setLog] = useState(() => EOS.getStore(EOS.STORE.audit,[]).slice().reverse());
  useEffect(() => { const t=setInterval(()=>setLog(EOS.getStore(EOS.STORE.audit,[]).slice().reverse()),15000); return ()=>clearInterval(t); }, []);
  if (session.role!=='admin') return (
    <div className="panel"><div className="page-head"><div><h1>Audit Log</h1></div></div><div className="card" style={{textAlign:'center',padding:'56px 20px'}}><Icon name="lock" size={48} style={{opacity:.2,marginBottom:14}}/><div style={{fontSize:17,fontWeight:600}}>เฉพาะ Admin เท่านั้น</div></div></div>
  );
  return (
    <div className="panel">
      <div className="page-head"><div><h1>Audit Log</h1><div className="sub">{log.length} รายการ</div></div><div className="right"><button className="btn btn-ghost btn-sm" onClick={()=>setLog(EOS.getStore(EOS.STORE.audit,[]).slice().reverse())}><Icon name="refresh"/>Refresh</button></div></div>
      <div className="card" style={{padding:0,overflow:'auto'}}>
        <table className="eos"><thead><tr><th>เวลา</th><th>Staff</th><th>Role</th><th>Action</th><th>Detail</th></tr></thead>
        <tbody>{log.map((r,i)=><tr key={i}><td className="mono" style={{whiteSpace:'nowrap'}}>{fmtDateTime(r.ts)}</td><td>{r.staff}</td><td>{r.role}</td><td><span className="badge badge-teal" style={{fontSize:10}}>{r.action}</span></td><td style={{fontSize:12,color:'var(--text-2)',maxWidth:280}}>{r.detail||'—'}</td></tr>)}
        {log.length===0&&<tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'var(--text-3)'}}>ยังไม่มีบันทึก</td></tr>}</tbody></table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════

function Config({ session, patients, vitals }) {
  const [url, setUrl] = useState(()=>EOS.getCfg().url||EOS.DEFAULT_WEBHOOK);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const save = () => { EOS.setCfg({url}); EOS.auditLog('CONFIG_SAVE','Webhook URL updated'); setResult({ok:true,msg:'✅ บันทึก URL สำเร็จ'}); };
  const test = async () => { setBusy('test'); setResult(null); try { const r=await EOS.fetchT(url.trim(),{method:'GET'},6000); setResult({ok:r.ok,msg:r.ok?'✅ GAS Online':`⚠️ Status ${r.status}`}); } catch(e){setResult({ok:false,msg:`❌ ${e.message}`});} setBusy(''); };
  const syncAll = async () => {
    setBusy('sync'); setResult(null);
    const pend=[...patients.filter(p=>!p.synced).map(p=>({s:'Triage',r:p})),...vitals.filter(v=>!v.synced).map(v=>({s:'SerialPE',r:v}))];
    if(!pend.length){setResult({ok:true,msg:'✅ ข้อมูลทุกรายการ Sync แล้ว'});setBusy('');return;}
    const res=await Promise.allSettled(pend.map(p=>EOS.syncRow(p.s,p.r)));
    const n=res.filter(r=>r.status==='fulfilled'&&r.value).length;
    setResult({ok:n===pend.length,msg:`☁️ Sync ${n}/${pend.length}`}); setBusy('');
  };
  return (
    <div className="panel">
      <div className="page-head"><div><h1>Config</h1><div className="sub">GAS Webhook + Data Sync</div></div></div>
      <div className="card mb-14">
        <div className="card-head"><span className="card-title">Google Apps Script Webhook</span></div>
        <div className="field mb-12"><label>Webhook URL</label><input value={url} onChange={e=>setUrl(e.target.value)} className="mono" style={{fontSize:12}}/></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btn-primary" onClick={save}><Icon name="check"/>บันทึก URL</button>
          <button className="btn btn-ghost" onClick={test} disabled={!!busy}>{busy==='test'?'กำลังทดสอบ…':'ทดสอบ Connection'}</button>
          <button className="btn btn-ghost" onClick={syncAll} disabled={!!busy}><Icon name="refresh"/>{busy==='sync'?'กำลัง Sync…':'Sync All Pending'}</button>
        </div>
        {result&&<div className={`banner ${result.ok?'teal':'red'} mt-12`}>{result.msg}</div>}
      </div>
      <div className="card">
        <div className="card-head"><span className="card-title">ข้อมูลระบบ</span></div>
        <div className="kv">
          <div className="k">Version</div><div className="v mono">v3.0 React Edition</div>
          <div className="k">ผู้ใช้ปัจจุบัน</div><div className="v">{session.name} · {EOS.ROLE_CFG[session.role].label}</div>
          <div className="k">เข้าสู่ระบบเมื่อ</div><div className="v mono">{fmtDateTime(session.loginAt)}</div>
          <div className="k">Patients (local)</div><div className="v mono">{patients.length} รายการ</div>
          <div className="k">Vitals (local)</div><div className="v mono">{vitals.length} รายการ</div>
          <div className="k">รอ Sync</div><div className="v mono">{patients.filter(p=>!p.synced).length+vitals.filter(v=>!v.synced).length} รายการ</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════════════════

function UserManagement({ session }) {
  const rc = EOS.ROLE_CFG[session.role];
  const [users, setUsers] = useState(()=>EOS.getUsers());
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({email:'',name:'',role:'nurse'});
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));
  if (!rc.canManageUsers) return (
    <div className="panel"><div className="page-head"><div><h1>จัดการผู้ใช้</h1></div></div><div className="card" style={{textAlign:'center',padding:'56px 20px'}}><Icon name="lock" size={48} style={{opacity:.2,marginBottom:14}}/><div style={{fontSize:17,fontWeight:600}}>เฉพาะ Admin เท่านั้น</div></div></div>
  );
  const openAdd = () => { setForm({email:'',name:'',role:'nurse'}); setModal('add'); };
  const openEdit = email => { const u=users[email]; setForm({email,name:u.name,role:u.role}); setModal(email); };
  const save = () => {
    if(!form.email||!form.name) return;
    const db={...users,[form.email.toLowerCase()]:{name:form.name,role:form.role}};
    EOS.saveUsers(db); setUsers(db); EOS.auditLog('USER_SAVE',form.email); setModal(null);
  };
  const del = email => {
    if(!confirm(`ลบ ${email}?`)) return;
    const db={...users}; delete db[email];
    EOS.saveUsers(db); setUsers(db); EOS.auditLog('USER_DELETE',email);
  };
  return (
    <div className="panel">
      <div className="page-head"><div><h1>จัดการผู้ใช้</h1><div className="sub">{Object.keys(users).length} บัญชี</div></div><div className="right"><button className="btn btn-primary btn-sm" onClick={openAdd}><Icon name="plus"/>เพิ่มผู้ใช้</button></div></div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <table className="eos"><thead><tr><th>Role</th><th>ชื่อ</th><th>Email</th><th></th></tr></thead>
        <tbody>{Object.entries(users).map(([email,u])=>{const r=EOS.ROLE_CFG[u.role]||{};return(
          <tr key={email}><td><span style={{padding:'3px 10px',borderRadius:999,fontSize:11,fontWeight:700,background:r.bg,color:r.color}}>{r.icon} {r.label}</span></td>
          <td style={{fontWeight:600}}>{u.name}{email===session.email&&<span style={{marginLeft:6,fontSize:10,padding:'2px 8px',borderRadius:999,background:'#e6f3f1',color:'var(--teal-2)'}}>คุณ</span>}</td>
          <td className="mono" style={{fontSize:12}}>{email}</td>
          <td style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
            <button className="btn btn-ghost btn-xs" onClick={()=>openEdit(email)}>แก้ไข</button>
            {email!==session.email&&<button className="btn btn-xs" style={{background:'#fee2e2',color:'var(--red-2)',border:'1px solid var(--red)'}} onClick={()=>del(email)}>ลบ</button>}
          </td></tr>);})}</tbody></table>
      </div>
      {modal&&(
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>{modal==='add'?'เพิ่มผู้ใช้':'แก้ไขผู้ใช้'}</h3>
            <div className="sub">ต้องใช้ Google Account ที่ลงทะเบียนใน EOS Smart Alert</div>
            <div className="field mb-12"><label>Email</label><input type="email" value={form.email} onChange={e=>upd('email',e.target.value)} disabled={modal!=='add'} placeholder="name@gmail.com"/></div>
            <div className="field mb-12"><label>ชื่อ-นามสกุล</label><input value={form.name} onChange={e=>upd('name',e.target.value)} placeholder="พ.ชื่อ / พย.ชื่อ"/></div>
            <div className="field mb-12"><label>Role</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:8}}>
                {Object.entries(EOS.ROLE_CFG).map(([k,r])=>(
                  <div key={k} onClick={()=>upd('role',k)} style={{padding:'10px 8px',border:`1.5px solid ${form.role===k?'var(--teal)':'var(--border-2)'}`,borderRadius:8,textAlign:'center',background:form.role===k?'var(--teal-tint)':'var(--surface)',cursor:'pointer',transition:'all .12s'}}>
                    <div style={{fontSize:20}}>{r.icon}</div><div style={{fontWeight:700,fontSize:12,marginTop:3}}>{r.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-foot"><button className="btn btn-ghost" onClick={()=>setModal(null)}>ยกเลิก</button><button className="btn btn-primary" onClick={save} disabled={!form.email||!form.name}>บันทึก</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  Dashboard, PatientDetail, PatientList, Triage, PEForm, Calculator,
  AlertsLog, HandoffSummary, Schedule, ABXApproval, AllRecords,
  AuditLog, Config, UserManagement, PatientCard, SparkTile, StatusDot,
});
