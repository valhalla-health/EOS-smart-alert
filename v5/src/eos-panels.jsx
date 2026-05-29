// EOS v7 — Calculator, Triage, Alerts, ABX, VitalsEntry, PhoneHome, PinModal

const { useState: useStateScr, useMemo: useMemoScr, useEffect: useEffectScr, useRef: useRefScr } = React;

// ════════════════════════════════════════
// CALCULATOR — Animated Bayesian gauge
// ════════════════════════════════════════
function CalculatorV7({ onCancel }) {
  const [inc, setInc] = useStateScr(0.5);
  const [ga, setGa] = useStateScr('39');
  const [tempMax, setTempMax] = useStateScr('<37.5');
  const [rom, setRom] = useStateScr('6-12');
  const [gbs, setGbs] = useStateScr('unk');
  const [iap, setIap] = useStateScr('none');
  const [exam, setExam] = useStateScr('well');

  const result = useMemoScr(() => EOS.KP.compute({ incidence: inc, ga, tempMax, rom, gbs, iap }), [inc, ga, tempMax, rom, gbs, iap]);
  const finalRisk = useMemoScr(() => EOS.KP.applyExam(result.posteriorPer1k, exam), [result, exam]);

  const band = finalRisk >= 3 ? { c: 'var(--r)', label: 'High Risk', action: 'พิจารณาให้ Empiric Antibiotics + ส่ง H/C' }
              : finalRisk >= 1 ? { c: 'var(--a)', label: 'Medium Risk', action: 'Enhanced obs · Serial PE q4–6h' }
              : { c: 'var(--g)', label: 'Low Risk', action: 'Routine well-baby care' };

  // log-scale gauge (0.05 .. 30)
  const gMin = 0.05, gMax = 30;
  const logPos = v => Math.log(Math.max(gMin, Math.min(gMax, v)) / gMin) / Math.log(gMax / gMin);
  const arcPct = logPos(finalRisk);
  const circ = 2 * Math.PI * 92;

  return (
    <div className="page-pad fade-in">
      <div className="page-head">
        <button className="btn btn-ghost btn-sm" onClick={onCancel}><Icon name="arrow-left" size={13}/>กลับ</button>
        <div style={{ flex: 1 }}>
          <h1>EOS Risk Estimator</h1>
          <div className="sub">Bayesian approximation of KP 2024 model · ≥34 wk GA · <b style={{ color: 'var(--a)' }}>simplified</b></div>
        </div>
      </div>

      <EbmDisclaimer/>

      <div className="calc-grid">
        <div>
          <StepCard num={1} q="อุบัติการณ์ในพื้นที่ (Incidence)" sub="Baseline per 1,000 live births">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <input type="range" min="0.1" max="2.0" step="0.1" value={inc}
                onChange={e => setInc(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--m)' }}/>
              <div className="n" style={{ minWidth: 50, fontSize: 18, fontWeight: 700, textAlign: 'right' }}>{inc.toFixed(1)}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>/1k</div>
            </div>
          </StepCard>

          <StepCard num={2} q="อายุครรภ์ (Gestational Age)" sub="สัปดาห์">
            <div className="chip-row">
              {['34','35','36','37','38','39','40','41+'].map(g => (
                <button key={g} className={`chip ${ga === g ? 'on' : ''} ${ga === g && (g === '34' || g === '35') ? 'warn' : ''}`}
                  onClick={() => setGa(g)}>{g} wk</button>
              ))}
            </div>
          </StepCard>

          <StepCard num={3} q="ไข้มารดาสูงสุดในช่วงคลอด" sub="Highest intrapartum maternal temp (°C)">
            <div className="chip-row">
              {[{ v: '<37.5', l: '< 37.5' }, { v: '37.5-38.0', l: '37.5–38.0' }, { v: '38.0-38.5', l: '38.0–38.5' }, { v: '38.5-39.0', l: '38.5–39.0' }, { v: '≥39.0', l: '≥ 39.0' }].map(o => (
                <button key={o.v} className={`chip ${tempMax === o.v ? 'on' : ''} ${tempMax === o.v && (o.v === '≥39.0' || o.v === '38.5-39.0') ? 'danger' : tempMax === o.v && o.v !== '<37.5' ? 'warn' : ''}`}
                  onClick={() => setTempMax(o.v)}>{o.l}</button>
              ))}
            </div>
          </StepCard>

          <StepCard num={4} q="ระยะเวลาน้ำเดิน (ROM)" sub="ก่อนคลอด">
            <div className="chip-row">
              {[['0-6','0–6 hr'],['6-12','6–12 hr'],['12-18','12–18 hr'],['18-24','18–24 hr'],['>24','> 24 hr']].map(([v, l]) => (
                <button key={v} className={`chip ${rom === v ? 'on' : ''} ${rom === v && (v === '18-24' || v === '>24') ? 'warn' : ''}`}
                  onClick={() => setRom(v)}>{l}</button>
              ))}
            </div>
          </StepCard>

          <StepCard num={5} q="GBS Status" sub="Maternal Group B Streptococcus">
            <div className="chip-row">
              <button className={`chip ${gbs === 'neg' ? 'on success' : ''}`} onClick={() => setGbs('neg')}>Negative</button>
              <button className={`chip ${gbs === 'unk' ? 'on' : ''}`} onClick={() => setGbs('unk')}>Unknown</button>
              <button className={`chip ${gbs === 'pos' ? 'on danger' : ''}`} onClick={() => setGbs('pos')}>Positive</button>
            </div>
          </StepCard>

          <StepCard num={6} q="Antibiotic ก่อนคลอด (IAP)" sub="Intrapartum prophylaxis adequacy">
            <div className="chip-row">
              {[['broad-spec-≥4hr','Broad-spec ≥4hr (adequate)'],['broad-spec-<4hr','Broad-spec <4hr'],['gbs-spec-≥2hr','GBS-spec ≥2hr'],['gbs-spec-<2hr','GBS-spec <2hr'],['none','None / Inadequate']].map(([v, l]) => (
                <button key={v} className={`chip ${iap === v ? 'on' : ''} ${iap === v && v === 'none' ? 'warn' : ''} ${iap === v && (v === 'broad-spec-≥4hr' || v === 'gbs-spec-≥2hr') ? 'success' : ''}`}
                  onClick={() => setIap(v)}>{l}</button>
              ))}
            </div>
          </StepCard>

          <StepCard num={7} q="ตรวจร่างกายทารก (Clinical Exam)" sub="หลังคลอด · modifies posterior with LR">
            <div className="chip-row">
              <button className={`chip ${exam === 'well' ? 'on success' : ''}`} onClick={() => setExam('well')}>Well-appearing</button>
              <button className={`chip ${exam === 'equivocal' ? 'on warn' : ''}`} onClick={() => setExam('equivocal')}>Equivocal</button>
              <button className={`chip ${exam === 'clinical-illness' ? 'on danger' : ''}`} onClick={() => setExam('clinical-illness')}>Clinical illness</button>
            </div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>
              LR: well ×0.41 · equivocal ×5.0 · ill ×21.5
            </div>
          </StepCard>
        </div>

        {/* RIGHT — GAUGE + BAYES TRACE */}
        <div className="calc-gauge">
          <div className="calc-gauge-title">Final EOS Risk</div>
          <div className="calc-gauge-svg-wrap">
            <svg width="240" height="240" viewBox="0 0 240 240">
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--g)"/>
                  <stop offset="33%" stopColor="var(--g)"/>
                  <stop offset="50%" stopColor="var(--a)"/>
                  <stop offset="100%" stopColor="var(--r)"/>
                </linearGradient>
              </defs>
              <circle cx="120" cy="120" r="92" fill="none" stroke="var(--surface-3)" strokeWidth="16"/>
              <circle cx="120" cy="120" r="92" fill="none"
                stroke="url(#rg)" strokeWidth="16" strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - arcPct)}
                transform="rotate(-90 120 120)"
                style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.4,0,.2,1)' }}/>
              {/* needle */}
              {(() => {
                const angle = -90 + arcPct * 360;
                const rad = (angle * Math.PI) / 180;
                const x = 120 + 80 * Math.cos(rad);
                const y = 120 + 80 * Math.sin(rad);
                return <line x1="120" y1="120" x2={x} y2={y} stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" opacity=".4"/>;
              })()}
            </svg>
            <div className="calc-gauge-center">
              <div className="calc-gauge-num n" style={{ color: band.c }}>{finalRisk.toFixed(2)}</div>
              <div className="calc-gauge-per">per 1,000</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 6 }}>
            <span className="risk-band" style={{ background: band.c + '22', color: band.c, padding: '6px 14px', fontSize: 12 }}>
              <Icon name={band.c === 'var(--r)' ? 'warn' : band.c === 'var(--a)' ? 'eye' : 'check'} size={13}/>
              {band.label}
            </span>
          </div>
          <div style={{ marginTop: 12, padding: 12, background: band.c + '14', border: `1px solid ${band.c}44`, borderRadius: 10, fontSize: 12.5, lineHeight: 1.5 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--f-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: band.c, marginBottom: 4 }}>คำแนะนำ</div>
            {band.action}
          </div>

          <div style={{ fontSize: 10, fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '18px 0 8px' }}>How we got here</div>
          <div className="bayes-row"><span className="k">Baseline per 1k</span><span className="lr">{result.priorPer1k.toFixed(2)}</span></div>
          {result.factors.map((f, i) => (
            <div key={i} className="bayes-row">
              <span className="k">{f.label}: {String(f.value)}</span>
              <span className={`lr ${f.lr > 1.05 ? 'up' : f.lr < 0.95 ? 'down' : ''}`}>×{f.lr.toFixed(2)}</span>
            </div>
          ))}
          <div className="bayes-row"><span className="k" style={{ fontWeight: 600 }}>Pre-exam posterior</span><span className="lr" style={{ fontWeight: 700 }}>{result.posteriorPer1k.toFixed(2)}</span></div>
          <div className="bayes-row">
            <span className="k">Exam: {exam.replace('-', ' ')}</span>
            <span className={`lr ${finalRisk > result.posteriorPer1k * 1.05 ? 'up' : 'down'}`}>→ {finalRisk.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <EvidencePanel/>
    </div>
  );
}

