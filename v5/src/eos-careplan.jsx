// EOS v8 — Care Plan
// Per-patient checklist: protocol items + risk-driven add-ons + clinical milestones.
// Derives done/due/missed automatically from existing data.

const { useState: useStateCP, useMemo: useMemoCP } = React;

window.CarePlan = (() => {

  // Build derived checklist
  function build(patient, vitals, extras = {}) {
    const age = EOS.ageHours(patient);
    const all = EOS.vitalsFor(patient.hn, vitals);
    const done = EOS.doneTPs(patient.hn, vitals);
    const kp = patient.kpRisk ?? 0;
    const labs = patient.labs || {};
    const intake = patient.intake || {};
    const items = [];

    // ── 1. Triage decision ──────────────
    items.push({
      key: 'triage',
      cat: 'admit',
      title: 'ประเมิน Triage แรกรับ',
      sub: kp >= 3 ? 'High risk — H/C + CBC' : kp >= 1 ? 'Medium — Serial PE' : 'Low — Routine',
      status: 'done',
      when: 'ที่แรกรับ',
      by: 'พ.ยานี',
    });

    // ── 2. Serial PE protocol ───────────
    EOS.TIMEPOINTS.forEach((tp, i) => {
      const rec = all.find(v => v.ageHr === tp);
      const off = EOS.OFFSETS[tp];
      const isOverdue = !rec && age > off + 1;
      const isDue = !rec && age >= off - 0.5;
      const isFuture = !rec && age < off - 0.5;
      let status, when;
      if (rec) {
        status = 'done';
        when = `บันทึก ${EOS.fmtTime(rec.ts)}`;
      } else if (isOverdue) {
        status = 'miss';
        when = `เลย ${(age - off).toFixed(1)}h`;
      } else if (isDue) {
        status = 'due';
        when = 'ถึงเวลา';
      } else {
        status = 'pending';
        when = `ใน ${(off - age).toFixed(1)}h`;
      }
      items.push({
        key: 'pe-' + tp,
        cat: 'protocol',
        title: `Serial PE · ${tp}`,
        sub: 'T · HR · RR · SpO₂ · skin · RD',
        status, when,
        by: rec?.by,
      });
    });

    // ── 3. ABX time-outs ────────────────
    if (kp >= 1 || intake.chorio) {
      ['36 hr', '44 hr'].forEach(tp => {
        const rec = all.find(v => v.ageHr === tp);
        const approved = rec?.abxApproved;
        items.push({
          key: 'abx-' + tp,
          cat: 'decision',
          title: `ABX Time-Out · ${tp}`,
          sub: 'ตัดสินใจหยุด/ต่อ antibiotic',
          status: approved ? 'done' : rec ? 'due' : 'pending',
          when: approved ? `${rec.abxDecision === 'stop' ? 'หยุด' : 'ต่อ'} ${EOS.fmtTime(rec.abxAt)}` : rec ? 'รอแพทย์' : '—',
          by: rec?.abxBy,
        });
      });
    }

    // ── 4. Labs (if high-risk) ──────────
    if (kp >= 1 || intake.chorio) {
      items.push({
        key: 'lab-cbc',
        cat: 'labs',
        title: 'CBC + Differential',
        sub: 'WBC · ANC · Plt · Hb',
        status: labs.cbc ? 'done' : age >= 6 ? 'miss' : 'pending',
        when: labs.cbc ? `เจาะ @${labs.cbc.drawnAtHr}h` : age >= 6 ? 'ต้องเจาะแล้ว' : `ภายใน 6h`,
      });
      items.push({
        key: 'lab-crp',
        cat: 'labs',
        title: 'hs-CRP',
        sub: 'ติดตามที่ 10–24h',
        status: labs.hsCRP ? 'done' : age >= 12 ? 'due' : 'pending',
        when: labs.hsCRP ? `${labs.hsCRP.value} mg/L @${labs.hsCRP.drawnAtHr}h` : age >= 12 ? 'ถึงเวลา' : `ภายใน ${(12 - age).toFixed(1)}h`,
      });
      items.push({
        key: 'lab-hc',
        cat: 'labs',
        title: 'Hemoculture',
        sub: 'ก่อนเริ่ม antibiotic',
        status: labs.hc ? 'done' : 'pending',
        when: labs.hc ? `${labs.hc.status} @${labs.hc.drawnAtHr}h` : '—',
      });
    }

    // ── 5. ATB start ────────────────────
    if (kp >= 3 || intake.chorio) {
      const started = labs.abxStartedAtHr != null;
      items.push({
        key: 'abx-start',
        cat: 'med',
        title: 'เริ่ม Empiric Antibiotic',
        sub: 'Ampicillin + Gentamicin (ภายใน 1h)',
        status: started ? 'done' : age >= 1 ? 'miss' : 'due',
        when: started ? `เริ่ม @${labs.abxStartedAtHr}h` : 'ASAP',
      });
    }

    // ── 6. Parent communication ─────────
    items.push({
      key: 'family',
      cat: 'family',
      title: 'แจ้งครอบครัว',
      sub: kp >= 1 ? 'อธิบาย plan + risk' : 'อธิบาย routine',
      status: extras.familyTold ? 'done' : age >= 4 ? 'due' : 'pending',
      when: extras.familyTold ? 'แจ้งแล้ว' : age >= 4 ? 'ควรแจ้งวันนี้' : `ภายใน ${(4 - age).toFixed(1)}h`,
    });

    // ── 7. Discharge readiness ──────────
    if (age >= 36) {
      const complete = done.size === EOS.TIMEPOINTS.length;
      const noAlerts = !all.some(v => EOS.evalVitals(v).some(x => x.sev === 'red'));
      items.push({
        key: 'dc',
        cat: 'discharge',
        title: 'พิจารณา Discharge',
        sub: 'protocol complete + อาการดี',
        status: complete && noAlerts ? 'due' : 'pending',
        when: complete && noAlerts ? 'พร้อม' : 'ยังไม่ครบ',
      });
    }

    return items;
  }

  return { build };
})();

