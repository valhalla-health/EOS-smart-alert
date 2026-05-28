// EOS v8 — Sentinel
// Composite deterioration score for EOS-watch newborns.
// Inputs: KP pre-test risk + serial vitals trend + latest exam.
// Output: 0–10 with band + breakdown.

window.Sentinel = (() => {

  // Weighted factors. Goal: catch slow drift before any single vital is "abnormal."
  // Total max: ~12, clamped to 10. Bands:
  //   0–2  Stable  (green)
  //   3–4  Watch   (amber)
  //   5–7  Concern (red but not urgent)
  //   8–10 Critical
  function score(patient, vitals) {
    const factors = [];
    const all = EOS.vitalsFor(patient.hn, vitals);
    const last = all[all.length - 1];
    const prev = all[all.length - 2];

    // 1. Latest abnormality severity ─────────────────────────
    if (last) {
      const issues = EOS.evalVitals(last);
      const critN = issues.filter(i => i.critical).length;
      const abnN  = issues.filter(i => !i.critical).length;
      const pts = critN * 3 + abnN * 1;
      if (pts > 0) {
        factors.push({
          key: 'vitals-now', pts,
          label: `Vital signs abnormal (${critN} critical, ${abnN} mild)`,
          tier: critN > 0 ? 'fired' : 'warn',
        });
      } else {
        factors.push({ key: 'vitals-now', pts: 0, label: 'Vital signs ในเกณฑ์', tier: 'ok' });
      }
    } else {
      factors.push({ key: 'vitals-now', pts: 0, label: 'ยังไม่มีบันทึก', tier: 'ok' });
    }

    // 2. Trend (rising RR / falling SpO2 / rising HR) ────────
    const trends = EOS.evalTrend(patient.hn, vitals);
    if (trends.length > 0) {
      const pts = trends.length >= 2 ? 3 : 2;
      factors.push({
        key: 'trend', pts,
        label: `Trend ผิดทิศ · ${trends.map(t => t.txt).join(' · ')}`,
        tier: 'fired',
      });
    } else if (all.length >= 2) {
      factors.push({ key: 'trend', pts: 0, label: 'Trend คงที่', tier: 'ok' });
    }

    // 3. KP risk ────────────────────────────────────────────
    const kp = patient.kpRisk ?? 0;
    let kpPts = 0, kpLabel = `KP risk ${kp.toFixed(2)}/1k`;
    if (kp >= 3) { kpPts = 3; kpLabel += ' (High)'; }
    else if (kp >= 1) { kpPts = 2; kpLabel += ' (Medium)'; }
    else if (kp >= 0.5) { kpPts = 1; kpLabel += ' (Borderline)'; }
    factors.push({ key: 'kp', pts: kpPts, label: kpLabel,
      tier: kpPts >= 3 ? 'fired' : kpPts >= 2 ? 'warn' : 'ok' });

    // 4. Maternal chorioamnionitis ──────────────────────────
    if (patient.intake?.chorio) {
      factors.push({ key: 'chorio', pts: 2, label: 'Chorioamnionitis ของมารดา', tier: 'fired' });
    }

    // 5. Overdue protocol ───────────────────────────────────
    const st = EOS.tpStatus(patient, vitals);
    if (st.cat === 'overdue') {
      const pts = st.hoursLate > 4 ? 2 : 1;
      factors.push({
        key: 'overdue', pts,
        label: `เลย Serial PE ${st.tp} · ${st.hoursLate?.toFixed(1)}h late`,
        tier: pts >= 2 ? 'fired' : 'warn',
      });
    }

    // 6. Skin / RD signs ─────────────────────────────────────
    if (last) {
      if (last.skin === 'Cyanotic') {
        factors.push({ key: 'skin', pts: 3, label: 'ผิว Cyanotic', tier: 'fired' });
      } else if (last.skin === 'Marbled' || last.skin === 'Pale') {
        factors.push({ key: 'skin', pts: 1, label: `ผิว ${last.skin}`, tier: 'warn' });
      }
      if (last.rd?.length >= 2) {
        factors.push({ key: 'rd', pts: 2, label: `RD signs · ${last.rd.join(', ')}`, tier: 'fired' });
      } else if (last.rd?.length === 1) {
        factors.push({ key: 'rd', pts: 1, label: `RD · ${last.rd[0]}`, tier: 'warn' });
      }
    }

    // 7. Lab signal — CRP elevated or low/very-high WBC ─────
    if (patient.labs) {
      const crp = patient.labs.hsCRP?.value;
      if (crp != null && crp > 10) {
        factors.push({ key: 'crp', pts: crp > 50 ? 2 : 1, label: `hs-CRP ${crp} mg/L`, tier: crp > 50 ? 'fired' : 'warn' });
      }
      const wbc = patient.labs.cbc?.wbc;
      if (wbc != null && (wbc < 5 || wbc > 30)) {
        factors.push({ key: 'wbc', pts: 1, label: `WBC ${wbc} (out of range)`, tier: 'warn' });
      }
    }

    const raw = factors.reduce((s, f) => s + f.pts, 0);
    const score = Math.min(10, raw);

    let band;
    if (score >= 8) band = { key: 'critical', label: 'Critical', cls: 's-critical', action: 'รีบประเมิน · พิจารณา Empiric ATB · แจ้งแพทย์' };
    else if (score >= 5) band = { key: 'concern', label: 'Concern',   cls: 's-concern', action: 'แจ้งแพทย์ · ทบทวน plan · ทำ Lab ซ้ำ' };
    else if (score >= 3) band = { key: 'watch',   label: 'Watch',     cls: 's-watch',   action: 'ติดตามใกล้ชิด · เพิ่มความถี่ vitals' };
    else                 band = { key: 'stable',  label: 'Stable',    cls: 's-stable',  action: 'ดำเนินตาม protocol ปกติ' };

    return { score, band, factors, raw };
  }

  return { score };
})();

