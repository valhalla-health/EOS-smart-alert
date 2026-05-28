// EOS v8 — Command palette (extracted so v8-shell can use it without v7's App)

const { useState: useStateCmd, useEffect: useEffectCmd, useMemo: useMemoCmd, useRef: useRefCmd } = React;

const SECTION_META = {
  NAVIGATION: { icon: 'arrow-right', label: 'หน้าจอ · Navigation' },
  ACTIONS:    { icon: 'settings',    label: 'การทำงาน · Actions' },
  BABIES:     { icon: 'baby',        label: 'ทารกในระบบ · Babies' },
};

// Recognize a string that looks like a hotkey (single digit, single letter, ⌘+x, etc.)
const isHotkey = s => /^([⌘⌃⇧⌥]\s*\+?\s*)?[0-9a-zA-Z]$/.test(String(s || '').trim());

function CommandPalette({ items, onClose, onPick }) {
  const [q, setQ] = useStateCmd('');
  const [sel, setSel] = useStateCmd(0);
  const inputRef = useRefCmd(null);
  const listRef = useRefCmd(null);

  useEffectCmd(() => { inputRef.current?.focus(); }, []);

  const filtered = useMemoCmd(() => {
    if (!q) return items;
    const lc = q.toLowerCase();
    return items.filter(it => (it.label + ' ' + (it.sub || '') + ' ' + (it.keywords || '')).toLowerCase().includes(lc));
  }, [q, items]);

  useEffectCmd(() => { setSel(0); }, [q]);

  // keep selected item visible
  useEffectCmd(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('.cmd-item.sel');
    if (el && el.scrollIntoView) {
      const box = listRef.current.getBoundingClientRect();
      const er  = el.getBoundingClientRect();
      if (er.top < box.top || er.bottom > box.bottom) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [sel, filtered]);

  useEffectCmd(() => {
    const onKey = e => {
      if (e.key === 'Escape') { onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(filtered.length - 1, s + 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
      else if (e.key === 'Enter') {
        const item = filtered[sel];
        if (item) onPick(item);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, sel, onClose, onPick]);

  const grouped = useMemoCmd(() => {
    const out = [];
    let lastSection = null;
    filtered.forEach(it => {
      if (it.section !== lastSection) {
        out.push({ __sectionHeader: true, section: it.section });
        lastSection = it.section;
      }
      out.push(it);
    });
    return out;
  }, [filtered]);

  const sectionSummary = useMemoCmd(() => {
    const counts = {};
    items.forEach(it => { counts[it.section] = (counts[it.section] || 0) + 1; });
    return counts;
  }, [items]);

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-box" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-row">
          <Icon name="search" size={18} color="var(--ink-3)"/>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                 placeholder="ค้นหา HN, ชื่อ, เตียง, คำสั่ง…"/>
          {q && (
            <button className="ico-btn" style={{ width: 28, height: 28 }} onClick={() => setQ('')} title="Clear">
              <Icon name="x" size={14}/>
            </button>
          )}
          <span className="kbd">esc</span>
        </div>

        {/* Quick chips — visible only when input is empty */}
        {!q && (
          <div style={{
            display: 'flex', gap: 6, padding: '8px 14px',
            borderBottom: '1px solid var(--line)',
            flexWrap: 'wrap', alignItems: 'center',
          }}>
            <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', letterSpacing: '.1em', color: 'var(--ink-4)', textTransform: 'uppercase', marginRight: 4 }}>ลัด</span>
            <button className="cmd-quick" onClick={() => setQ('alert')}>เคสเร่งด่วน</button>
            <button className="cmd-quick" onClick={() => setQ('overdue')}>เลยกำหนด</button>
            <button className="cmd-quick" onClick={() => setQ('22B')}>ชั้น 22B</button>
            <button className="cmd-quick" onClick={() => setQ('17A')}>ชั้น 17A</button>
            <button className="cmd-quick" onClick={() => setQ('SCN')}>SCN</button>
          </div>
        )}

        <div className="cmd-list" ref={listRef}>
          {grouped.length === 0 ? (
            <div style={{ padding: '36px 24px', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', margin: '0 auto 10px', color: 'var(--ink-3)' }}>
                <Icon name="search" size={20}/>
              </div>
              <div style={{ color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 600 }}>ไม่พบผลลัพธ์</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>ลองพิมพ์ HN, ชื่อ, หมายเลขเตียง</div>
            </div>
          ) : grouped.map((it, i) => {
            if (it.__sectionHeader) {
              const meta = SECTION_META[it.section] || { icon: 'list', label: it.section };
              const ct = sectionSummary[it.section] || 0;
              return (
                <div key={'s-' + i} className="cmd-section" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name={meta.icon} size={11} color="var(--ink-4)"/>
                  <span style={{ flex: 1 }}>{meta.label}</span>
                  <span style={{ background: 'var(--surface-2)', color: 'var(--ink-3)', padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{ct}</span>
                </div>
              );
            }
            const itemIdx = filtered.indexOf(it);
            return (
              <div key={it.id} className={`cmd-item ${itemIdx === sel ? 'sel' : ''}`}
                onMouseEnter={() => setSel(itemIdx)}
                onClick={() => onPick(it)}>
                <span className="cmd-item-ico">
                  <Icon name={it.icon || 'arrow-right'} size={14} color="currentColor"/>
                </span>
                <span className="lbl">{it.label}</span>
                {it.sub && (
                  isHotkey(it.sub)
                    ? <span className="kbd" style={{ fontSize: 10.5 }}>{it.sub}</span>
                    : <span className="hint">{it.sub}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="cmd-footer">
          <span><span className="kbd">↑↓</span>นำทาง</span>
          <span><span className="kbd">↵</span>เลือก</span>
          <span><span className="kbd">esc</span>ปิด</span>
          <span style={{ flex: 1 }}/>
          <span style={{ color: 'var(--ink-4)' }}>{filtered.length} รายการ</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CommandPalette });
