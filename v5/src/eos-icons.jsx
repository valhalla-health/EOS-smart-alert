// EOS Smart Alert · v6 — Icons
// Single Icon component looking up by name. Sized via `size` prop.

function Icon({ name, size = 18, stroke = 2, color = 'currentColor', className = '' }) {
  const s = size;
  const props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', className };
  switch (name) {
    case 'beds':
      return <svg {...props}><path d="M2 18V6"/><path d="M22 18v-4a2 2 0 0 0-2-2H8v6"/><path d="M2 18h20"/><circle cx="5" cy="10" r="2"/></svg>;
    case 'map':
      return <svg {...props}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14"/><path d="M15 6v14"/></svg>;
    case 'patients':
      return <svg {...props}><circle cx="9" cy="8" r="3.5"/><path d="M3 20c1-3 3.5-5 6-5s5 2 6 5"/><circle cx="17" cy="6" r="2.5"/><path d="M14 14c1-2 2-3 3-3s2 1 3 3"/></svg>;
    case 'baby':
      return <svg {...props}><circle cx="12" cy="9" r="6"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M10 13s.5 1 2 1 2-1 2-1"/><path d="M5 17c2 2 4 3 7 3s5-1 7-3"/></svg>;
    case 'triage':
      return <svg {...props}><path d="M9 4h6"/><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>;
    case 'calc':
      return <svg {...props}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6"/><path d="M9 11h.01"/><path d="M12 11h.01"/><path d="M15 11h.01"/><path d="M9 15h.01"/><path d="M12 15h.01"/><path d="M15 15h.01"/></svg>;
    case 'chart':
      return <svg {...props}><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-4"/></svg>;
    case 'bell':
      return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'bell-off':
      return <svg {...props}><path d="M9 4.5A6 6 0 0 1 18 8c0 7 3 8 3 8h-9"/><path d="M6 8a6 6 0 0 1 .8-3"/><path d="M3 3l18 18"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'abx':
      return <svg {...props}><path d="M14 4 4 14a4 4 0 0 0 6 6l10-10a4 4 0 0 0-6-6z"/><path d="M9 9l6 6"/></svg>;
    case 'calendar':
      return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>;
    case 'handoff':
      return <svg {...props}><path d="M7 4h10l3 6-3 6H7l-3-6z"/><path d="M9 10h6"/></svg>;
    case 'check':
      return <svg {...props}><path d="M4 12l5 5L20 6"/></svg>;
    case 'x':
      return <svg {...props}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case 'plus':
      return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'minus':
      return <svg {...props}><path d="M5 12h14"/></svg>;
    case 'arrow-right':
      return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'arrow-left':
      return <svg {...props}><path d="M19 12H5M11 19l-7-7 7-7"/></svg>;
    case 'arrow-up':
      return <svg {...props}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case 'arrow-down':
      return <svg {...props}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>;
    case 'chevron-right':
      return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
    case 'chevron-down':
      return <svg {...props}><path d="M6 9l6 6 6-6"/></svg>;
    case 'chevron-up':
      return <svg {...props}><path d="M18 15l-6-6-6 6"/></svg>;
    case 'eye':
      return <svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'warn':
      return <svg {...props}><path d="M12 3 2 20h20z"/><path d="M12 10v5"/><path d="M12 18h.01"/></svg>;
    case 'info':
      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v5h1"/></svg>;
    case 'clock':
      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'heart':
      return <svg {...props}><path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 6.5-7 11-7 11z"/></svg>;
    case 'pulse':
      return <svg {...props}><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>;
    case 'thermo':
      return <svg {...props}><path d="M14 4a2 2 0 0 0-4 0v10a4 4 0 1 0 4 0z"/><circle cx="12" cy="17" r="2" fill="currentColor"/></svg>;
    case 'lungs':
      return <svg {...props}><path d="M12 4v14"/><path d="M12 8c-1.5 0-4 1-5 3-1 3-1 7 0 8 2 1 5-2 5-4"/><path d="M12 8c1.5 0 4 1 5 3 1 3 1 7 0 8-2 1-5-2-5-4"/></svg>;
    case 'drop':
      return <svg {...props}><path d="M12 3s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"/></svg>;
    case 'settings':
      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .4 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.4 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .4-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.4h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.4l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.4 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case 'logout':
      return <svg {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>;
    case 'menu':
      return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'more':
      return <svg {...props}><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="6" cy="12" r="1.5" fill="currentColor"/><circle cx="18" cy="12" r="1.5" fill="currentColor"/></svg>;
    case 'filter':
      return <svg {...props}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>;
    case 'search':
      return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'shield':
      return <svg {...props}><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'shield-plus':
      return <svg {...props}><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z"/><path d="M12 9v6M9 12h6"/></svg>;
    case 'user':
      return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>;
    case 'sun':
      return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>;
    case 'moon':
      return <svg {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>;
    case 'list':
      return <svg {...props}><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>;
    case 'grid':
      return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'edit':
      return <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>;
    case 'save':
      return <svg {...props}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>;
    case 'sync':
      return <svg {...props}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>;
    case 'play':
      return <svg {...props}><path d="M5 3v18l16-9z" fill="currentColor"/></svg>;
    case 'pause':
      return <svg {...props}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
    case 'snooze':
      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9 9h6l-6 6h6"/></svg>;
    case 'check-circle':
      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>;
    case 'flag':
      return <svg {...props}><path d="M4 21V4l8 3 8-3v13l-8 3z"/><path d="M4 4v17"/></svg>;
    case 'lock':
      return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

window.Icon = Icon;
