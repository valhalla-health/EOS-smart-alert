// EOS v8 — Evidence-based citations + transparency disclaimer
// Sources the team can cite when this estimator is reviewed.

const EBM_REFS = [
  {
    key: 'puopolo-2011',
    short: 'Puopolo 2011',
    title: 'Estimating the probability of neonatal early-onset infection on the basis of maternal risk factors',
    journal: 'Pediatrics 2011;128(5):e1155-63',
    pmid: '22025590',
    role: 'Original Bayesian risk model · LR derivation',
  },
  {
    key: 'escobar-2014',
    short: 'Escobar 2014',
    title: "Stratification of risk of early-onset sepsis in newborns ≥34 weeks' gestation",
    journal: 'Pediatrics 2014;133(1):30–36',
    pmid: '24366992',
    role: 'Clinical-exam LR (well / equivocal / ill)',
  },
  {
    key: 'kuzniewicz-2017',
    short: 'Kuzniewicz 2017',
    title: 'A Quantitative, Risk-Based Approach to the Management of Neonatal Early-Onset Sepsis',
    journal: 'JAMA Pediatr 2017;171(4):365–371',
    pmid: '28241253',
    role: 'KP calculator validation · regression coefficients',
  },
  {
    key: 'aap-2018',
    short: 'Puopolo / AAP 2018',
    title: "Management of Neonates Born at ≥35 0/7 Weeks' Gestation with Suspected or Proven Early-Onset Bacterial Sepsis",
    journal: 'Pediatrics 2018;142(6):e20182894',
    pmid: '30455342',
    role: 'AAP clinical guideline · thresholds 1/1k & 3/1k',
  },
  {
    key: 'kuzniewicz-2024',
    short: 'Kuzniewicz 2024',
    title: 'Update to the Neonatal Early-Onset Sepsis Calculator Utilizing a Contemporary Cohort',
    journal: 'Pediatrics 2024;154(4):e2023065267',
    pmid: '39314183',
    role: 'Refit coefficients · 2010–2020 cohort',
  },
];

const REAL_CALC_URL = 'https://neonatalsepsiscalculator.kaiserpermanente.org';

function EbmDisclaimer({ compact = false }) {
  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 8px', borderRadius: 5,
        background: 'var(--a-tint)', color: 'var(--a)',
        font: '600 10px var(--f-mono)', letterSpacing: '.06em',
      }}>
        <Icon name="info" size={10}/>
        SIMPLIFIED · ตัวประมาณ
      </div>
    );
  }
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 10,
      background: 'var(--a-tint)',
      border: '1px solid var(--a-2)',
      color: 'var(--ink-2)',
      fontSize: 12.5, lineHeight: 1.55,
      marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: 'var(--a)', fontWeight: 700 }}>
        <Icon name="warn" size={14}/>
        ตัวประมาณค่า · ไม่ใช่เครื่องคำนวณ Kaiser Permanente ตัวจริง
      </div>
      <div>
        ระบบนี้ใช้ <b>simplified Bayesian model</b> (likelihood-ratio approximation) ที่ทิศทางตรงตามเอกสาร EBM
        แต่ <b>ไม่ใช่</b> logistic regression ของ Kuzniewicz et al. — สำหรับการตัดสินใจทางคลินิกจริง โปรดใช้เครื่องมือ KP ตัวจริง:{' '}
        <a href={REAL_CALC_URL} target="_blank" rel="noopener"
           style={{ color: 'var(--m)', textDecoration: 'underline' }}>
          neonatalsepsiscalculator.kaiserpermanente.org
        </a>
      </div>
    </div>
  );
}

function EvidencePanel() {
  return (
    <div className="card" style={{ marginTop: 18, padding: 16 }}>
      <div className="section-lbl" style={{ margin: '0 0 10px' }}>
        <Icon name="info" size={12}/>Evidence-based references
        <div className="ln"/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {EBM_REFS.map(r => (
          <a key={r.key}
             href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`}
             target="_blank" rel="noopener"
             style={{
               display: 'block',
               padding: '10px 12px',
               background: 'var(--surface-2)',
               border: '1px solid var(--line)',
               borderRadius: 8,
               textDecoration: 'none',
               color: 'var(--ink)',
               transition: 'border-color .12s',
             }}
             onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--m-2)'}
             onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{
                font: '700 10.5px var(--f-mono)', letterSpacing: '.06em',
                background: 'var(--m-tint)', color: 'var(--m)',
                padding: '2px 6px', borderRadius: 4,
              }}>{r.short}</span>
              <span style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>PMID {r.pmid}</span>
              <span style={{ flex: 1 }}/>
              <Icon name="arrow-right" size={11} color="var(--ink-3)"/>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.4, marginTop: 4, fontWeight: 500 }}>{r.title}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3, fontFamily: 'var(--f-mono)' }}>{r.journal}</div>
            <div style={{ fontSize: 11.5, color: 'var(--m-2)', marginTop: 5 }}>{r.role}</div>
          </a>
        ))}
      </div>
      <div style={{
        marginTop: 12, padding: '10px 12px',
        background: 'var(--surface-2)', borderRadius: 8,
        fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5,
        borderLeft: '3px solid var(--m)',
      }}>
        <b style={{ color: 'var(--ink-2)' }}>เกณฑ์การจัดการ (AAP 2018):</b>{' '}
        ความเสี่ยง ≥1/1,000 → blood culture + enhanced observation ·{' '}
        ความเสี่ยง ≥3/1,000 → blood culture + empiric antibiotic
      </div>
    </div>
  );
}

Object.assign(window, { EbmDisclaimer, EvidencePanel, EBM_REFS, REAL_CALC_URL });
