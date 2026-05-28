// EOS v7 — Visual primitives: Dial, MiniDial, TimelineStrip, Sparkline, Modal

const { useState: useStateUtils, useEffect: useEffectUtils, useMemo: useMemoUtils, useRef: useRefUtils } = React;

// ════════════════════════════════════════
// DIAL — the centerpiece. 7 segments around 270° arc.
// ════════════════════════════════════════
function Dial({ patient, vitals, size = 280, showCenter = true }) {
  const TPS = EOS.TIMEPOINTS;
  const OFF = EOS.OFFSETS;
  const MAX = 44;
  const age = EOS.ageHours(patient);
  const ageClamped = Math.min(age, MAX);
  const all = EOS.vitalsFor(patient.hn, vitals);
  const status = EOS.tpStatus(patient, vitals);

  const stroke = Math.max(8, size * 0.05);
  const r = size / 2 - stroke - 4;
  const cx = size / 2, cy = size / 2;
  // We sweep from 135° to 405° (i.e., -45° to 45° clockwise, leaving bottom open)
  const startAngle = 135;
  const endAngle = 405;
  const totalSweep = endAngle - startAngle;

  const angleFor = hr => startAngle + (hr / MAX) * totalSweep;
  const polar = (a, rad = r) => {
    const rrad = (a * Math.PI) / 180;
    return { x: cx + rad * Math.cos(rrad), y: cy + rad * Math.sin(rrad) };
  };

  // Background track full
  const trackStart = polar(startAngle);
  const trackEnd = polar(endAngle);
  const trackLarge = totalSweep > 180 ? 1 : 0;
  const trackD = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${trackLarge} 1 ${trackEnd.x} ${trackEnd.y}`;

  // Segments
  const segments = useMemoUtils(() => {
    const bounds = [0, ...TPS.map(t => OFF[t])];
    const segs = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const fromHr = bounds[i], toHr = bounds[i + 1];
      const tp = TPS[i];
      const rec = all.find(v => v.ageHr === tp);
      const isAlert = rec && EOS.evalVitals(rec).some(x => x.sev === 'red');
      const isDone = !!rec;
      const isOverdue = !rec && age > toHr + 1;
      const isDue = !rec && age >= toHr - 0.5 && age <= toHr + 1;
      const isFuture = !rec && age < toHr - 0.5;
      let color = 'var(--surface-3)';
      if (isAlert) color = 'var(--r)';
      else if (isDone) color = 'var(--g)';
      else if (isOverdue) color = 'var(--r)';
      else if (isDue) color = 'var(--a)';

      const a1 = angleFor(fromHr);
      const a2 = angleFor(toHr);
      const p1 = polar(a1);
      const p2 = polar(a2);
      const large = (a2 - a1) > 180 ? 1 : 0;
      segs.push({
        d: `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`,
        color, tp, future: isFuture,
        a1, a2,
      });
    }
    return segs;
  }, [patient.hn, age, all.length]);

  // Tick labels
  const ticks = TPS.map(tp => {
    const a = angleFor(OFF[tp]);
    const inner = polar(a, r - stroke - 4);
    const outer = polar(a, r + 12);
    const rec = all.find(v => v.ageHr === tp);
    const isAlert = rec && EOS.evalVitals(rec).some(x => x.sev === 'red');
    const isDone = !!rec;
    let dotColor = 'var(--surface-4)';
    let dotStroke = 'var(--line-2)';
    if (isAlert) { dotColor = 'var(--r)'; dotStroke = 'var(--r)'; }
    else if (isDone) { dotColor = 'var(--g)'; dotStroke = 'var(--g)'; }
    else if (status.tp === tp) { dotColor = 'var(--m)'; dotStroke = 'var(--m)'; }
    return { tp, ax: outer.x, ay: outer.y, dx: inner.x, dy: inner.y, dotColor, dotStroke, a };
  });

  // Now-pointer
  const pAngle = angleFor(ageClamped);
  const pTip = polar(pAngle, r);
  const pInner = polar(pAngle, r - stroke - 6);

  const ageParts = EOS.fmtAgeParts(age);
  const showHours = age < 24;

  const centerColor = status.cat === 'overdue' ? 'crit' : status.cat === 'due' ? 'warn' : 'ok';
  const nextLabel = status.tp || (status.cat === 'complete' ? '44/44' : '—');
  const nextPrefix = status.cat === 'overdue' ? 'OVERDUE' :
                     status.cat === 'due' ? 'DUE NOW' :
                     status.cat === 'soon' ? 'SOON' :
                     status.cat === 'complete' ? 'COMPLETE' : 'NEXT';

  return (
    <div className="dial-relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* glow ring (subtle) */}
        <defs>
          <radialGradient id="dial-glow">
            <stop offset="0%" stopColor="var(--m)" stopOpacity=".06"/>
            <stop offset="80%" stopColor="var(--m)" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r * 0.65} fill="url(#dial-glow)"/>

        {/* background track */}
        <path d={trackD} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} strokeLinecap="butt"/>

        {/* segments */}
        {segments.map((s, i) => (
          <path key={i}
            d={s.d}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            opacity={s.future ? 0 : 1}
            style={{ filter: s.color === 'var(--r)' ? 'drop-shadow(0 0 4px var(--r-glow))' : 'none' }}
          />
        ))}

        {/* tick separators between segments */}
        {segments.slice(0, -1).map((s, i) => {
          const inner = polar(s.a2, r - stroke / 2);
          const outer = polar(s.a2, r + stroke / 2);
          return (
            <line key={i}
              x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke="var(--bg)" strokeWidth="2.5"
            />
          );
        })}

        {/* tick dots OUTSIDE */}
        {ticks.map((t, i) => (
          <g key={i}>
            <circle cx={t.ax} cy={t.ay} r={3.5} fill={t.dotColor} stroke={t.dotStroke} strokeWidth="2"/>
          </g>
        ))}

        {/* now-pointer */}
        {age <= MAX && (
          <g>
            <line x1={cx} y1={cy} x2={pInner.x} y2={pInner.y}
              stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" opacity=".6"/>
            <circle cx={pTip.x} cy={pTip.y} r={5} fill="var(--ink)" stroke="var(--bg)" strokeWidth="2"/>
            <circle cx={cx} cy={cy} r={4} fill="var(--ink)"/>
          </g>
        )}

        {/* Tick labels (in monospace) */}
        {ticks.map((t, i) => {
          const labelPos = polar(t.a, r + 26);
          return (
            <text key={i}
              x={labelPos.x} y={labelPos.y}
              textAnchor="middle" dominantBaseline="middle"
              fill="var(--ink-3)"
              fontSize="9.5"
              fontFamily="var(--f-mono), monospace"
              style={{ letterSpacing: '.05em', fontWeight: 600 }}>
              {t.tp.replace(' hr', 'h').replace('-', '–')}
            </text>
          );
        })}
      </svg>

      {showCenter && (
        <div className="dial-center">
          <div className="dial-age">{ageParts.n}</div>
          <div className="dial-unit">{showHours ? 'hours of life' : `days · ${ageParts.unit.split(' ').slice(1).join(' ') || 'old'}`}</div>
          <div className={`dial-next ${centerColor}`}>
            {nextPrefix} · {nextLabel}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// MINI DIAL — for sidebar / small contexts
// ════════════════════════════════════════
function MiniDial({ patient, vitals, size = 38 }) {
  const TPS = EOS.TIMEPOINTS;
  const OFF = EOS.OFFSETS;
  const MAX = 44;
  const age = EOS.ageHours(patient);
  const all = EOS.vitalsFor(patient.hn, vitals);
  const stroke = Math.max(3, size * 0.08);
  const r = size / 2 - stroke - 1;
  const cx = size / 2, cy = size / 2;
  const startAngle = 135, endAngle = 405;
  const angleFor = hr => startAngle + (hr / MAX) * (endAngle - startAngle);
  const polar = (a, rad = r) => {
    const rrad = (a * Math.PI) / 180;
    return { x: cx + rad * Math.cos(rrad), y: cy + rad * Math.sin(rrad) };
  };
  const trackStart = polar(startAngle);
  const trackEnd = polar(endAngle);
  const trackD = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 1 1 ${trackEnd.x} ${trackEnd.y}`;
  const bounds = [0, ...TPS.map(t => OFF[t])];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={trackD} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} strokeLinecap="butt"/>
      {bounds.slice(0, -1).map((from, i) => {
        const to = bounds[i + 1];
        const tp = TPS[i];
        const rec = all.find(v => v.ageHr === tp);
        const isAlert = rec && EOS.evalVitals(rec).some(x => x.sev === 'red');
        const isDone = !!rec;
        const isOverdue = !rec && age > to + 1;
        let color = 'transparent';
        if (isAlert || isOverdue) color = 'var(--r)';
        else if (isDone) color = 'var(--g)';
        if (color === 'transparent') return null;
        const a1 = angleFor(from), a2 = angleFor(to);
        const p1 = polar(a1), p2 = polar(a2);
        return <path key={i} d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`}
                     fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="butt"/>;
      })}
      {age <= MAX && (
        <circle cx={polar(angleFor(age)).x} cy={polar(angleFor(age)).y} r={Math.max(2, size * 0.05)}
                fill="var(--ink)" stroke="var(--bg)" strokeWidth="1.5"/>
      )}
    </svg>
  );
}

// ════════════════════════════════════════
// TIMELINE STRIP — 7-cell row of cells
// ════════════════════════════════════════
function TimelineStrip({ patient, vitals }) {
  const TPS = EOS.TIMEPOINTS;
  const OFF = EOS.OFFSETS;
  const age = EOS.ageHours(patient);
  const all = EOS.vitalsFor(patient.hn, vitals);
  const status = EOS.tpStatus(patient, vitals);
  return (
    <div className="tl-strip">
      {TPS.map(tp => {
        const rec = all.find(v => v.ageHr === tp);
        const off = OFF[tp];
        const isAlert = rec && EOS.evalVitals(rec).some(x => x.sev === 'red');
        const isDone = !!rec;
        const isOverdue = !rec && age > off + 1;
        const isDue = !rec && age >= off - 0.5 && age <= off + 1;
        const isNext = status.tp === tp && !isOverdue;
        let cls = 'tl-cell';
        if (isAlert || isOverdue) cls += ' crit';
        else if (isDone) cls += ' done';
        else if (isDue) cls += ' due';
        else if (isNext) cls += ' now';
        const label = tp.replace(' hr', '').replace('-', '·');
        return <div key={tp} className={cls} title={tp}>{label}</div>;
      })}
    </div>
  );
}

// ════════════════════════════════════════
// SPARKLINE
// ════════════════════════════════════════
function Spark({ series, w = 56, h = 18, color = 'var(--m)', flag, dots = false, area = false }) {
  if (!series || series.length < 2) {
    return <svg width={w} height={h}><line x1="0" y1={h/2} x2={w} y2={h/2} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="2 2"/></svg>;
  }
  const min = Math.min(...series), max = Math.max(...series);
  const pad = (max - min) * 0.2 || 1;
  const lo = min - pad, hi = max + pad;
  const points = series.map((v, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = h - ((v - lo) / (hi - lo)) * h;
    return [x, y];
  });
  const linePts = points.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const c = flag ? 'var(--r)' : color;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {area && (
        <polygon points={`${linePts} ${w},${h} 0,${h}`} fill={c} opacity=".15"/>
      )}
      <polyline points={linePts} fill="none" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
      {dots && points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === points.length - 1 ? 2.2 : 1.2}
                fill={i === points.length - 1 ? c : 'var(--ink-3)'}/>
      ))}
    </svg>
  );
}

// ════════════════════════════════════════
// VITAL CHIP — single-vital tiny card with sparkline background
// ════════════════════════════════════════
function VitalChip({ vital, vitalKey, vitals, patient }) {
  const r = EOS.RANGES[vitalKey];
  const v = vital?.[vitalKey];
  const flag = v != null && (v < r.lo || v > r.hi);
  const all = EOS.vitalsFor(patient.hn, vitals);
  const series = all.map(x => x[vitalKey]).filter(x => x != null);
  return (
    <div className={`v-chip ${flag ? 'flag' : ''}`}>
      <div className="k">{r.en}</div>
      <div className="vv">{v != null ? (vitalKey === 'T' ? v.toFixed(1) : Math.round(v)) : '—'}</div>
      <div className="sp">
        <Spark series={series} w={70} h={14} color="var(--m)" flag={flag} area/>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// MODAL
// ════════════════════════════════════════
function Modal({ children, onClose, maxWidth = 600 }) {
  useEffectUtils(() => {
    const onKey = e => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { Dial, MiniDial, TimelineStrip, Spark, VitalChip, Modal });


// ──────────────────────────────────────────────────
// PatientV7 (kept for compatibility; PatientV8 is primary)
// ──────────────────────────────────────────────────

// EOS v7 — Patient detail (Cockpit view)

const { useState: useStatePt, useMemo: useMemoPt } = React;

function PatientV7({ patient, patients, vitals, onBack, onEnterVitals, onApproveAbx, onOpenPatient }) {
  if (!patient) return null;
  const all = EOS.vitalsFor(patient.hn, vitals);
  const last = all[all.length - 1];
  const status = EOS.tpStatus(patient, vitals);
  const trends = EOS.evalTrend(patient.hn, vitals);
  const abxPending = all.find(v => EOS.ABX_TPS.has(v.ageHr) && !v.abxApproved);

  const risk = patient.kpRisk ?? 0;
  const riskBand = risk >= 3 ? { c: 'var(--r)', cls: 'crit', label: 'High Risk' }
                  : risk >= 1 ? { c: 'var(--a)', cls: 'warn', label: 'Medium Risk' }
                  : { c: 'var(--g)', cls: 'ok',   label: 'Low Risk' };

  return (
    <div className="page-pad fade-in">
      {/* breadcrumb */}
      <div className="page-head" style={{ marginBottom: 14 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="arrow-left" size={13}/>กลับ Ward
        </button>
      </div>

      {/* COCKPIT LAYOUT */}
      <div className="cockpit">
        {/* LEFT — Identity + risk */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="cp-id">
            <div className="id-row">
              <div className="avatar">{EOS.initials(patient.name)}</div>
              <div className="who">
                <h1>{EOS.initials(patient.name)}</h1>
                <div className="hn">HN {patient.hn} · Mother {EOS.initials(patient.motherName)}</div>
              </div>
            </div>
            <div className="pills">
              <span className="cp-pill">{patient.bed}</span>
              <span className="cp-pill">{EOS.floorLabel(patient.floor)}</span>
              <span className="cp-pill">{patient.sex === 'F' ? '♀ Female' : '♂ Male'}</span>
              {patient.intake?.chorio && <span className="cp-pill crit">Chorioamnionitis</span>}
              {patient.intake?.maternalFever === 'yes' && <span className="cp-pill warn">Maternal fever</span>}
            </div>
            <div className="cp-stats">
              <span className="l">GA</span><span className="v n">{EOS.fmtGA(patient.ga, patient.gaDays)}</span>
              <span className="l">BW</span><span className="v n">{patient.bw} g</span>
              <span className="l">ROM</span><span className={`v n ${patient.intake?.rom >= 18 ? 'flag' : ''}`}>{patient.intake?.rom}h</span>
              <span className="l">GBS</span><span className="v" style={{ color: patient.intake?.gbs === 'pos' ? 'var(--r)' : patient.intake?.gbs === 'neg' ? 'var(--g)' : 'var(--ink-2)' }}>{(patient.intake?.gbs || '—').toUpperCase()}</span>
              <span className="l">IAP</span><span className="v" style={{ fontSize: 12 }}>{patient.intake?.iap || 'none'}</span>
              {patient.intake?.maternalFever === 'yes' && (
                <>
                  <span className="l">Maternal T°</span>
                  <span className="v" style={{ color: 'var(--r)' }}>{patient.intake.fever?.toFixed(1)}°C</span>
                </>
              )}
            </div>
          </div>

          {/* KP RISK */}
          <div className="risk-card">
            <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>KP 2024 Risk</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
              <div className="risk-num n" style={{ color: riskBand.c }}>{risk.toFixed(2)}</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--f-mono)' }}>/ 1,000</div>
            </div>
            <span className="risk-band" style={{ background: riskBand.c + '22', color: riskBand.c }}>{riskBand.label}</span>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              {riskBand.cls === 'crit' ? 'พิจารณาให้ Empiric ATB + ส่ง H/C'
               : riskBand.cls === 'warn' ? 'Enhanced obs · Serial PE q4–6h × 24–36h'
               : 'Routine well-baby care'}
            </div>
          </div>
        </div>

        {/* CENTER — Dial + instrument vitals */}
        <div>
          <div className="dial-wrap">
            <Dial patient={patient} vitals={vitals} size={300}/>
            {status.tp ? (
              <button className="btn btn-pri btn-lg" style={{ marginTop: 18, minWidth: 240 }}
                onClick={() => onEnterVitals(patient, status.tp)}>
                <Icon name="plus" size={16}/>บันทึก Serial PE · {status.tp}
              </button>
            ) : (
              <button className="btn btn-success btn-lg" style={{ marginTop: 18, minWidth: 240 }} disabled>
                <Icon name="check" size={16}/>เสร็จสมบูรณ์ 44/44
              </button>
            )}
          </div>

          {/* ABX banner */}
          {abxPending && (
            <div className="abx-banner" style={{ marginTop: 14, marginBottom: 0 }}>
              <div className="ico"><Icon name="abx" size={20}/></div>
              <div className="body">
                <div className="t">ABX Time-Out · {abxPending.ageHr}</div>
                <div className="d">ตัดสินใจหยุด/ต่อ antibiotic ภายใน 1 ชั่วโมง</div>
              </div>
              <button className="btn btn-success btn-sm" onClick={() => onApproveAbx(abxPending.ts, 'stop', EOS.initials(patient.name))}>
                <Icon name="check" size={13}/>หยุด ATB
              </button>
              <button className="btn btn-warn btn-sm" onClick={() => onApproveAbx(abxPending.ts, 'continue', EOS.initials(patient.name))}>
                <Icon name="arrow-right" size={13}/>ต่อ ATB
              </button>
            </div>
          )}

          {/* INSTRUMENT GAUGES */}
          {last && (
            <>
              <div className="section-lbl" style={{ marginTop: 22 }}>
                <Icon name="pulse" size={12}/>Vital Signs · ล่าสุดที่ {last.ageHr} · {EOS.fmtTime(last.ts)}
                <div className="ln"/>
              </div>
              <div className="gauges">
                {['T','P','R','SpO2'].map(k => <GaugeV7 key={k} vital={last} vitalKey={k} vitals={vitals} patient={patient}/>)}
              </div>
            </>
          )}

          {/* TIMELINE */}
          <div className="section-lbl" style={{ marginTop: 22 }}>
            <Icon name="clock" size={12}/>Serial PE Timeline
            <div className="ln"/>
          </div>
          <div className="timeline">
            {EOS.TIMEPOINTS.map(tp => {
              const rec = all.find(v => v.ageHr === tp);
              const off = EOS.OFFSETS[tp];
              const age = EOS.ageHours(patient);
              const isNext = status.tp === tp;
              const isAlert = rec && EOS.evalVitals(rec).some(x => x.sev === 'red');
              const isDone = !!rec;
              const isOverdue = !rec && age > off + 1;
              const isDue = !rec && age >= off - 0.5;
              let cls = 'tl-event';
              if (isAlert) cls += ' crit';
              else if (isDone) cls += ' done';
              else if (isOverdue || isDue) cls += ' due';
              if (isNext && !isDone) cls += ' now';
              return (
                <div key={tp} className={cls}>
                  <div>
                    <div className="when n">{tp}</div>
                    <div className="when-thai">
                      {rec ? EOS.fmtTime(rec.ts) : isOverdue ? `+${(age - off).toFixed(1)}h late` : isDue ? 'due now' : `${(off - age).toFixed(1)}h away`}
                    </div>
                  </div>
                  <div className="dot"/>
                  <div className="tl-body">
                    <div className={`head ${isAlert ? 'crit' : ''}`}>
                      {rec ? (isAlert ? '⚠ พบความผิดปกติ' : 'บันทึกแล้ว') : isOverdue ? 'รอบันทึก · เลยกำหนด' : isDue ? 'รอบันทึก' : 'ยังไม่ถึงเวลา'}
                    </div>
                    {rec && <div className="who">โดย {rec.by}</div>}
                    {rec && (
                      <div className="vitals">
                        {['T','P','R','SpO2'].map(k => {
                          const r = EOS.RANGES[k];
                          const val = rec[k];
                          if (val == null) return null;
                          const flag = val < r.lo || val > r.hi;
                          return (
                            <span key={k} className={`tl-v ${flag ? 'flag' : ''}`}>
                              <span className="k">{r.en}</span>
                              <span className="v">{k === 'T' ? val.toFixed(1) : Math.round(val)}</span>
                            </span>
                          );
                        })}
                        {rec.skin && rec.skin !== 'Rosy' && (
                          <span className="tl-v flag"><span className="k">skin</span><span className="v">{rec.skin}</span></span>
                        )}
                        {rec.rd?.length > 0 && (
                          <span className="tl-v flag"><span className="k">RD</span><span className="v">{rec.rd.join(', ')}</span></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Watch list (all babies as tiny cards) */}
        <div>
          <div className="watch">
            <h3><Icon name="patients" size={12}/>Watch List · {patients.length}</h3>
            {patients.map(p => {
              const a = EOS.vitalsFor(p.hn, vitals);
              const lastV = a[a.length - 1];
              const hasAl = lastV && EOS.evalVitals(lastV).some(x => x.sev === 'red');
              const st = EOS.tpStatus(p, vitals);
              let cls = 'watch-baby';
              if (p.hn === patient.hn) cls += ' active';
              if (hasAl || st.cat === 'overdue') cls += ' crit';
              else if (st.cat === 'due' || st.cat === 'soon') cls += ' warn';
              else if (st.cat === 'complete') cls += ' ok';
              return (
                <div key={p.hn} className={cls} onClick={() => onOpenPatient(p.hn)}>
                  <div className="watch-init">{EOS.initials(p.name)}</div>
                  <div className="meta">
                    <div className="b">{EOS.initials(p.name)} <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 11 }}>· {p.bed}</span></div>
                    <div className="l">
                      {hasAl ? 'alert' : st.cat === 'overdue' ? `+${st.hoursLate?.toFixed(1)}h late` : st.tp ? `next ${st.tp}` : st.cat === 'complete' ? '44/44 ✓' : '—'}
                    </div>
                  </div>
                  <MiniDial patient={p} vitals={vitals} size={28}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────── INSTRUMENT GAUGE ────────
function GaugeV7({ vital, vitalKey, vitals, patient }) {
  const r = EOS.RANGES[vitalKey];
  const v = vital?.[vitalKey];
  const flag = v != null && (v < r.lo || v > r.hi);
  const all = EOS.vitalsFor(patient.hn, vitals);
  const series = all.map(x => x[vitalKey]).filter(x => x != null);

  // Range visualization
  const fullMin = r.hardLo - (r.hardHi - r.hardLo) * 0.1;
  const fullMax = r.hardHi + (r.hardHi - r.hardLo) * 0.1;
  const ptrPct = v != null ? Math.max(0, Math.min(100, ((v - fullMin) / (fullMax - fullMin)) * 100)) : 50;
  const safeStart = ((r.lo - fullMin) / (fullMax - fullMin)) * 100;
  const safeEnd = ((r.hi - fullMin) / (fullMax - fullMin)) * 100;

  return (
    <div className={`gauge ${flag ? 'flag' : ''}`}>
      <div className="gauge-head">
        <Icon name={({ T: 'thermo', P: 'heart', R: 'lungs', SpO2: 'drop' })[vitalKey]} size={14}/>
        <div className="gauge-name">{r.en}</div>
        <div className="gauge-thai">{r.label}</div>
      </div>
      <div>
        <span className="gauge-val n">{v != null ? (vitalKey === 'T' ? v.toFixed(1) : Math.round(v)) : '—'}</span>
        <span className="gauge-unit">{r.unit}</span>
      </div>
      <div className="gauge-range">เกณฑ์ {r.lo}–{r.hi}</div>
      <div className="gauge-bar">
        <div className="safe" style={{ left: safeStart + '%', width: (safeEnd - safeStart) + '%' }}/>
        {v != null && <div className="ptr" style={{ left: ptrPct + '%' }}/>}
      </div>
      <div className="gauge-spark">
        {series.length > 1 && <Spark series={series} w={200} h={28} color="var(--m)" flag={flag} dots area/>}
      </div>
    </div>
  );
}

Object.assign(window, { PatientV7, GaugeV7 });
