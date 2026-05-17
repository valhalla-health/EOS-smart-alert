// EOS Smart Alert — Login Screen v2
// Design: Clinical Night Mode — navy bg, glass card, ECG animation
// Auth: Google Sign-In only (GAS server-side JWT verify) — email fallback removed

function LoginScreen({ onLogin }) {
  const { useState, useEffect } = React;
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { GOOGLE_CLIENT_ID } = EOS.AUTH;
    if (!GOOGLE_CLIENT_ID) return;
    const tryInit = () => {
      if (window.google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id:   GOOGLE_CLIENT_ID,
          callback:    handleGoogleCredential,
          auto_select: false,
        });
        const el = document.getElementById('gsi-btn-wrap');
        if (el) google.accounts.id.renderButton(el, {
          type: 'standard', size: 'large', shape: 'pill',
          theme: 'filled_black',
          width: Math.min(300, window.innerWidth - 80),
        });
      } else { setTimeout(tryInit, 400); }
    };
    tryInit();
  }, []);

  const handleGoogleCredential = async resp => {
    setLoading(true); setErr('');
    try {
      const gasUser = await EOS.loginGAS(resp.credential);
      if (!gasUser) {
        setErr('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        setLoading(false); return;
      }
      doLogin({ email: gasUser.email, name: gasUser.name, role: gasUser.role }, resp.credential);
    } catch {
      setErr('ยืนยันตัวตนไม่ได้ กรุณาลองใหม่');
      setLoading(false);
    }
  };

  const doLogin = (s, token) => {
    const sess = { ...s, loginAt: EOS.nowISO(), token: token || null };
    EOS.setSession(sess);
    EOS.auditLog('LOGIN', `${s.name} (${s.role})`);
    setLoading(false);
    onLogin(sess);
  };

  // ECG waveform path (P-QRS-T complex)
  const ECG = 'M0,20 L28,20 L32,18 L35,22 L37,20 L42,20 L46,2 L50,38 L54,2 L58,20 L63,20 L66,17 L69,23 L72,20 L120,20';

  const ROLES = [
    { label:'แพทย์',   icon:'👨‍⚕️' },
    { label:'พยาบาล', icon:'👩‍⚕️' },
    { label:'Admin',   icon:'🛡️'  },
  ];

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999, overflow:'hidden',
      background:'radial-gradient(ellipse at 25% 20%, #0f2744 0%, #0a1628 45%, #060e1c 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    }}>

      {/* ── Keyframes ─────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes ecg-run {
          0%   { stroke-dashoffset:300; opacity:0; }
          8%   { opacity:1; }
          72%  { opacity:1; stroke-dashoffset:0; }
          90%  { opacity:0; stroke-dashoffset:0; }
          100% { opacity:0; stroke-dashoffset:300; }
        }
        @keyframes ping {
          0%   { transform:scale(1); opacity:.7; }
          100% { transform:scale(2.2); opacity:0; }
        }
        @keyframes float-in {
          from { transform:translateY(32px); opacity:0; }
          to   { transform:translateY(0);    opacity:1; }
        }
        @keyframes glow {
          0%,100% { opacity:.35; }
          50%     { opacity:.7;  }
        }
        @keyframes spin {
          to { transform:rotate(360deg); }
        }
      `}}/>

      {/* ── Grid overlay ──────────────────────────────── */}
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.04,pointerEvents:'none'}} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="lg" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0L0 0 0 48" fill="none" stroke="#93c5fd" strokeWidth=".5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lg)"/>
      </svg>

      {/* ── Ambient glows ─────────────────────────────── */}
      <div style={{position:'absolute',top:'10%',left:'8%',   width:480,height:480,borderRadius:'50%',background:'radial-gradient(circle,rgba(96,165,250,.08),transparent 70%)',animation:'glow 5s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:'12%',right:'6%',width:360,height:360,borderRadius:'50%',background:'radial-gradient(circle,rgba(245,158,11,.07),transparent 70%)',animation:'glow 5s ease-in-out infinite 2.5s',pointerEvents:'none'}}/>

      {/* ── Glass card ────────────────────────────────── */}
      <div style={{
        animation:'float-in .65s cubic-bezier(.22,1,.36,1) forwards',
        background:'linear-gradient(145deg,rgba(255,255,255,.08) 0%,rgba(255,255,255,.03) 100%)',
        backdropFilter:'blur(28px)',
        border:'1px solid rgba(255,255,255,.11)',
        borderRadius:30,
        padding:'38px 34px 34px',
        width:'min(90vw,370px)',
        boxShadow:'0 40px 90px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.1)',
        display:'flex', flexDirection:'column', alignItems:'center',
      }}>

        {/* ECG strip */}
        <div style={{width:'100%',height:42,marginBottom:26,position:'relative',overflow:'hidden'}}>
          <svg viewBox="0 0 120 40" preserveAspectRatio="none" style={{width:'100%',height:'100%'}}>
            {/* ghost trail */}
            <path d={ECG} fill="none" stroke="rgba(245,158,11,.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            {/* animated trace */}
            <path d={ECG} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="300"
              style={{animation:'ecg-run 3.2s ease-in-out infinite'}}/>
          </svg>
          {/* live dot */}
          <div style={{position:'absolute',right:2,top:'50%',transform:'translateY(-50%)'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#f59e0b',position:'relative'}}>
              <div style={{position:'absolute',inset:-3,borderRadius:'50%',border:'2px solid #f59e0b',animation:'ping 1.6s ease-out infinite'}}/>
            </div>
          </div>
        </div>

        {/* Icon */}
        <div style={{
          width:66,height:66,borderRadius:20,marginBottom:18,
          background:'linear-gradient(135deg,rgba(96,165,250,.18),rgba(245,158,11,.14))',
          border:'1px solid rgba(255,255,255,.14)',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 8px 28px rgba(0,0,0,.35)',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.92)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z"/>
            <path d="M9 12h2v-2h2v2h2v2h-2v2h-2v-2H9z"/>
          </svg>
        </div>

        {/* Title */}
        <div style={{fontSize:23,fontWeight:700,color:'#fff',letterSpacing:'-.5px',marginBottom:6,textAlign:'center'}}>
          EOS Smart Alert
        </div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.42)',marginBottom:8,textAlign:'center',lineHeight:1.65}}>
          ระบบติดตาม Early-Onset Sepsis
        </div>
        <div style={{fontSize:11,color:'rgba(245,158,11,.65)',marginBottom:28,textAlign:'center',fontWeight:500,letterSpacing:.3}}>
          KCMH NICU · GA ≥ 34 สัปดาห์
        </div>

        {/* Role chips */}
        <div style={{display:'flex',gap:7,marginBottom:30}}>
          {ROLES.map(r => (
            <div key={r.label} style={{
              display:'flex',alignItems:'center',gap:5,
              padding:'5px 11px',borderRadius:999,
              background:'rgba(255,255,255,.06)',
              border:'1px solid rgba(255,255,255,.09)',
              fontSize:11,color:'rgba(255,255,255,.55)',
            }}>
              <span style={{fontSize:13}}>{r.icon}</span>{r.label}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{width:'100%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)',marginBottom:24}}/>

        {/* Google Sign-In */}
        <div style={{width:'100%',marginBottom:4}}>
          <div id="gsi-btn-wrap" style={{
            display:'flex',justifyContent:'center',minHeight:44,
            opacity: loading ? 0.4 : 1,
            pointerEvents: loading ? 'none' : 'auto',
            transition:'opacity .2s',
          }}/>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{display:'flex',alignItems:'center',gap:8,color:'rgba(255,255,255,.45)',fontSize:12,marginTop:12}}>
            <div style={{width:14,height:14,border:'2px solid rgba(245,158,11,.3)',borderTopColor:'#f59e0b',borderRadius:'50%',animation:'spin .75s linear infinite'}}/>
            กำลังยืนยันตัวตน…
          </div>
        )}

        {/* Error */}
        {err && (
          <div style={{
            marginTop:14,padding:'10px 14px',borderRadius:12,width:'100%',
            background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.22)',
            color:'#fca5a5',fontSize:12,textAlign:'center',lineHeight:1.55,
          }}>
            ⚠️ {err}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{marginTop:26,display:'flex',gap:18,fontSize:10.5,color:'rgba(255,255,255,.2)',letterSpacing:.3}}>
        {['EOS v3.0 React','IRB Approved','จุฬาลงกรณ์ 2026'].map(t=>(
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
