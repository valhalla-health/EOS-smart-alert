// EOS Smart Alert — Icon component (SVG icon set)
const Icon = ({ name, size = 18, ...rest }) => {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return React.createElement('svg', { width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round', ...rest }, d);
};

const ICON_PATHS = {
  board:      React.createElement(React.Fragment,null,React.createElement('rect',{x:'3',y:'4',width:'18',height:'16',rx:'2'}),React.createElement('path',{d:'M3 9h18M9 9v11M15 9v11'})),
  triage:     React.createElement(React.Fragment,null,React.createElement('path',{d:'M4 4h16M6 4v6c0 2.2 1.8 4 4 4h4c2.2 0 4-1.8 4-4V4M9 14v6M15 14v6'})),
  patients:   React.createElement(React.Fragment,null,React.createElement('circle',{cx:'9',cy:'8',r:'3.5'}),React.createElement('path',{d:'M3 21c0-3.3 2.7-6 6-6s6 2.7 6 6'}),React.createElement('circle',{cx:'17',cy:'7',r:'2.5'}),React.createElement('path',{d:'M15 14c2 0 6 1 6 5'})),
  bell:       React.createElement(React.Fragment,null,React.createElement('path',{d:'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'}),React.createElement('path',{d:'M10 21a2 2 0 0 0 4 0'})),
  calc:       React.createElement(React.Fragment,null,React.createElement('rect',{x:'4',y:'3',width:'16',height:'18',rx:'2'}),React.createElement('path',{d:'M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01'})),
  cog:        React.createElement(React.Fragment,null,React.createElement('circle',{cx:'12',cy:'12',r:'3'}),React.createElement('path',{d:'M19.4 15a1.7 1.7 0 0 0 .4 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.4 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .4-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.4H9A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.4l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.4 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'})),
  warn:       React.createElement(React.Fragment,null,React.createElement('path',{d:'M12 3 2 21h20L12 3z'}),React.createElement('path',{d:'M12 10v5'}),React.createElement('circle',{cx:'12',cy:'18',r:'.5',fill:'currentColor'})),
  check:      React.createElement('polyline',{points:'4 12 10 18 20 6'}),
  clock:      React.createElement(React.Fragment,null,React.createElement('circle',{cx:'12',cy:'12',r:'9'}),React.createElement('path',{d:'M12 7v5l3 2'})),
  plus:       React.createElement('path',{d:'M12 5v14M5 12h14'}),
  search:     React.createElement(React.Fragment,null,React.createElement('circle',{cx:'11',cy:'11',r:'7'}),React.createElement('path',{d:'m20 20-3.5-3.5'})),
  arrow_left: React.createElement(React.Fragment,null,React.createElement('path',{d:'M19 12H5'}),React.createElement('polyline',{points:'11 6 5 12 11 18'})),
  logout:     React.createElement(React.Fragment,null,React.createElement('path',{d:'M15 17l5-5-5-5'}),React.createElement('path',{d:'M20 12H9'}),React.createElement('path',{d:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'})),
  syringe:    React.createElement(React.Fragment,null,React.createElement('path',{d:'M18 2 22 6M19 5 14 10M5 19l9-9 4 4-9 9H5v-4z'}),React.createElement('path',{d:'M11 13l2 2'})),
  list:       React.createElement(React.Fragment,null,React.createElement('path',{d:'M8 6h13M8 12h13M8 18h13'}),React.createElement('circle',{cx:'3.5',cy:'6',r:'1',fill:'currentColor'}),React.createElement('circle',{cx:'3.5',cy:'12',r:'1',fill:'currentColor'}),React.createElement('circle',{cx:'3.5',cy:'18',r:'1',fill:'currentColor'})),
  eye:        React.createElement(React.Fragment,null,React.createElement('path',{d:'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'}),React.createElement('circle',{cx:'12',cy:'12',r:'3'})),
  download:   React.createElement(React.Fragment,null,React.createElement('path',{d:'M12 3v12'}),React.createElement('polyline',{points:'6 11 12 17 18 11'}),React.createElement('path',{d:'M5 21h14'})),
  print:      React.createElement(React.Fragment,null,React.createElement('polyline',{points:'6 9 6 3 18 3 18 9'}),React.createElement('rect',{x:'4',y:'9',width:'16',height:'9',rx:'2'}),React.createElement('rect',{x:'7',y:'14',width:'10',height:'7'})),
  filter:     React.createElement('path',{d:'M3 5h18l-7 9v6l-4-2v-4L3 5z'}),
  x:          React.createElement('path',{d:'M6 6l12 12M18 6 6 18'}),
  signature:  React.createElement(React.Fragment,null,React.createElement('path',{d:'M3 17c4 0 4-10 8-10s4 10 8 10'}),React.createElement('path',{d:'M3 21h18'})),
  abx:        React.createElement(React.Fragment,null,React.createElement('circle',{cx:'12',cy:'12',r:'3'}),React.createElement('path',{d:'M12 3v3M12 18v3M3 12h3M18 12h3'})),
  chart:      React.createElement(React.Fragment,null,React.createElement('polyline',{points:'22 12 18 12 15 21 9 3 6 12 2 12'})),
  lock:       React.createElement(React.Fragment,null,React.createElement('rect',{x:'3',y:'11',width:'18',height:'11',rx:'2'}),React.createElement('path',{d:'M7 11V7a5 5 0 0 1 10 0v4'})),
  users:      React.createElement(React.Fragment,null,React.createElement('circle',{cx:'9',cy:'8',r:'3.5'}),React.createElement('path',{d:'M3 21c0-3.3 2.7-6 6-6s6 2.7 6 6'}),React.createElement('circle',{cx:'17',cy:'7',r:'2.5'}),React.createElement('path',{d:'M15 14c2 0 6 1 6 5'})),
  refresh:    React.createElement(React.Fragment,null,React.createElement('polyline',{points:'23 4 23 10 17 10'}),React.createElement('path',{d:'M20.5 15a9 9 0 1 1-2.2-9.2L23 10'})),
  handoff:    React.createElement(React.Fragment,null,React.createElement('path',{d:'M5 12h14M13 5l7 7-7 7'})),
  calendar:   React.createElement(React.Fragment,null,React.createElement('rect',{x:'3',y:'4',width:'18',height:'18',rx:'2'}),React.createElement('path',{d:'M16 2v4M8 2v4M3 10h18'})),
};

window.Icon = Icon;