// ════════════════════════════════════════
// SENTINEL CHIP — compact + large variants
// ════════════════════════════════════════
function SentinelChip({ patient, vitals, size = 'sm' }) {
  const s = window.Sentinel.score(patient, vitals);
  return (
    <span className={`sentinel ${s.band.cls} ${size === 'lg' ? 'lg' : ''}`}>
      <span className="num">{s.score}</span>
      <span>{size === 'lg' ? s.band.label.toUpperCase() : s.band.label}</span>
    </span>
  );
}

// ════════════════════════════════════════
// SENTINEL CARD — score + per-factor breakdown
// ════════════════════════════════════════
function SentinelCard({ patient, vitals }) {
  const s = window.Sentinel.score(patient, vitals);
  const fired = s.factors.filter(f => f.pts > 0);
  const ok    = s.factors.filter(f => f.pts === 0);

  return (
    <div className="senti-card">
      <div className="head">
        <div>
          <div style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Sentinel Score</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>คะแนนรวมการเสื่อมสภาพ · 0–10</div>
        </div>
        <SentinelChip patient={patient} vitals={vitals} size="lg"/>
      </div>

      <div style={{
        padding: '10px 12px',
        background: `color-mix(in oklab, var(--${s.band.key === 'critical' ? 'r' : s.band.key === 'concern' ? 'r' : s.band.key === 'watch' ? 'a' : 'g'}) 14%, var(--surface))`,
        borderRadius: 10,
        fontSize: 12.5, lineHeight: 1.5,
        marginBottom: 12,
        color: 'var(--ink-2)',
      }}>
        <span style={{ fontWeight: 700, color: `var(--${s.band.key === 'stable' ? 'g' : s.band.key === 'watch' ? 'a' : 'r'})` }}>
          คำแนะนำ ·{' '}
        </span>
        {s.band.action}
      </div>

      <div className="senti-factors">
        {fired.length === 0 ? (
          <div style={{ padding: 12, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12.5 }}>
            ไม่มีปัจจัยเสี่ยงที่เปิดใช้งาน
          </div>
        ) : fired.map((f, i) => (
          <div key={i} className={`senti-factor ${f.tier === 'fired' ? 'fired' : 'warn'}`}>
            <span className="ix">
              <Icon name={f.tier === 'fired' ? 'warn' : 'eye'} size={14}/>
            </span>
            <span className="lbl">{f.label}</span>
            <span className="pts">+{f.pts}</span>
          </div>
        ))}
      </div>

      {ok.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 11.5, color: 'var(--ink-3)', cursor: 'pointer', userSelect: 'none' }}>
            <Icon name="check" size={11}/> {ok.length} ปัจจัยปกติ
          </summary>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ok.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', fontSize: 12, color: 'var(--ink-3)' }}>
                <Icon name="check" size={11} color="var(--g)"/>
                {f.label}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

Object.assign(window, { SentinelChip, SentinelCard });