function StepCard({ num, q, sub, children }) {
  return (
    <div className="calc-step done">
      <div className="head">
        <div className="num">{num}</div>
        <div>
          <div className="q">{q}</div>
          {sub && <div className="qsub">{sub}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════
// VITALS ENTRY — Big number pad, live abnormal flag
// ════════════════════════════════════════
function VitalsEntryV7({ patient, ageHr, onSave, onCancel }) {
  const fields = ['T', 'P', 'R', 'SpO2'];
  const [vals, setVals] = useStateScr({});
  const [skin, setSkin] = useStateScr('Rosy');
  const [rd, setRd] = useStateScr([]);
  const [step, setStep] = useStateScr(0);
  const [text, setText] = useStateScr('');

  const currentKey = fields[step];
  const range = currentKey ? EOS.RANGES[currentKey] : null;
  const numericText = text.replace(/[^0-9.]/g, '');
  const numericVal = numericText === '' ? null : parseFloat(numericText);
  const isAlert = numericVal != null && range && (numericVal < range.lo || numericVal > range.hi);
  const isCritical = numericVal != null && range && (numericVal < range.hardLo || numericVal > range.hardHi);

  const next = () => {
    if (currentKey && numericVal != null) setVals(v => ({ ...v, [currentKey]: numericVal }));
    setText('');
    if (step < fields.length - 1) setStep(step + 1);
    else setStep(fields.length);
  };
  const back = () => { setText(''); setStep(Math.max(0, step - 1)); };
  const onKey = k => {
    if (k === '⌫') setText(t => t.slice(0, -1));
    else if (k === 'skip') next();
    else if (k === '.' && text.includes('.')) return;
    else setText(t => (t + k).slice(0, 5));
  };

  const finish = () => {
    const final = { ...vals };
    if (currentKey && numericVal != null) final[currentKey] = numericVal;
    onSave({
      ts: EOS.nowISO(),
      hn: patient.hn,
      ageHr,
      ...final,
      skin,
      rd,
      by: 'พ.ยานี (Demo)',
    });
  };

  return (
    <div className="modal-bg">
      <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span className="cp-pill info">{ageHr}</span>
          <h2 style={{ margin: 0 }}>บันทึก Serial PE</h2>
          <button className="ico-btn" style={{ marginLeft: 'auto' }} onClick={onCancel}><Icon name="x" size={16}/></button>
        </div>
        <div className="sub" style={{ marginBottom: 14 }}>
          {EOS.initials(patient.name)} · {patient.bed} · GA {EOS.fmtGA(patient.ga, patient.gaDays)} · BW {patient.bw}g
        </div>

        {/* progress */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 22 }}>
          {fields.map((f, i) => (
            <div key={f} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i < step ? 'var(--g)' : i === step ? 'var(--m)' : 'var(--surface-3)',
              transition: 'background .2s',
            }}/>
          ))}
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: step >= fields.length ? 'var(--m)' : 'var(--surface-3)' }}/>
        </div>

        {step < fields.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
                {range.label} · {range.en}
              </div>
              <div className={`big-num-display ${isAlert ? 'flag' : ''}`}>
                <div>
                  <span className="n">{text || '—'}</span>
                  <span className="u">{range.unit}</span>
                </div>
                <div className="range">เกณฑ์ {range.lo}–{range.hi}</div>
                {isAlert && (
                  <div className="alert">
                    <Icon name="warn" size={13}/>
                    {isCritical ? 'ค่าผิดปกติร้ายแรง' : 'นอกช่วงปกติ'}
                  </div>
                )}
              </div>
            </div>
            <div className="npad">
              {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
                <button key={k} className={k === '⌫' ? 'fn' : ''} onClick={() => onKey(k)}>{k}</button>
              ))}
              <button className="fn" onClick={() => onKey('skip')}>ข้าม</button>
              <button className="ok" style={{ gridColumn: 'span 2' }} onClick={next}>ถัดไป →</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 600 }}>สีผิว · Skin colour</label>
              <div className="chip-row">
                {EOS.SKIN_OPTS.map(s => (
                  <button key={s} className={`chip ${skin === s ? 'on' : ''} ${s === 'Cyanotic' || s === 'Marbled' ? 'danger' : s === 'Pale' ? 'warn' : ''}`}
                    onClick={() => setSkin(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 600 }}>หายใจลำบาก · Respiratory distress</label>
              <div className="chip-row">
                {EOS.RD_OPTS.map(r => (
                  <button key={r} className={`chip ${rd.includes(r) ? 'on danger' : ''}`}
                    onClick={() => setRd(arr => arr.includes(r) ? arr.filter(x => x !== r) : [...arr, r])}>
                    {rd.includes(r) && <Icon name="check" size={11}/>} {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ background: 'var(--surface-2)', marginTop: 18 }}>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>สรุปก่อนบันทึก</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {fields.map(f => (
                  <div key={f}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>{EOS.RANGES[f].en}</div>
                    <div className="n" style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                      {vals[f] != null ? (f === 'T' ? vals[f].toFixed(1) : Math.round(vals[f])) : '—'}
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 3, fontWeight: 500 }}>{EOS.RANGES[f].unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          {step > 0 && <button className="btn btn-ghost" onClick={back}><Icon name="arrow-left" size={13}/>ย้อนกลับ</button>}
          <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
          {step < fields.length ? (
            <button className="btn btn-pri" onClick={next}>ถัดไป<Icon name="arrow-right" size={13}/></button>
          ) : (
            <button className="btn btn-pri btn-lg" onClick={finish}><Icon name="check" size={14}/>บันทึก</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// ALERTS CENTER
// ════════════════════════════════════════
function AlertsV7({ patients, vitals, onOpenPatient, onBack }) {
  const [filter, setFilter] = useStateScr('all');
  const [dismissed, setDismissed] = useStateScr(() => new Set());

  const alerts = useMemoScr(() => {
    const list = [];
    patients.forEach(p => {
      const all = EOS.vitalsFor(p.hn, vitals);
      const last = all[all.length - 1];
      const status = EOS.tpStatus(p, vitals);
      if (last) {
        const issues = EOS.evalVitals(last).filter(i => i.sev === 'red');
        issues.forEach(i => {
          list.push({
            id: `${p.hn}-${last.ts}-${i.k}`,
            tier: 'crit',
            title: `${EOS.initials(p.name)} · ${i.k} ${typeof i.val === 'number' ? i.val.toFixed(1) : i.val}`,
            desc: `${p.bed} · ${EOS.floorLabel(p.floor)} · ค่าผิดปกติที่ ${last.ageHr}`,
            when: EOS.fmtTime(last.ts), hn: p.hn, icon: 'warn',
          });
        });
      }
      if (status.cat === 'overdue') {
        list.push({
          id: `${p.hn}-overdue`,
          tier: 'warn',
          title: `${EOS.initials(p.name)} · เลย ${status.tp}`,
          desc: `${p.bed} · เลยกำหนด ${status.hoursLate?.toFixed(1)} ชั่วโมง`,
          when: EOS.fmtAge(EOS.ageHours(p)), hn: p.hn, icon: 'clock',
        });
      }
      const trends = EOS.evalTrend(p.hn, vitals);
      trends.forEach((t, i) => {
        list.push({
          id: `${p.hn}-trend-${i}`,
          tier: 'warn',
          title: `${EOS.initials(p.name)} · Trend ผิดปกติ`,
          desc: `${p.bed} · ${t.txt}`,
          when: last ? EOS.fmtTime(last.ts) : '—', hn: p.hn, icon: 'arrow-up',
        });
      });
      all.forEach(v => {
        if (EOS.ABX_TPS.has(v.ageHr) && !v.abxApproved) {
          list.push({
            id: `${p.hn}-abx-${v.ts}`,
            tier: 'info',
            title: `${EOS.initials(p.name)} · ABX Time-Out`,
            desc: `${p.bed} · รอแพทย์ตัดสินใจที่ ${v.ageHr}`,
            when: EOS.fmtTime(v.ts), hn: p.hn, icon: 'abx',
          });
        }
      });
    });
    return list.filter(a => !dismissed.has(a.id));
  }, [patients, vitals, dismissed]);

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.tier === filter);
  const counts = {
    all: alerts.length, crit: alerts.filter(a => a.tier === 'crit').length,
    warn: alerts.filter(a => a.tier === 'warn').length, info: alerts.filter(a => a.tier === 'info').length,
  };

  return (
    <div className="page-pad fade-in">
      <div className="page-head">
        <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon name="arrow-left" size={13}/>กลับ</button>
        <div style={{ flex: 1 }}>
          <h1>Alerts</h1>
          <div className="sub">{alerts.length} active · เรียงตามความสำคัญ</div>
        </div>
        <div className="floor-tabs" style={{ marginBottom: 0 }}>
          {[['all','All',counts.all],['crit','Critical',counts.crit],['warn','Warn',counts.warn],['info','Info',counts.info]].map(([v,l,c]) => (
            <button key={v} className={`f-tab ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>
              <span>{l}</span><span className="ct">{c}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--g-tint)', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
            <Icon name="check" size={24} color="var(--g)"/>
          </div>
          <h2 style={{ marginTop: 16, fontSize: 18 }}>ไม่มี alert</h2>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>ทุกอย่างเรียบร้อย</div>
        </div>
      ) : (
        <div>
          {filtered.map(a => (
            <div key={a.id} className={`alert-row ${a.tier}`} onClick={() => onOpenPatient(a.hn)}>
              <div className="alert-ico"><Icon name={a.icon} size={16}/></div>
              <div className="alert-body">
                <div className="title">{a.title}</div>
                <div className="desc">{a.desc}</div>
                <div className="meta">
                  <span><Icon name="clock" size={10}/> {a.when}</span>
                  <span>·</span>
                  <span style={{ color: a.tier === 'crit' ? 'var(--r)' : a.tier === 'warn' ? 'var(--a)' : 'var(--m)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {a.tier === 'crit' ? 'Critical' : a.tier === 'warn' ? 'Warning' : 'Info'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-soft btn-sm" onClick={e => { e.stopPropagation(); setDismissed(s => new Set([...s, a.id])); }}>
                  <Icon name="bell-off" size={11}/>Snooze
                </button>
                <button className="btn btn-pri btn-sm" onClick={e => { e.stopPropagation(); onOpenPatient(a.hn); }}>
                  ดู<Icon name="arrow-right" size={11}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// ABX APPROVAL CENTER
// ════════════════════════════════════════
function AbxV7({ patients, vitals, onApprove, onBack }) {
  const pending = useMemoScr(() => {
    const list = [];
    patients.forEach(p => {
      const all = EOS.vitalsFor(p.hn, vitals);
      all.forEach(v => {
        if (EOS.ABX_TPS.has(v.ageHr) && !v.abxApproved) list.push({ patient: p, vital: v });
      });
    });
    return list;
  }, [patients, vitals]);

  const [idx, setIdx] = useStateScr(0);
  const item = pending[idx];

  if (pending.length === 0) {
    return (
      <div className="page-pad fade-in">
        <div className="page-head">
          <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon name="arrow-left" size={13}/>กลับ</button>
          <div><h1>ABX Approval</h1><div className="sub">ตัดสินใจหยุดหรือต่อ antibiotic</div></div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--g-tint)', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
            <Icon name="check" size={28} color="var(--g)"/>
          </div>
          <h2 style={{ marginTop: 16 }}>ไม่มีคำขอที่รอ</h2>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>ABX time-outs ทั้งหมดได้รับการตัดสินใจแล้ว</div>
        </div>
      </div>
    );
  }

  if (!item) return null;
  const { patient, vital } = item;
  const all = EOS.vitalsFor(patient.hn, vitals);

  return (
    <div className="page-pad fade-in">
      <div className="page-head">
        <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon name="arrow-left" size={13}/>กลับ</button>
        <div style={{ flex: 1 }}>
          <h1>ABX Approval</h1>
          <div className="sub">{idx + 1} / {pending.length} · ตัดสินใจหยุดหรือต่อ antibiotic</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {idx > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setIdx(idx - 1)}><Icon name="arrow-left" size={13}/>Prev</button>}
          {idx < pending.length - 1 && <button className="btn btn-ghost btn-sm" onClick={() => setIdx(idx + 1)}>Next<Icon name="arrow-right" size={13}/></button>}
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <span className="cp-pill warn">ABX TIME-OUT · {vital.ageHr}</span>
            <span className="cp-pill">{patient.bed}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 'auto', fontFamily: 'var(--f-mono)' }}>HN {patient.hn}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <div className="avatar" style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, var(--m), var(--m-2))', color: '#061814', display: 'grid', placeItems: 'center', font: '700 22px var(--f-sans)', letterSpacing: '-.03em' }}>
              {EOS.initials(patient.name)}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 28, letterSpacing: '-.025em' }}>{EOS.initials(patient.name)}</h2>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'var(--f-mono)' }}>
                Mother {EOS.initials(patient.motherName)} · {EOS.floorLabel(patient.floor)} · GA {EOS.fmtGA(patient.ga, patient.gaDays)} · BW {patient.bw}g
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
            <div>
              <div className="section-lbl" style={{ margin: '0 0 8px' }}>Latest Vitals · {vital.ageHr}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {['T','P','R','SpO2'].map(k => {
                  const r = EOS.RANGES[k];
                  const v = vital[k];
                  const flag = v != null && (v < r.lo || v > r.hi);
                  return (
                    <div key={k} style={{ padding: '10px 12px', borderRadius: 10, background: flag ? 'var(--r-tint)' : 'var(--surface-2)', border: `1px solid ${flag ? 'var(--r-2)' : 'var(--line)'}` }}>
                      <div style={{ fontSize: 10.5, color: flag ? 'var(--r)' : 'var(--ink-3)', fontFamily: 'var(--f-mono)', letterSpacing: '.08em' }}>{r.en}</div>
                      <div className="n" style={{ fontSize: 22, fontWeight: 700, color: flag ? 'var(--r)' : 'var(--ink)', marginTop: 2 }}>
                        {v != null ? (k === 'T' ? v.toFixed(1) : Math.round(v)) : '—'}
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, marginLeft: 3 }}>{r.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="section-lbl" style={{ margin: '0 0 8px' }}>Pre-test Risk Factors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <RiskRow label="KP risk" value={`${patient.kpRisk?.toFixed(2)}/1k`} flag={patient.kpRisk >= 1}/>
                <RiskRow label="GA" value={EOS.fmtGA(patient.ga, patient.gaDays)} flag={patient.ga < 37}/>
                <RiskRow label="GBS" value={(patient.intake?.gbs || '—').toUpperCase()} flag={patient.intake?.gbs === 'pos'}/>
                <RiskRow label="ROM" value={`${patient.intake?.rom}h`} flag={patient.intake?.rom >= 18}/>
                <RiskRow label="Maternal fever" value={patient.intake?.maternalFever === 'yes' ? `${patient.intake.fever}°C` : 'no'} flag={patient.intake?.maternalFever === 'yes'}/>
                <RiskRow label="Chorio" value={patient.intake?.chorio ? 'yes' : 'no'} flag={patient.intake?.chorio}/>
              </div>
            </div>
          </div>

          {/* labs */}
          {patient.labs && (
            <>
              <div className="section-lbl" style={{ margin: '0 0 8px' }}>Laboratory</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                <LabCard title="CBC" labels={[
                  ['WBC', patient.labs.cbc?.wbc, '×10³/μL', v => v != null && (v < 5 || v > 30)],
                  ['ANC', patient.labs.cbc?.anc, '×10³/μL', v => v != null && v < 1.5],
                  ['Hb', patient.labs.cbc?.hb, 'g/dL', v => v != null && (v < 13 || v > 22)],
                  ['Plt', patient.labs.cbc?.plt, '×10³/μL', v => v != null && v < 100],
                ]} drawnAt={patient.labs.cbc?.drawnAtHr}/>
                <LabCard title="hs-CRP" labels={[['hs-CRP', patient.labs.hsCRP?.value, 'mg/L', v => v != null && v > 10]]} drawnAt={patient.labs.hsCRP?.drawnAtHr}/>
                <LabCard title="Hemoculture" labels={[['ผล', patient.labs.hc?.status, '', v => v === 'positive']]} drawnAt={patient.labs.hc?.drawnAtHr}/>
              </div>
            </>
          )}

          {/* 44h course */}
          <div className="section-lbl" style={{ margin: '0 0 8px' }}>44-hour Course</div>
          <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
            {EOS.TIMEPOINTS.map(tp => {
              const rec = all.find(v => v.ageHr === tp);
              const isAlert = rec && EOS.evalVitals(rec).some(x => x.sev === 'red');
              const isCurrent = tp === vital.ageHr;
              return (
                <div key={tp} style={{
                  flex: 1, padding: '10px 4px', textAlign: 'center', borderRadius: 8,
                  background: isAlert ? 'var(--r-tint)' : rec ? 'var(--m-tint)' : 'var(--surface-2)',
                  color: isAlert ? 'var(--r)' : rec ? 'var(--m)' : 'var(--ink-4)',
                  border: isCurrent ? '2px solid var(--ink)' : '1px solid var(--line)',
                  fontWeight: isCurrent ? 700 : 600,
                  fontSize: 10.5, fontFamily: 'var(--f-mono)',
                }}>
                  <div>{tp}</div>
                  <div style={{ marginTop: 4, fontSize: 14 }}>{rec ? (isAlert ? '⚠' : '✓') : '·'}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button className="btn btn-success btn-xl"
              onClick={() => { onApprove(vital.ts, 'stop', EOS.initials(patient.name)); if (idx < pending.length - 1) setIdx(idx + 1); }}>
              <Icon name="check" size={18}/>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                <span style={{ fontSize: 10.5, fontWeight: 500, opacity: .7, textTransform: 'uppercase', letterSpacing: '.05em' }}>ทารกอาการดี</span>
                <span>หยุด Antibiotic</span>
              </div>
            </button>
            <button className="btn btn-warn btn-xl"
              onClick={() => { onApprove(vital.ts, 'continue', EOS.initials(patient.name)); if (idx < pending.length - 1) setIdx(idx + 1); }}>
              <Icon name="warn" size={18}/>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                <span style={{ fontSize: 10.5, fontWeight: 500, opacity: .7, textTransform: 'uppercase', letterSpacing: '.05em' }}>ต้องเฝ้าระวังต่อ</span>
                <span>ให้ Antibiotic ต่อ</span>
              </div>
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11.5, color: 'var(--ink-3)' }}>
            <Icon name="lock" size={11}/> ระบบจะขอยืนยันด้วย PIN ก่อนบันทึก
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskRow({ label, value, flag }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 12px',
      background: flag ? 'var(--r-tint)' : 'var(--surface-2)',
      borderRadius: 8, fontSize: 12.5,
    }}>
      <span style={{ color: flag ? 'var(--r)' : 'var(--ink-3)' }}>{label}</span>
      <span style={{ color: flag ? 'var(--r)' : 'var(--ink)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function LabCard({ title, labels, drawnAt, note }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', letterSpacing: '.1em', color: 'var(--ink-2)', fontWeight: 600 }}>{title}</div>
        {drawnAt != null && <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>@{drawnAt}h</div>}
      </div>
      {labels.map(([k, v, u, f], i) => {
        const isFlag = v != null && f(v);
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}>
            <span style={{ color: 'var(--ink-3)' }}>{k}</span>
            <span style={{ color: isFlag ? 'var(--r)' : 'var(--ink)', fontWeight: 600, fontFamily: 'var(--f-mono)' }}>
              {v != null ? `${v}${u ? ' ' + u : ''}` : '—'}
            </span>
          </div>
        );
      })}
      {note && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>{note}</div>}
    </div>
  );
}

// ════════════════════════════════════════
// TRIAGE — abbreviated (minimal but functional)
// ════════════════════════════════════════
function TriageV7({ existingPatients, onCreatePatient, onCancel }) {
  const [step, setStep] = useStateScr(1);
  const [floor, setFloor] = useStateScr('22B');
  const [babyFirst, setBabyFirst] = useStateScr('');
  const [babyLast, setBabyLast] = useStateScr('');
  const [motherFirst, setMotherFirst] = useStateScr('');
  const [motherLast, setMotherLast] = useStateScr('');
  const [hn, setHn] = useStateScr('');
  const [sex, setSex] = useStateScr('M');
  const [ga, setGa] = useStateScr('39');
  const [gaDays, setGaDays] = useStateScr(0);
  const [bw, setBw] = useStateScr('3000');
  const [gbs, setGbs] = useStateScr('unk');
  const [rom, setRom] = useStateScr('6-12');
  const [tempVal, setTempVal] = useStateScr(37.0);
  const [iap, setIap] = useStateScr('none');
  const [chorio, setChorio] = useStateScr(false);

  const tempMax = tempVal < 37.5 ? '<37.5' : tempVal < 38.0 ? '37.5-38.0' : tempVal < 38.5 ? '38.0-38.5' : tempVal < 39.0 ? '38.5-39.0' : '≥39.0';
  const tempColor = tempVal >= 38.5 ? 'var(--r)' : tempVal >= 37.5 ? 'var(--a)' : 'var(--g)';
  const babyInits = EOS.initials(`${babyFirst} ${babyLast}`, '?');
  const motherInits = EOS.initials(`${motherFirst} ${motherLast}`, '?');

  const liveRisk = useMemoScr(() => EOS.KP.compute({ incidence: 0.5, ga, tempMax, rom, gbs, iap }), [ga, tempMax, rom, gbs, iap]);
  const band = liveRisk.posteriorPer1k >= 3 ? 'high' : liveRisk.posteriorPer1k >= 1 ? 'medium' : 'low';
  const bandC = band === 'high' ? 'var(--r)' : band === 'medium' ? 'var(--a)' : 'var(--g)';

  const hasFever = tempVal >= 38.0;
  const hasRisk = gbs === 'pos' || gbs === 'unk' || rom === '18-24' || rom === '>24';
  const adequateIAP = iap === 'broad-spec-≥4hr' || iap === 'gbs-spec-≥2hr';
  const triageDec = (hasFever || chorio)
    ? { tier: 'high', t: 'High Risk', a: 'H/C + CBC ที่ 0–6h + Serial PE' }
    : (hasRisk && !adequateIAP)
      ? { tier: 'medium', t: 'Medium Risk', a: 'Serial Physical Examinations' }
      : { tier: 'low', t: 'Low Risk', a: 'Routine observation' };
  const triageC = triageDec.tier === 'high' ? 'var(--r)' : triageDec.tier === 'medium' ? 'var(--a)' : 'var(--g)';

  const step1Valid = floor && hn && babyFirst && babyLast;
  const step2Valid = ga && bw;
  const canFinish = step1Valid && step2Valid;

  const nextBed = useMemoScr(() => {
    const taken = new Set(existingPatients.filter(p => p.floor === floor).map(p => p.bed));
    for (let i = 1; i < 99; i++) {
      const b = String(i).padStart(2, '0');
      if (!taken.has(b)) return b;
    }
    return 'XX';
  }, [floor, existingPatients]);

  const submit = () => {
    if (!canFinish) return;
    onCreatePatient({
      hn, babyFirst, babyLast, motherFirst, motherLast,
      name: `${babyFirst} ${babyLast}`, motherName: `${motherFirst} ${motherLast}`,
      bed: nextBed, floor, sex,
      ga: parseInt(ga), gaDays: gaDays || 0, bw: parseInt(bw),
      birthAt: new Date().toISOString(), createdAt: new Date().toISOString(), archived: false,
      intake: { chorio, maternalFever: tempVal >= 37.5 ? 'yes' : 'no', fever: tempVal, gbs, rom: { '0-6': 4, '6-12': 9, '12-18': 15, '18-24': 21, '>24': 30 }[rom], iap },
      kpRisk: liveRisk.posteriorPer1k, triageDecision: triageDec.t,
    });
  };

  return (
    <div className="page-pad fade-in">
      <div className="page-head">
        <button className="btn btn-ghost btn-sm" onClick={onCancel}><Icon name="arrow-left" size={13}/>กลับ</button>
        <div style={{ flex: 1 }}>
          <h1>รับเข้าใหม่</h1>
          <div className="sub">ขั้นตอน {step} จาก 3 · KP risk และคำแนะนำการดูแลจะปรากฏขวามือ</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 5, marginBottom: 22 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= step ? 'var(--m)' : 'var(--surface-3)', transition: 'background .2s' }}/>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18, alignItems: 'start' }}>
        <div>
          <div className="card" style={{ padding: 26 }}>
            {step === 1 && (
              <>
                <div style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Step 1 · Identity</div>
                <h2 style={{ marginTop: 6, marginBottom: 18, fontSize: 22 }}>ตำแหน่งและข้อมูลพื้นฐาน</h2>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>ตำแหน่ง</label>
                  <div className="chip-row">
                    {['22B','17A','SCN'].map(f => (
                      <button key={f} className={`chip ${floor === f ? 'on' : ''}`} style={{ minWidth: 110, justifyContent: 'center' }} onClick={() => setFloor(f)}>{EOS.floorLabel(f)}</button>
                    ))}
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 14, maxWidth: 300 }}>
                  <label>HN</label>
                  <input type="text" placeholder="1234/69" value={hn} onChange={e => setHn(e.target.value)} style={{ fontFamily: 'var(--f-mono)' }}/>
                </div>
                <label style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 6, marginBottom: 6, display: 'block', fontWeight: 600 }}>ทารก</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <input type="text" placeholder="ชื่อ" value={babyFirst} onChange={e => setBabyFirst(e.target.value)} className="field-input" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '9px 12px', color: 'var(--ink)' }}/>
                  <input type="text" placeholder="นามสกุล" value={babyLast} onChange={e => setBabyLast(e.target.value)} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '9px 12px', color: 'var(--ink)' }}/>
                </div>
                <label style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, display: 'block', fontWeight: 600 }}>มารดา</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input type="text" placeholder="ชื่อ" value={motherFirst} onChange={e => setMotherFirst(e.target.value)} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '9px 12px', color: 'var(--ink)' }}/>
                  <input type="text" placeholder="นามสกุล" value={motherLast} onChange={e => setMotherLast(e.target.value)} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '9px 12px', color: 'var(--ink)' }}/>
                </div>
                {(babyFirst || motherFirst) && (
                  <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--m-tint)', borderRadius: 10, fontSize: 12.5, color: 'var(--m)' }}>
                    <Icon name="eye" size={13}/> บันทึกในระบบ: ทารก <b style={{ fontFamily: 'var(--f-mono)', fontSize: 14 }}>{babyInits}</b> · มารดา <b style={{ fontFamily: 'var(--f-mono)', fontSize: 14 }}>{motherInits}</b>
                  </div>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <div style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Step 2 · Birth</div>
                <h2 style={{ marginTop: 6, marginBottom: 18, fontSize: 22 }}>ข้อมูลแรกเกิด</h2>
                <div className="field" style={{ marginBottom: 18 }}>
                  <label>เพศ</label>
                  <div className="chip-row">
                    <button className={`chip ${sex === 'M' ? 'on' : ''}`} style={{ minWidth: 130, justifyContent: 'center' }} onClick={() => setSex('M')}>♂ Male</button>
                    <button className={`chip ${sex === 'F' ? 'on' : ''}`} style={{ minWidth: 130, justifyContent: 'center' }} onClick={() => setSex('F')}>♀ Female</button>
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 18 }}>
                  <label>อายุครรภ์ · GA</label>
                  <div className="chip-row" style={{ marginBottom: 8 }}>
                    {['34','35','36','37','38','39','40','41+'].map(g => (
                      <button key={g} className={`chip ${ga === g ? 'on' : ''} ${ga === g && (g === '34' || g === '35') ? 'warn' : ''}`} style={{ minWidth: 60, justifyContent: 'center' }} onClick={() => setGa(g)}>{g} wk</button>
                    ))}
                  </div>
                  <div className="chip-row">
                    <span style={{ color: 'var(--ink-3)', fontSize: 12, display: 'flex', alignItems: 'center', marginRight: 6 }}>+ วัน:</span>
                    {[0,1,2,3,4,5,6].map(d => (
                      <button key={d} className={`chip ${gaDays === d ? 'on' : ''}`} style={{ minWidth: 40, justifyContent: 'center' }} onClick={() => setGaDays(d)}>{d}</button>
                    ))}
                  </div>
                </div>
                <div className="field" style={{ maxWidth: 240 }}>
                  <label>น้ำหนัก · BW (กรัม)</label>
                  <input type="number" placeholder="3000" value={bw} onChange={e => setBw(e.target.value)} style={{ fontFamily: 'var(--f-mono)' }}/>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Step 3 · Maternal Risk</div>
                <h2 style={{ marginTop: 6, marginBottom: 16, fontSize: 22 }}>ปัจจัยเสี่ยงจากมารดา</h2>
                <div className="field" style={{ marginBottom: 20 }}>
                  <label>ไข้มารดาในช่วงคลอด</label>
                  <div className="t-slider">
                    <div className="t-readout" style={{ color: tempColor }}>
                      {tempVal.toFixed(1)}<span className="u">°C</span>
                    </div>
                    <div className="t-track">
                      <input type="range" min="35" max="40" step="0.1" value={tempVal} onChange={e => setTempVal(parseFloat(e.target.value))} className="t-track-input"/>
                    </div>
                    <div className="t-ticks"><span>35.0</span><span>37.5</span><span>38.5</span><span>40.0</span></div>
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>ROM</label>
                  <div className="chip-row">
                    {[['0-6','0–6h'],['6-12','6–12h'],['12-18','12–18h'],['18-24','18–24h'],['>24','>24h']].map(([v,l]) => (
                      <button key={v} className={`chip ${rom === v ? 'on' : ''} ${rom === v && (v === '18-24' || v === '>24') ? 'warn' : ''}`} onClick={() => setRom(v)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 16 }}>
                  <div className="field">
                    <label>GBS Status</label>
                    <div className="chip-row">
                      <button className={`chip ${gbs === 'neg' ? 'on success' : ''}`} onClick={() => setGbs('neg')}>Neg</button>
                      <button className={`chip ${gbs === 'unk' ? 'on' : ''}`} onClick={() => setGbs('unk')}>Unk</button>
                      <button className={`chip ${gbs === 'pos' ? 'on danger' : ''}`} onClick={() => setGbs('pos')}>Pos</button>
                    </div>
                  </div>
                  <div className="field">
                    <label>Chorioamnionitis</label>
                    <div className="chip-row">
                      <button className={`chip ${!chorio ? 'on' : ''}`} onClick={() => setChorio(false)}>ไม่มี</button>
                      <button className={`chip ${chorio ? 'on danger' : ''}`} onClick={() => setChorio(true)}>มี</button>
                    </div>
                  </div>
                </div>
                <div className="field">
                  <label>IAP</label>
                  <div className="chip-row">
                    {[['broad-spec-≥4hr','Broad ≥4h'],['broad-spec-<4hr','Broad <4h'],['gbs-spec-≥2hr','GBS ≥2h'],['gbs-spec-<2hr','GBS <2h'],['none','None']].map(([v,l]) => (
                      <button key={v} className={`chip ${iap === v ? 'on' : ''} ${iap === v && v === 'none' ? 'warn' : ''} ${iap === v && (v === 'broad-spec-≥4hr' || v === 'gbs-spec-≥2hr') ? 'success' : ''}`} onClick={() => setIap(v)}>{l}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {step > 1 && <button className="btn btn-ghost btn-lg" onClick={() => setStep(s => s - 1)}><Icon name="arrow-left" size={14}/>ย้อนกลับ</button>}
            <div style={{ flex: 1 }}/>
            {step < 3 ? (
              <button className="btn btn-pri btn-lg" disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)} onClick={() => setStep(s => s + 1)}>
                ถัดไป<Icon name="arrow-right" size={14}/>
              </button>
            ) : (
              <button className="btn btn-pri btn-lg" disabled={!canFinish} onClick={submit}>
                <Icon name="check" size={14}/>รับเข้าระบบ
              </button>
            )}
          </div>
        </div>

        <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 16, borderColor: triageC + '55' }}>
            <div style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Triage แนะนำ</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: triageC + '22', color: triageC, display: 'grid', placeItems: 'center' }}>
                <Icon name={triageDec.tier === 'high' ? 'warn' : triageDec.tier === 'medium' ? 'eye' : 'check'} size={18}/>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: triageC, letterSpacing: '-.01em' }}>{triageDec.t}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 2 }}>{triageDec.a}</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>KP 2024 Risk</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <div className="risk-num n" style={{ fontSize: 44, color: bandC }}>{liveRisk.posteriorPer1k.toFixed(2)}</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>/ 1k</div>
            </div>
            <span className="risk-band" style={{ background: bandC + '22', color: bandC, fontSize: 10.5, padding: '4px 10px' }}>{band.toUpperCase()} RISK</span>
            <div style={{ height: 1, background: 'var(--line)', margin: '14px 0 10px' }}/>
            <div style={{ fontSize: 10, fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Bayes Trace</div>
            <div className="bayes-row"><span className="k">Baseline</span><span className="lr">{liveRisk.priorPer1k.toFixed(2)}</span></div>
            {liveRisk.factors.map((f, i) => (
              <div key={i} className="bayes-row">
                <span className="k">{f.label}</span>
                <span className={`lr ${f.lr > 1.05 ? 'up' : f.lr < 0.95 ? 'down' : ''}`}>×{f.lr.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--line)', margin: '12px 0 8px' }}/>
            <div style={{ fontSize: 10, fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>สรุป</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 5, fontSize: 12 }}>
              <span style={{ color: 'var(--ink-3)' }}>ตำแหน่ง</span><span className="n"><b>{EOS.floorLabel(floor)} · {nextBed}</b></span>
              <span style={{ color: 'var(--ink-3)' }}>HN</span><span className="n">{hn || '—'}</span>
              <span style={{ color: 'var(--ink-3)' }}>ทารก</span><span className="n"><b>{babyInits}</b></span>
              <span style={{ color: 'var(--ink-3)' }}>มารดา</span><span className="n"><b>{motherInits}</b></span>
              <span style={{ color: 'var(--ink-3)' }}>GA/BW</span><span className="n"><b>{EOS.fmtGA(ga, gaDays)}</b> · <b>{bw}g</b></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// PHONE HOME — swipeable patient carousel
// ════════════════════════════════════════
function PhoneHomeV7({ patients, vitals, onOpenPatient, onEnterVitals }) {
  const [idx, setIdx] = useStateScr(0);
  if (patients.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>ไม่มีทารก</div>;
  const p = patients[idx];
  if (!p) return null;

  const status = EOS.tpStatus(p, vitals);
  const all = EOS.vitalsFor(p.hn, vitals);
  const last = all[all.length - 1];
  const hasAlert = last && EOS.evalVitals(last).some(x => x.sev === 'red');
  const risk = p.kpRisk ?? 0;
  const riskColor = risk >= 3 ? 'var(--r)' : risk >= 1 ? 'var(--a)' : 'var(--g)';

  const next = () => setIdx((idx + 1) % patients.length);
  const prev = () => setIdx((idx - 1 + patients.length) % patients.length);

  const startX = useRefScr(null);
  const onStart = e => { startX.current = e.touches?.[0]?.clientX ?? e.clientX; };
  const onEnd = e => {
    const endX = e.changedTouches?.[0]?.clientX ?? e.clientX;
    if (startX.current == null) return;
    const dx = endX - startX.current;
    if (dx > 50) prev(); else if (dx < -50) next();
    startX.current = null;
  };

  return (
    <div onTouchStart={onStart} onTouchEnd={onEnd}>
      <div className="phone-tabs">
        {patients.map((_, i) => (
          <div key={i} className={`phone-tab ${i === idx ? 'active' : ''}`}/>
        ))}
      </div>

      <div className="phone-body">
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <div style={{ display: 'inline-flex', gap: 6, marginBottom: 10 }}>
            <span className="cp-pill">{p.bed}</span>
            <span className="cp-pill">{EOS.floorLabel(p.floor)}</span>
            {hasAlert && <span className="cp-pill crit">⚠ Alert</span>}
            {status.cat === 'overdue' && !hasAlert && <span className="cp-pill warn">Overdue</span>}
          </div>
          <h1 style={{ fontSize: 32, letterSpacing: '-.03em', margin: '4px 0 2px' }}>{EOS.initials(p.name)}</h1>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>HN {p.hn} · GA {EOS.fmtGA(p.ga, p.gaDays)} · {p.bw}g</div>
        </div>

        <div style={{ margin: '20px 0', display: 'grid', placeItems: 'center' }}>
          <Dial patient={p} vitals={vitals} size={260}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)', letterSpacing: '.08em' }}>KP RISK</div>
            <div className="n" style={{ fontSize: 24, fontWeight: 700, color: riskColor, marginTop: 4 }}>{risk.toFixed(2)}<span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 3 }}>/1k</span></div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)', letterSpacing: '.08em' }}>DONE</div>
            <div className="n" style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{all.length}<span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 3 }}>/{EOS.TIMEPOINTS.length}</span></div>
          </div>
        </div>

        {status.tp ? (
          <button className="btn btn-pri btn-xl" style={{ width: '100%' }} onClick={() => onEnterVitals(p, status.tp)}>
            <Icon name="plus" size={16}/>บันทึก {status.tp}
          </button>
        ) : (
          <button className="btn btn-success btn-xl" style={{ width: '100%' }} disabled>
            <Icon name="check" size={16}/>เสร็จสมบูรณ์ 44/44
          </button>
        )}
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => onOpenPatient(p.hn)}>
          <Icon name="eye" size={13}/>ดูรายละเอียดเต็ม
        </button>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-soft btn-sm" style={{ flex: 1 }} onClick={prev}>
            <Icon name="arrow-left" size={12}/>{patients[(idx - 1 + patients.length) % patients.length].bed}
          </button>
          <button className="btn btn-soft btn-sm" style={{ flex: 1 }} onClick={next}>
            {patients[(idx + 1) % patients.length].bed}<Icon name="arrow-right" size={12}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// PIN MODAL
// ════════════════════════════════════════
function PinModal({ msg, onConfirm, onCancel }) {
  const [txt, setTxt] = useStateScr('');
  return (
    <Modal onClose={onCancel} maxWidth={420}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--m-tint)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
          <Icon name="lock" size={20} color="var(--m)"/>
        </div>
        <h2>ยืนยันการดำเนินการ</h2>
        <div className="sub" style={{ whiteSpace: 'pre-line' }}>{msg}</div>
        <input type="text" value={txt} onChange={e => setTxt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onConfirm(txt)}
          placeholder='พิมพ์ "ยืนยัน"' autoFocus
          style={{
            width: '100%', padding: '12px 14px', textAlign: 'center', letterSpacing: 1,
            background: 'var(--surface-2)', border: '1.5px solid var(--line-2)', borderRadius: 10,
            color: 'var(--ink)', fontSize: 16, outline: 'none', marginBottom: 14,
          }}/>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>ยกเลิก</button>
          <button className="btn btn-pri" style={{ flex: 1 }} onClick={() => onConfirm(txt)}>ยืนยัน</button>
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { CalculatorV7, VitalsEntryV7, AlertsV7, AbxV7, TriageV7, PhoneHomeV7, PinModal });


// ═══════════════════════════════════════════════════
// v8-floor: FloorV8, BedRowV8
// ═══════════════════════════════════════════════════

// EOS v8 — Floor view with Sentinel column + responsive cards

const { useState: useStateFloorV8, useMemo: useMemoFloorV8 } = React;

function FloorV8({ patients, vitals, onOpenPatient, onTriage, onEnterVitals, onGoHandoff, activeFloor, setActiveFloor }) {
  // Urgency rank now incorporates Sentinel score
  const urgencyRank = (p) => {
    const s = window.Sentinel.score(p, vitals);
    return -s.score; // higher score → lower (more urgent) rank
  };

  const floors = useMemoFloorV8(() => {
    const byFloor = {};
    patients.forEach(p => {
      const f = p.floor || '22B';
      (byFloor[f] = byFloor[f] || []).push(p);
    });
    Object.values(byFloor).forEach(list => list.sort((a, b) => {
      const ru = urgencyRank(a) - urgencyRank(b);
      return ru !== 0 ? ru : String(a.bed).localeCompare(String(b.bed));
    }));
    return byFloor;
  }, [patients, vitals]);

  const FLOOR_ORDER = ['22B', '17A', 'SCN'];
  const floorList = useMemoFloorV8(() => {
    const all = [...new Set(patients.map(p => p.floor || '22B'))];
    return all.sort((a, b) => {
      const ai = FLOOR_ORDER.indexOf(String(a));
      const bi = FLOOR_ORDER.indexOf(String(b));
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return String(a).localeCompare(String(b));
    });
  }, [patients]);

  const currentFloor = activeFloor && floors[activeFloor] ? activeFloor : floorList[0];
  const currentPatients = floors[currentFloor] || [];

  const stats = useMemoFloorV8(() => {
    let crit = 0, watch = 0, stable = 0, complete = 0;
    currentPatients.forEach(p => {
      const s = window.Sentinel.score(p, vitals);
      const st = EOS.tpStatus(p, vitals);
      if (s.band.key === 'critical' || s.band.key === 'concern') crit++;
      else if (s.band.key === 'watch') watch++;
      else if (st.cat === 'complete') complete++;
      else stable++;
    });
    return { total: currentPatients.length, crit, watch, stable, complete };
  }, [currentPatients, vitals]);

  const floorStats = useMemoFloorV8(() => {
    const out = {};
    floorList.forEach(f => {
      const list = floors[f] || [];
      let crit = 0;
      list.forEach(p => {
        const s = window.Sentinel.score(p, vitals);
        if (s.band.key === 'critical' || s.band.key === 'concern') crit++;
      });
      out[f] = { ct: list.length, crit };
    });
    return out;
  }, [floorList, floors, vitals]);

  // Most urgent across ALL floors → Now Bar
  const mostUrgent = useMemoFloorV8(() => {
    const ranked = patients
      .map(p => {
        const s = window.Sentinel.score(p, vitals);
        const st = EOS.tpStatus(p, vitals);
        return { p, s, st };
      })
      .filter(x => x.s.score >= 3 || x.st.cat === 'overdue')
      .sort((a, b) => b.s.score - a.s.score);
    return ranked[0] || null;
  }, [patients, vitals]);

  return (
    <div className="page-pad fade-in">
      <div className="page-head">
        <div>
          <h1>Ward</h1>
          <div className="sub">{currentPatients.length} ทารก · เรียงตาม Sentinel score</div>
        </div>
        <div className="right" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={onGoHandoff}>
            <Icon name="handoff" size={13}/>Handoff
          </button>
          <button className="btn btn-pri btn-sm" onClick={onTriage}>
            <Icon name="plus" size={14}/>รับเข้าใหม่
          </button>
        </div>
      </div>

      {/* NOW BAR */}
      {mostUrgent ? (
        <div className={`nowbar ${mostUrgent.s.band.key === 'critical' || mostUrgent.s.band.key === 'concern' ? 'crit' : mostUrgent.s.band.key === 'watch' ? 'warn' : 'ok'}`}>
          <SentinelChip patient={mostUrgent.p} vitals={vitals} size="lg"/>
          <div style={{ minWidth: 0 }}>
            <div className="nowbar-title">
              {EOS.initials(mostUrgent.p.name)} · {mostUrgent.p.bed} ·{' '}
              <span style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 14 }}>
                {EOS.floorLabel(mostUrgent.p.floor)} · {EOS.fmtAge(EOS.ageHours(mostUrgent.p))} old
              </span>
            </div>
            <div className="nowbar-desc">
              {mostUrgent.s.factors.filter(f => f.pts > 0 && f.tier === 'fired').slice(0, 2).map(f => f.label).join(' · ') || mostUrgent.s.band.action}
            </div>
          </div>
          <div className="nowbar-spacer"/>
          <div className="nowbar-actions">
            {mostUrgent.st.tp && (
              <button className="btn btn-pri btn-sm" onClick={() => onEnterVitals(mostUrgent.p, mostUrgent.st.tp)}>
                <Icon name="plus" size={13}/>บันทึก {mostUrgent.st.tp}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => onOpenPatient(mostUrgent.p.hn)}>
              เปิดเคส<Icon name="arrow-right" size={13}/>
            </button>
          </div>
        </div>
      ) : (
        <div className="nowbar ok">
          <div className="nowbar-pill">All Stable</div>
          <div>
            <div className="nowbar-title">ไม่มีเคสเร่งด่วน · ทุกคนปลอดภัย</div>
            <div className="nowbar-desc">การบันทึกครั้งถัดไปยังอยู่ในเวลา</div>
          </div>
        </div>
      )}

      {/* KPI RIBBON */}
      <div className="kpi-row">
        <div className="kpi crit">
          <div className="lbl"><Icon name="warn" size={11}/>Concern / Critical</div>
          <div className="val n">{stats.crit}</div>
          <div className="sub">Sentinel ≥ 5</div>
        </div>
        <div className="kpi warn">
          <div className="lbl"><Icon name="eye" size={11}/>Watch</div>
          <div className="val n">{stats.watch}</div>
          <div className="sub">Sentinel 3–4</div>
        </div>
        <div className="kpi info">
          <div className="lbl"><Icon name="pulse" size={11}/>Stable</div>
          <div className="val n">{stats.stable}</div>
          <div className="sub">ติดตามต่อเนื่อง</div>
        </div>
        <div className="kpi ok">
          <div className="lbl"><Icon name="check" size={11}/>Protocol Complete</div>
          <div className="val n">{stats.complete}</div>
          <div className="sub">44/44 timepoints</div>
        </div>
      </div>

      {/* FLOOR TABS */}
      <div className="floor-tabs">
        {floorList.map(f => {
          const s = floorStats[f] || { ct: 0, crit: 0 };
          return (
            <button key={f}
              className={`f-tab ${f === currentFloor ? 'active' : ''}`}
              onClick={() => setActiveFloor(f)}>
              <span>{String(f).match(/^\d/) ? `ชั้น ${f}` : f}</span>
              <span className="ct">{s.ct}</span>
              {s.crit > 0 && <span className="alert-dot"/>}
            </button>
          );
        })}
      </div>

      {/* BED TABLE — column headers (hidden on narrow) */}
      <div className="bed-cols-header" style={{
        display: 'grid',
        gap: 14,
        padding: '0 18px 8px',
        fontSize: 10.5,
        fontFamily: 'var(--f-mono)',
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: 'var(--ink-4)',
      }}>
        <div></div>
        <div>ทารก · HN</div>
        <div style={{ textAlign: 'center' }}>Age</div>
        <div>Sentinel</div>
        <div>Protocol</div>
        <div>Latest vitals</div>
        <div style={{ textAlign: 'right' }}>Status</div>
        <div></div>
      </div>

      <div className="bed-table">
        {currentPatients.map(p => <BedRowV8 key={p.hn} patient={p} vitals={vitals} onClick={onOpenPatient} onEnterVitals={onEnterVitals}/>)}
        {currentPatients.length === 0 && (
          <div className="empty-state">
            <div className="ic-wrap" style={{ background: 'var(--surface-2)' }}>
              <Icon name="baby" size={28} color="var(--ink-3)"/>
            </div>
            <h2>ไม่มีทารกในตำแหน่งนี้</h2>
            <button className="btn btn-pri btn-sm" style={{ marginTop: 16 }} onClick={onTriage}>
              <Icon name="plus" size={13}/>รับเข้าใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BedRowV8({ patient, vitals, onClick, onEnterVitals }) {
  const all = EOS.vitalsFor(patient.hn, vitals);
  const last = all[all.length - 1];
  const sentinel = window.Sentinel.score(patient, vitals);
  const status = EOS.tpStatus(patient, vitals);
  const age = EOS.ageHours(patient);
  const ageParts = EOS.fmtAgeParts(age);

  let rowCls = 'bed-row';
  if (sentinel.band.key === 'critical' || sentinel.band.key === 'concern') rowCls += ' crit';
  else if (sentinel.band.key === 'watch' || status.cat === 'overdue') rowCls += ' warn';
  else if (status.cat === 'complete') rowCls += ' done';

  const inits = EOS.initials(patient.name);

  // Status pill (now based on protocol, since sentinel is shown separately)
  let statusKey = 'info', statusLabel = 'Watching';
  if (status.cat === 'overdue') {
    statusKey = 'crit';
    statusLabel = `+${status.hoursLate?.toFixed(1)}h late`;
  }
  else if (status.cat === 'due') { statusKey = 'warn'; statusLabel = 'Due now'; }
  else if (status.cat === 'soon') {
    statusKey = 'warn';
    statusLabel = `in ${status.hoursUntil?.toFixed(1)}h`;
  }
  else if (status.cat === 'complete') { statusKey = 'ok'; statusLabel = '44/44 ✓'; }

  return (
    <div className={rowCls} onClick={() => onClick && onClick(patient.hn)}>
      <div className="bed-avatar">{inits}</div>
      <div className="bed-id-col">
        <div className="name">{inits} <span style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 12, marginLeft: 6 }}>· {patient.bed}</span></div>
        <div className="meta">
          <span className="pill">HN {patient.hn}</span>
          <span>GA {EOS.fmtGA(patient.ga, patient.gaDays)}</span>
          <span>BW {patient.bw != null ? patient.bw + 'g' : '—'}</span>
        </div>
      </div>
      <div className="bed-age">
        <div className="n">{ageParts.n}</div>
        <div className="u">{ageParts.unit}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <SentinelChip patient={patient} vitals={vitals}/>
      </div>
      <TimelineStrip patient={patient} vitals={vitals}/>
      <div className="v-chips">
        {['T','P','R','SpO2'].map(k => <VitalChip key={k} vital={last} vitalKey={k} vitals={vitals} patient={patient}/>)}
      </div>
      <div className="bed-status">
        <span className={`badge-status ${statusKey}`}>{statusLabel}</span>
        <span className="next">
          {status.tp ? `next ${status.tp}` : status.cat === 'complete' ? 'complete' : '—'}
        </span>
      </div>
      <div className="bed-action">
        {status.tp && status.cat !== 'soon' ? (
          <button className="btn btn-pri btn-sm" onClick={e => { e.stopPropagation(); onEnterVitals(patient, status.tp); }}>
            <Icon name="plus" size={12}/>{status.tp}
          </button>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); onClick && onClick(patient.hn); }}>
            <Icon name="arrow-right" size={13}/>
          </button>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { FloorV8, BedRowV8 });


// ═══════════════════════════════════════════════════
// v8-patient: PatientV8, RiskEvidence
// ═══════════════════════════════════════════════════

// EOS v8 — Patient cockpit with Sentinel + Care Plan + Evidence panel

const { useState: useStatePtV8, useMemo: useMemoPtV8 } = React;

function PatientV8({ patient, patients, vitals, onBack, onEnterVitals, onApproveAbx, onOpenPatient }) {
  if (!patient) return null;
  const all = EOS.vitalsFor(patient.hn, vitals);
  const last = all[all.length - 1];
  const status = EOS.tpStatus(patient, vitals);
  const trends = EOS.evalTrend(patient.hn, vitals);
  const abxPending = all.find(v => EOS.ABX_TPS.has(v.ageHr) && !v.abxApproved);
  const sentinel = window.Sentinel.score(patient, vitals);

  const risk = patient.kpRisk ?? 0;
  const riskBand = risk >= 3 ? { c: 'var(--r)', cls: 'crit', label: 'High Risk' }
                  : risk >= 1 ? { c: 'var(--a)', cls: 'warn', label: 'Medium Risk' }
                  : { c: 'var(--g)', cls: 'ok',   label: 'Low Risk' };

  // Mobile tab state
  const [tab, setTab] = useStatePtV8('overview');
  const isNarrow = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 900px)').matches : false;

  return (
    <div className="page-pad fade-in">
      {/* breadcrumb */}
      <div className="page-head" style={{ marginBottom: 14 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="arrow-left" size={13}/>กลับ Ward
        </button>
        <div style={{ flex: 1 }}/>
        {status.tp && (
          <button className="btn btn-pri btn-sm" onClick={() => onEnterVitals(patient, status.tp)}>
            <Icon name="plus" size={13}/>บันทึก {status.tp}
          </button>
        )}
      </div>

      {/* COCKPIT LAYOUT */}
      <div className="cockpit">
        {/* LEFT — Identity + Sentinel + risk */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="cp-id">
            <div className="id-row">
              <div className="avatar">{EOS.initials(patient.name)}</div>
              <div className="who">
                <h1>{EOS.initials(patient.name)}</h1>
                <div className="hn">HN {patient.hn} · Mother {EOS.initials(patient.motherName)}</div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <SentinelChip patient={patient} vitals={vitals} size="lg"/>
            </div>
            <div className="pills">
              <span className="cp-pill">{patient.bed}</span>
              <span className="cp-pill">{EOS.floorLabel(patient.floor)}</span>
              <span className="cp-pill">{patient.sex === 'F' ? '♀ Female' : '♂ Male'}</span>
              {patient.intake?.chorio && <span className="cp-pill crit">Chorioamnionitis</span>}
              {patient.intake?.maternalFever === 'yes' && <span className="cp-pill warn">Maternal fever</span>}
            </div>
            <div className="cp-stats">
              <span className="l">Age</span><span className="v n">{EOS.fmtAge(EOS.ageHours(patient))}</span>
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

          {/* Sentinel breakdown */}
          <SentinelCard patient={patient} vitals={vitals}/>

          {/* KP RISK with evidence */}
          <div className="risk-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>EOS Pre-test Risk</div>
              <span style={{ flex: 1 }}/>
              <EbmDisclaimer compact/>
            </div>
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
            {/* Evidence: which factors drove this risk */}
            <div className="evi-card">
              <div style={{ fontSize: 10, fontFamily: 'var(--f-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Evidence · Bayesian factors</div>
              <RiskEvidence patient={patient}/>
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div>
          {/* Mobile tab nav */}
          <div className="floor-tabs" style={{ display: 'none' }} id="pt-mobile-tabs">
            {[['overview','Overview'],['vitals','Vitals'],['plan','Plan'],['timeline','Timeline']].map(([k,l]) => (
              <button key={k} className={`f-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          <div className="dial-wrap">
            <Dial patient={patient} vitals={vitals} size={280}/>
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
            <div className="abx-banner" style={{ marginTop: 14, marginBottom: 0, flexWrap: 'wrap' }}>
              <div className="ico"><Icon name="abx" size={20}/></div>
              <div className="body">
                <div className="t">ABX Time-Out · {abxPending.ageHr}</div>
                <div className="d">ตัดสินใจหยุด/ต่อ antibiotic ภายใน 1 ชั่วโมง · จะขอ co-sign</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-success btn-sm" onClick={() => onApproveAbx(abxPending.ts, 'stop', EOS.initials(patient.name))}>
                  <Icon name="check" size={13}/>หยุด
                </button>
                <button className="btn btn-warn btn-sm" onClick={() => onApproveAbx(abxPending.ts, 'continue', EOS.initials(patient.name))}>
                  <Icon name="arrow-right" size={13}/>ต่อ
                </button>
              </div>
            </div>
          )}

          {/* INSTRUMENT GAUGES */}
          {last && (
            <>
              <div className="section-lbl" style={{ marginTop: 22 }}>
                <Icon name="pulse" size={12}/>Vital Signs · ล่าสุดที่ {last.ageHr} · {EOS.fmtTime(last.ts)}
                <div className="ln"/>
                {trends.length > 0 && (
                  <span style={{
                    fontSize: 10.5, fontFamily: 'var(--f-mono)',
                    background: 'var(--r-tint)', color: 'var(--r)',
                    padding: '3px 7px', borderRadius: 4,
                    letterSpacing: '.05em',
                  }}>⚠ TRENDING</span>
                )}
              </div>
              <div className="gauges">
                {['T','P','R','SpO2'].map(k => <GaugeV7 key={k} vital={last} vitalKey={k} vitals={vitals} patient={patient}/>)}
              </div>
            </>
          )}

          {/* CARE PLAN */}
          <div style={{ marginTop: 22 }}>
            <CarePlanCard patient={patient} vitals={vitals}/>
          </div>

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

        {/* RIGHT — Watch list */}
        <div className="watch-col">
          <div className="watch">
            <h3><Icon name="patients" size={12}/>Watch List · {patients.length}</h3>
            {patients.slice().sort((a, b) => {
              const sa = window.Sentinel.score(a, vitals).score;
              const sb = window.Sentinel.score(b, vitals).score;
              return sb - sa;
            }).map(p => {
              const s = window.Sentinel.score(p, vitals);
              const st = EOS.tpStatus(p, vitals);
              let cls = 'watch-baby';
              if (p.hn === patient.hn) cls += ' active';
              if (s.band.key === 'critical' || s.band.key === 'concern') cls += ' crit';
              else if (s.band.key === 'watch' || st.cat === 'overdue') cls += ' warn';
              else if (st.cat === 'complete') cls += ' ok';
              return (
                <div key={p.hn} className={cls} onClick={() => onOpenPatient(p.hn)}>
                  <div className="watch-init">{EOS.initials(p.name)}</div>
                  <div className="meta">
                    <div className="b">{EOS.initials(p.name)} <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 11 }}>· {p.bed}</span></div>
                    <div className="l">
                      Sentinel <span style={{ color: s.band.key === 'stable' ? 'var(--g)' : s.band.key === 'watch' ? 'var(--a)' : 'var(--r)', fontWeight: 700 }}>{s.score}</span>
                      {' · '}{st.tp ? `next ${st.tp}` : st.cat === 'complete' ? 'complete' : '—'}
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

// Compact pre-test risk evidence — shows the factors that drove the KP number.
function RiskEvidence({ patient }) {
  const intake = patient.intake || {};
  const factors = [];
  // GA
  const ga = patient.ga >= 41 ? '41+' : String(patient.ga);
  const lrGa = EOS.KP.LR.ga[ga] || 1;
  factors.push({ k: `GA ${ga} wk`, lr: lrGa });
  // Temp
  const tempCat = !intake.maternalFever || intake.maternalFever === 'no' ? '<37.5'
    : intake.fever < 38.0 ? '37.5-38.0'
    : intake.fever < 38.5 ? '38.0-38.5'
    : intake.fever < 39.0 ? '38.5-39.0'
    : '≥39.0';
  factors.push({ k: `ไข้มารดา ${tempCat}°C`, lr: EOS.KP.LR.tempMax[tempCat] || 1 });
  // ROM
  const rom = intake.rom;
  const romCat = rom == null ? '6-12' : rom < 6 ? '0-6' : rom < 12 ? '6-12' : rom < 18 ? '12-18' : rom < 24 ? '18-24' : '>24';
  factors.push({ k: `ROM ${romCat}h`, lr: EOS.KP.LR.rom[romCat] || 1 });
  // GBS
  factors.push({ k: `GBS ${(intake.gbs || 'unk').toUpperCase()}`, lr: EOS.KP.LR.gbs[intake.gbs || 'unk'] || 1 });
  // IAP
  factors.push({ k: `IAP ${intake.iap || 'none'}`, lr: EOS.KP.LR.iap[intake.iap || 'none'] || 1 });

  return (
    <>
      {factors.map((f, i) => (
        <div key={i} className="ev-row">
          <span className="k">{f.k}</span>
          <span className={`v ${f.lr > 1.05 ? 'up' : f.lr < 0.95 ? 'dn' : ''}`}>×{f.lr.toFixed(2)}</span>
        </div>
      ))}
    </>
  );
}

Object.assign(window, { PatientV8, RiskEvidence });


// ═══════════════════════════════════════════════════
// v8-handoff: HandoffV8, SbarCard
// ═══════════════════════════════════════════════════

// EOS v8 — Shift Handoff (SBAR sign-out)
// One-screen, scannable, sort by Sentinel score. Critical: instant pick-up.

const { useState: useStateHO, useMemo: useMemoHO } = React;

function HandoffV8({ patients, vitals, onOpenPatient, onBack }) {
  const [filter, setFilter] = useStateHO('all');
  const [shift, setShift]   = useStateHO('night→day');
  const [copyState, setCopyState] = useStateHO(null);

  const rows = useMemoHO(() => {
    return patients.map(p => {
      const s = window.Sentinel.score(p, vitals);
      const all = EOS.vitalsFor(p.hn, vitals);
      const last = all[all.length - 1];
      const status = EOS.tpStatus(p, vitals);
      const careItems = window.CarePlan.build(p, vitals);
      const open = careItems.filter(i => i.status === 'miss' || i.status === 'due');
      const trends = EOS.evalTrend(p.hn, vitals);
      return { p, s, last, status, open, trends };
    }).sort((a, b) => b.s.score - a.s.score);
  }, [patients, vitals]);

  const counts = {
    all: rows.length,
    critical: rows.filter(r => r.s.band.key === 'critical' || r.s.band.key === 'concern').length,
    watch:    rows.filter(r => r.s.band.key === 'watch').length,
    stable:   rows.filter(r => r.s.band.key === 'stable').length,
  };

  const filtered = filter === 'all' ? rows
    : filter === 'critical' ? rows.filter(r => r.s.band.key === 'critical' || r.s.band.key === 'concern')
    : rows.filter(r => r.s.band.key === filter);

  const copyDigest = () => {
    const lines = rows.map(r => {
      const inits = EOS.initials(r.p.name);
      const issues = [];
      if (r.s.score >= 5) issues.push(`Sentinel ${r.s.score} ${r.s.band.label}`);
      if (r.open.length) issues.push(`${r.open.length} task open`);
      if (r.trends.length) issues.push(...r.trends.map(t => t.txt));
      return `[${r.p.bed}] ${inits} HN${r.p.hn} GA${r.p.ga}+${r.p.gaDays || 0} BW${r.p.bw}g · ${EOS.fmtAgeShort(EOS.ageHours(r.p))} ${issues.length ? '· ' + issues.join(' · ') : '· stable'}`;
    });
    const text = `EOS Handoff · ${shift}\n${new Date().toLocaleString('th-TH')}\n\n${lines.join('\n')}`;
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    setCopyState('copied');
    setTimeout(() => setCopyState(null), 1800);
  };

  return (
    <div className="page-pad fade-in">
      <div className="page-head">
        <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon name="arrow-left" size={13}/>กลับ</button>
        <div style={{ flex: 1 }}>
          <h1>Shift Handoff</h1>
          <div className="sub">{rows.length} ทารก · เรียงตาม Sentinel score · พร้อมส่งต่อเวร</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={copyDigest}>
            <Icon name={copyState === 'copied' ? 'check' : 'save'} size={13}/>
            {copyState === 'copied' ? 'คัดลอกแล้ว' : 'คัดลอก SBAR'}
          </button>
          <button className="btn btn-pri btn-sm" onClick={() => window.print()}>
            <Icon name="save" size={13}/>พิมพ์
          </button>
        </div>
      </div>

      {/* Shift banner */}
      <div className="shift-banner">
        <div className="ic"><Icon name="sync" size={18}/></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>เวร {shift === 'night→day' ? 'ดึก → เช้า' : shift === 'day→evening' ? 'เช้า → บ่าย' : 'บ่าย → ดึก'}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--f-mono)' }}>
            {new Date().toLocaleString('th-TH', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['night→day','ดึก→เช้า'], ['day→evening','เช้า→บ่าย'], ['evening→night','บ่าย→ดึก']].map(([k, l]) => (
            <button key={k} className={`chip ${shift === k ? 'on' : ''}`} onClick={() => setShift(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="handoff-bar">
        <span className="lbl">Filter</span>
        {[['all','All',counts.all],['critical','Concern+',counts.critical],['watch','Watch',counts.watch],['stable','Stable',counts.stable]].map(([k, l, c]) => (
          <button key={k} className={`chip ${filter === k ? 'on' : ''} ${k === 'critical' && filter === k ? 'danger' : ''} ${k === 'watch' && filter === k ? 'warn' : ''} ${k === 'stable' && filter === k ? 'success' : ''}`}
            onClick={() => setFilter(k)}>
            {l} <span style={{ opacity: .7, marginLeft: 4 }}>{c}</span>
          </button>
        ))}
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
          เรียงตาม Sentinel score (สูง → ต่ำ)
        </span>
      </div>

      <div className="handoff-grid">
        {filtered.map(({ p, s, last, status, open, trends }) => (
          <SbarCard key={p.hn}
            patient={p} vitals={vitals}
            sentinel={s} last={last} status={status}
            open={open} trends={trends} onOpen={() => onOpenPatient(p.hn)}/>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="ic-wrap" style={{ background: 'var(--g-tint)' }}>
            <Icon name="check" size={24} color="var(--g)"/>
          </div>
          <h2>ไม่มีรายการในตัวกรองนี้</h2>
          <div className="muted">ทุกคนปลอดภัย — ส่งต่อเวรได้</div>
        </div>
      )}
    </div>
  );
}

function SbarCard({ patient, vitals, sentinel, last, status, open, trends, onOpen }) {
  const inits = EOS.initials(patient.name);
  const age = EOS.ageHours(patient);
  const cls = sentinel.band.key === 'critical' || sentinel.band.key === 'concern' ? 'crit'
            : sentinel.band.key === 'watch' ? 'warn' : '';
  const reco = [];
  if (open.length) {
    const next = open[0];
    reco.push(`ถัดไป · ${next.title} (${next.when})`);
  }
  if (sentinel.score >= 5) reco.push('แจ้งแพทย์ · ทบทวน plan');
  if (status.cat === 'overdue') reco.push(`เก็บ vitals ${status.tp} ทันที`);
  if (trends.length) reco.push('Trend เสื่อมลง — เพิ่มความถี่ vitals');
  if (reco.length === 0) reco.push('ติดตามตาม protocol');

  return (
    <div className={`sbar-card ${cls}`} onClick={onOpen}>
      <div className="sbar-head">
        <div className="bed-avatar" style={{ width: 38, height: 38, fontSize: 14, borderRadius: 10 }}>{inits}</div>
        <div className="who">
          <h3>{inits} · {patient.bed}</h3>
          <div className="meta">HN {patient.hn} · {EOS.floorLabel(patient.floor)}</div>
        </div>
        <SentinelChip patient={patient} vitals={vitals}/>
      </div>

      <div className="sbar-section"><span className="key">S</span>Situation</div>
      <div className="sbar-content">
        {patient.sex === 'F' ? 'หญิง' : 'ชาย'} · {EOS.fmtAge(age)} · GA {EOS.fmtGA(patient.ga, patient.gaDays)} · BW {patient.bw}g
      </div>

      <div className="sbar-section"><span className="key">B</span>Background</div>
      <div className="sbar-content">
        KP risk <span className={patient.kpRisk >= 1 ? 'flag' : 'ok'}>{(patient.kpRisk ?? 0).toFixed(2)}/1k</span>
        {' · '}GBS <span className={patient.intake?.gbs === 'pos' ? 'flag' : ''}>{(patient.intake?.gbs || '—').toUpperCase()}</span>
        {' · '}ROM <span className={patient.intake?.rom >= 18 ? 'flag' : ''}>{patient.intake?.rom}h</span>
        {patient.intake?.maternalFever === 'yes' && (<><br/><span className="flag">⚠ Maternal fever {patient.intake.fever?.toFixed(1)}°C</span></>)}
        {patient.intake?.chorio && (<><br/><span className="flag">⚠ Chorioamnionitis</span></>)}
      </div>

      <div className="sbar-section"><span className="key">A</span>Assessment · {last ? `last ${last.ageHr}` : 'no vitals'}</div>
      {last ? (
        <div className="sbar-vitals">
          {['T','P','R','SpO2'].map(k => {
            const r = EOS.RANGES[k];
            const v = last[k];
            const flag = v != null && (v < r.lo || v > r.hi);
            return (
              <div key={k} className={`sbar-vit ${flag ? 'flag' : ''}`}>
                <div className="k">{r.en}</div>
                <div className="v">{v != null ? (k === 'T' ? v.toFixed(1) : Math.round(v)) : '—'}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="sbar-content" style={{ color: 'var(--ink-3)' }}>ยังไม่มีบันทึก</div>
      )}
      {trends.length > 0 && (
        <div className="sbar-content" style={{ marginTop: 6 }}>
          <span className="flag">⚠ Trend · {trends.map(t => t.txt).join(' · ')}</span>
        </div>
      )}

      <div className="sbar-section"><span className="key">R</span>Recommend</div>
      <div className="sbar-content">
        <ul>
          {reco.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--ink-3)' }}>
          {open.length > 0 ? `${open.length} งานค้าง` : 'ไม่มีงานค้าง'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--m)', fontWeight: 600 }}>
          เปิดเคส <Icon name="arrow-right" size={11}/>
        </span>
      </div>
    </div>
  );
}

Object.assign(window, { HandoffV8 });
