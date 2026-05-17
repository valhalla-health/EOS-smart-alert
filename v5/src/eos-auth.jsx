// EOS Smart Alert — Login Screen v2.1
// Clinical Night Mode: navy, glass card, ECG animation
// Auth: Google Sign-In only — server-side JWT verify via GAS

function LoginScreen({ onLogin }) {
  const { useState, useEffect } = React;
  const [err,     setErr]     = useState('');
  const [errSub,  setErrSub]  = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { GOOGLE_CLIENT_ID } = EOS.AUTH;
    if (!GOOGLE_CLIENT_ID) return;

    let attempts = 0;
    const tryInit = () => {
      attempts++;
      if (attempts > 20) return; // หยุดหลังจาก 8 วินาที

      if (!window.google?.accounts?.id) {
        setTimeout(tryInit, 400); return;
      }

      // Re-initialize ทุกครั้ง (สำคัญ: ต้องทำใหม่หลัง logout)
      google.accounts.id.initialize({
        client_id:   GOOGLE_CLIENT_ID,
        callback:    handleGoogleCredential,
        auto_select: false,
      });

      // รอให้ DOM element พร้อม
      const render = () => {
        const el = document.getElementById('gsi-btn-wrap');
        if (!el) { setTimeout(render, 100); return; }
        // ล้าง content เก่าก่อน render ใหม่
        el.innerHTML = '';
        google.accounts.id.renderButton(el, {
          type:'standard', size:'large', shape:'pill',
          theme:'filled_black',
          width: Math.min(300, window.innerWidth - 80),
        });
      };
      render();
    };

    // delay เล็กน้อยให้แน่ใจว่า DOM mount แล้ว
    setTimeout(tryInit, 50);
  }, []);

  const handleGoogleCredential = async resp => {
    setLoading(true); setErr(''); setErrSub('');
    try {
      const result = await EOS.loginGAS(resp.credential);

      if (result?.status === 'ok') {
        doLogin({ email:result.email, name:result.name, role:result.role }, resp.credential);
        return;
      }

      // ── Map error status → user-friendly message ──
      if (result?.status === 'unauthorized') {
        setErr('ไม่มีสิทธิ์เข้าใช้งาน');
        setErrSub('กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มบัญชีของคุณ');
      } else if (result?.status === 'network_error') {
        setErr('ไม่สามารถเชื่อมต่อ server');
        setErrSub(`HTTP ${result.code||'?'} — ตรวจ GAS webhook URL ใน Config`);
      } else {
        setErr('เกิดข้อผิดพลาด');
        setErrSub(result?.message || 'กรุณาลองใหม่อีกครั้ง');
      }
    } catch (e) {
      setErr('ยืนยันตัวตนไม่ได้');
      setErrSub(e?.message || 'กรุณาลองใหม่');
    }
    setLoading(false);
  };

  const doLogin = (s, token) => {
    const sess = { ...s, loginAt:EOS.nowISO(), token:token||null };
    EOS.setSession(sess);
    EOS.auditLog('LOGIN', `${s.name} (${s.role})`);
    setLoading(false);
    onLogin(sess);
  };

  const ECG = 'M0,20 L28,20 L32,18 L35,22 L37,20 L42,20 L46,2 L50,38 L54,2 L58,20 L63,20 L66,17 L69,23 L72,20 L120,20';

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999, overflow:'hidden',
      background:'radial-gradient(ellipse at 25% 20%, #0f2744 0%, #0a1628 45%, #060e1c 100%)',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
    }}>

      <style dangerouslySetInnerHTML={{__html:`
        @keyframes ecg-run {
          0%  { stroke-dashoffset:300; opacity:0; }
          8%  { opacity:1; }
          72% { opacity:1; stroke-dashoffset:0; }
          90% { opacity:0; stroke-dashoffset:0; }
          100%{ opacity:0; stroke-dashoffset:300; }
        }
        @keyframes ping {
          0%  { transform:scale(1); opacity:.7; }
          100%{ transform:scale(2.2); opacity:0; }
        }
        @keyframes float-in {
          from { transform:translateY(28px); opacity:0; }
          to   { transform:translateY(0);    opacity:1; }
        }
        @keyframes glow {
          0%,100%{ opacity:.3; }
          50%    { opacity:.65; }
        }
        @keyframes spin {
          to{ transform:rotate(360deg); }
        }
      `}}/>

      {/* Grid */}
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.04,pointerEvents:'none'}}>
        <defs>
          <pattern id="lg" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0L0 0 0 48" fill="none" stroke="#93c5fd" strokeWidth=".5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lg)"/>
      </svg>

      {/* Glows */}
      <div style={{position:'absolute',top:'8%',left:'6%',   width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(96,165,250,.08),transparent 70%)',animation:'glow 5s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:'10%',right:'5%',width:380,height:380,borderRadius:'50%',background:'radial-gradient(circle,rgba(245,158,11,.07),transparent 70%)',animation:'glow 5s ease-in-out infinite 2.5s',pointerEvents:'none'}}/>

      {/* Glass card */}
      <div style={{
        animation:'float-in .6s cubic-bezier(.22,1,.36,1) forwards',
        background:'linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.03))',
        backdropFilter:'blur(28px)',
        border:'1px solid rgba(255,255,255,.11)',
        borderRadius:30,
        padding:'40px 36px 36px',
        width:'min(90vw,380px)',
        boxShadow:'0 40px 90px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.1)',
        display:'flex', flexDirection:'column', alignItems:'center',
      }}>

        {/* ECG */}
        <div style={{width:'100%',height:44,marginBottom:28,position:'relative',overflow:'hidden'}}>
          <svg viewBox="0 0 120 40" preserveAspectRatio="none" style={{width:'100%',height:'100%'}}>
            <path d={ECG} fill="none" stroke="rgba(245,158,11,.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d={ECG} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="300" style={{animation:'ecg-run 3.2s ease-in-out infinite'}}/>
          </svg>
          <div style={{position:'absolute',right:2,top:'50%',transform:'translateY(-50%)'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#f59e0b',position:'relative'}}>
              <div style={{position:'absolute',inset:-3,borderRadius:'50%',border:'2px solid #f59e0b',animation:'ping 1.6s ease-out infinite'}}/>
            </div>
          </div>
        </div>

        {/* Icon */}
        <div style={{
          width:72,height:72,borderRadius:22,marginBottom:20,
          background:'linear-gradient(135deg,rgba(96,165,250,.18),rgba(245,158,11,.14))',
          border:'1px solid rgba(255,255,255,.14)',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 8px 28px rgba(0,0,0,.35)',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z"/>
            <path d="M9 12h2v-2h2v2h2v2h-2v2h-2v-2H9z"/>
          </svg>
        </div>

        {/* Title */}
        <div style={{fontSize:26,fontWeight:700,color:'#fff',letterSpacing:'-.5px',marginBottom:8,textAlign:'center'}}>
          EOS Smart Alert
        </div>
        <div style={{fontSize:15,color:'rgba(255,255,255,.5)',marginBottom:32,textAlign:'center',lineHeight:1.6}}>
          ระบบติดตาม Early-Onset Sepsis
        </div>

        {/* Divider */}
        <div style={{width:'100%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)',marginBottom:26}}/>

        {/* Google Sign-In */}
        <div style={{width:'100%',marginBottom:4}}>
          <div id="gsi-btn-wrap" style={{
            display:'flex', justifyContent:'center', minHeight:46,
            opacity: loading ? 0.4 : 1,
            pointerEvents: loading ? 'none' : 'auto',
            transition:'opacity .2s',
          }}/>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{display:'flex',alignItems:'center',gap:8,color:'rgba(255,255,255,.45)',fontSize:13,marginTop:14}}>
            <div style={{width:15,height:15,border:'2px solid rgba(245,158,11,.3)',borderTopColor:'#f59e0b',borderRadius:'50%',animation:'spin .75s linear infinite'}}/>
            กำลังยืนยันตัวตน…
          </div>
        )}

        {/* Error */}
        {err && (
          <div style={{
            marginTop:16,padding:'12px 16px',borderRadius:12,width:'100%',
            background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.22)',
            color:'#fca5a5',textAlign:'center',
          }}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:errSub?4:0}}>⚠️ {err}</div>
            {errSub && <div style={{fontSize:12,opacity:.75}}>{errSub}</div>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{marginTop:24,display:'flex',gap:20,fontSize:11,color:'rgba(255,255,255,.22)',letterSpacing:.3}}>
        <span>EOS v3.0</span>
        <span>·</span>
        <span>Valhalla Team</span>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