// ════════════════════════════════════════
// CARE PLAN CARD
// ════════════════════════════════════════
function CarePlanCard({ patient, vitals }) {
  const [familyTold, setFamilyTold] = useStateCP(false);
  const items = window.CarePlan.build(patient, vitals, { familyTold });
  const doneN = items.filter(i => i.status === 'done').length;
  const missN = items.filter(i => i.status === 'miss').length;
  const dueN  = items.filter(i => i.status === 'due').length;
  const pct = items.length ? Math.round((doneN / items.length) * 100) : 0;

  // Group by category
  const groups = useMemoCP(() => {
    const cats = ['admit', 'protocol', 'decision', 'labs', 'med', 'family', 'discharge'];
    const labels = {
      admit: 'แรกรับ',
      protocol: 'Serial PE protocol',
      decision: 'การตัดสินใจ',
      labs: 'Labs',
      med: 'ยา / Antibiotic',
      family: 'ครอบครัว',
      discharge: 'จำหน่าย',
    };
    const out = [];
    cats.forEach(c => {
      const its = items.filter(i => i.cat === c);
      if (its.length) out.push({ cat: c, label: labels[c], items: its });
    });
    return out;
  }, [items]);

  return (
    <div>
      <div className="section-lbl" style={{ marginTop: 0 }}>
        <Icon name="check-circle" size={12}/>Care Plan
        {(missN > 0 || dueN > 0) && (
          <span style={{
            marginLeft: 'auto',
            display: 'inline-flex', gap: 6,
          }}>
            {missN > 0 && <span style={{ background: 'var(--r-tint)', color: 'var(--r)', padding: '2px 7px', borderRadius: 4, fontSize: 10.5 }}>{missN} miss</span>}
            {dueN > 0 && <span style={{ background: 'var(--a-tint)', color: 'var(--a)', padding: '2px 7px', borderRadius: 4, fontSize: 10.5 }}>{dueN} due</span>}
          </span>
        )}
        <div className="ln"/>
      </div>

      <div className="care-plan">
        {groups.map(g => (
          <div key={g.cat}>
            <div style={{
              padding: '8px 16px 4px',
              fontSize: 10.5, fontFamily: 'var(--f-mono)',
              letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-4)',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--line)',
            }}>{g.label}</div>
            {g.items.map(it => (
              <div key={it.key}
                   className={`care-row ${it.status}`}
                   onClick={() => { if (it.key === 'family') setFamilyTold(v => !v); }}>
                <div className="care-box">
                  {it.status === 'done' && <Icon name="check" size={13} color="#06190d"/>}
                  {it.status === 'miss' && <Icon name="warn" size={12} color="var(--r)"/>}
                  {it.status === 'due'  && <Icon name="clock" size={12} color="var(--a)"/>}
                </div>
                <div>
                  <div className="title">{it.title}</div>
                  <div className="sub">{it.sub}{it.by ? ` · ${it.by}` : ''}</div>
                </div>
                <div className="when">{it.when}</div>
                <div>
                  {it.status !== 'done' && (
                    <Icon name="chevron-right" size={14} color="var(--ink-4)"/>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="care-progress">
          <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--ink-3)', letterSpacing: '.08em' }}>
            {doneN}/{items.length}
          </div>
          <div className="care-bar"><div style={{ width: pct + '%' }}/></div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--m)', fontFamily: 'var(--f-mono)' }}>{pct}%</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CarePlanCard });
