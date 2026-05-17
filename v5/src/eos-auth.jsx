// EOS Smart Alert — Login Screen component
// SRP: Google Sign-In, email lookup, session creation. No panel logic.

function LoginScreen({ onLogin }) {
  const { useState, useEffect } = React;
  const [step,    setStep]    = useState(1);
  const [email,   setEmail]   = useState('');
  const [staff,   setStaff]   = useState(null);
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { GOOGLE_CLIENT_ID } = EOS.AUTH;
    if (!GOOGLE_CLIENT_ID) return;
    const tryInit = () => {
      if (window.google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback:  handleGoogleCredential,
          auto_select: false,
        });
        const el = document.getElementById('gsi-btn-wrap');
        if (el) google.accounts.id.renderButton(el, {type:'standard',size:'large',width:280,theme:'outline'});
      } else { setTimeout(tryInit, 400); }
    };
    tryInit();
  }, []);

  const handleGoogleCredential = async resp => {
    setLoading(true);
    setErr('');
    try {
      // ── 1. ถอดรหัส JWT เพื่อดู email (client-side ยังไม่ verify) ──
      const [, payload] = resp.credential.split('.');
      const data = JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/')));

      // ── 2. ตรวจสอบกับ GAS server (server-side JWT verify) ─────────
      const gasUser = await EOS.loginGAS(resp.credential);
      if (!gasUser) {
        setErr(`ไม่พบบัญชี ${data.email||''} ในระบบ หรือบัญชีถูกระงับ`);
        setLoading(false); return;
      }

      // ── 3. เข้าสู่ระบบด้วยข้อมูลจาก GAS (trusted) ──────────────
      doLogin({ email: gasUser.email, name: gasUser.name, role: gasUser.role }, resp.credential);
    } catch (e) {
      setErr('ยืนยันตัวตนไม่ได้ กรุณาลองใหม่');
      setLoading(false);
    }
  };

  const lookupEmail = () => {
    setErr('');
    const found = EOS.findStaffByEmail(email.trim());
    if (!found) { setErr('ไม่พบอีเมลนี้ในระบบ'); return; }
    setStaff(found); setStep(2);
  };

  const doLogin = (s, token) => {
    // สร้าง session object ครั้งเดียว — ป้องกัน loginAt timestamp ต่างกัน 2 ตัว
    const sess = { ...s, loginAt: EOS.nowISO(), token: token || null };
    EOS.setSession(sess);
    EOS.auditLog('LOGIN', `${s.name} (${s.role})`);
    setLoading(false);
    onLogin(sess);
  };

  const rc = staff ? EOS.ROLE_CFG[staff.role] : null;

  // Shared input style
  const inputStyle = {
    padding:'10px 13px', border:'1.5px solid #e3e2da', borderRadius:8,
    fontSize:14, width:'100%', outline:'none', fontFamily:'inherit',
    background:'#fff', transition:'border-color .12s',
  };
  const btnPrimary = {
    padding:'11px 20px', background:'#0e7a72', color:'#fff', border:'none',
    borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
    transition:'background .12s', width:'100%',
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'linear-gradient(135deg, #0e1816 0%, #0e7a72 50%, #0a1512 100%)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }}>
      {/* dot-grid overlay */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px)',backgroundSize:'28px 28px'}}/>

      <div style={{
        display:'flex', borderRadius:18, overflow:'hidden',
        width:'min(92vw,820px)', position:'relative', zIndex:1,
        boxShadow:'0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.06)',
      }}>
        {/* ── Brand panel ── */}
        <div style={{
          background:'linear-gradient(160deg,#115e59,#134e4a)',
          padding:'44px 36px', minWidth:280, color:'#fff',
          display:'flex', flexDirection:'column', justifyContent:'center',
          position:'relative', overflow:'hidden',
          borderRight:'1px solid rgba(255,255,255,.08)',
        }}>
          <div style={{position:'absolute',top:-80,right:-80,width:260,height:260,borderRadius:'50%',background:'radial-gradient(circle,rgba(20,184,166,.18),transparent 70%)'}}/>
          <div style={{width:60,height:60,borderRadius:16,marginBottom:28,background:'rgba(20,184,166,.2)',border:'1px solid rgba(20,184,166,.35)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:1}}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z"/>
              <path d="M9 12h2v-2h2v2h2v2h-2v2h-2v-2H9z"/>
            </svg>
          </div>
          <h1 style={{fontSize:24,fontWeight:700,margin:'0 0 10px',letterSpacing:'-.4px',position:'relative',zIndex:1}}>EOS Smart Alert</h1>
          <p style={{fontSize:12.5,lineHeight:1.65,color:'rgba(255,255,255,.65)',margin:0,position:'relative',zIndex:1}}>
            ระบบติดตามและแจ้งเตือน<br/>Early-Onset Sepsis<br/>ทารกแรกเกิด GA ≥ 34 สัปดาห์
          </p>
          <div style={{display:'flex',gap:6,marginTop:22,flexWrap:'wrap',position:'relative',zIndex:1}}>
            {['NICU','v3.0 React','จุฬาลงกรณ์'].map(t=>(
              <span key={t} style={{padding:'3px 10px',borderRadius:999,fontSize:10,fontWeight:600,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.12)',color:'rgba(255,255,255,.8)'}}>{t}</span>
            ))}
          </div>
        </div>

        {/* ── Form panel ── */}
        <div style={{background:'#fff',padding:'44px 36px',flex:1,display:'flex',flexDirection:'column',justifyContent:'center'}}>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:5,letterSpacing:'-.3px',color:'#15201d'}}>เข้าสู่ระบบ</h2>
          <p style={{fontSize:13,color:'#7a857f',marginBottom:26}}>บัญชี Google ที่ลงทะเบียนใน EOS Smart Alert</p>

          {step===1 && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Google Sign-In */}
              <div id="gsi-btn-wrap" style={{display:'flex',justifyContent:'center',minHeight:44}}/>

              <div style={{display:'flex',alignItems:'center',gap:10,color:'#a8b0a9',fontSize:11}}>
                <div style={{flex:1,height:1,background:'#e3e2da'}}/><span>หรือ</span><div style={{flex:1,height:1,background:'#e3e2da'}}/>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <label style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.6px',color:'#3a4945'}}>อีเมล</label>
                <input type="email" value={email} placeholder="name@gmail.com"
                  onChange={e=>setEmail(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&lookupEmail()}
                  style={inputStyle}
                  onFocus={e=>e.target.style.borderColor='#0e7a72'}
                  onBlur={e =>e.target.style.borderColor='#e3e2da'}
                />
              </div>
              <button onClick={lookupEmail} style={btnPrimary}
                onMouseOver={e=>e.currentTarget.style.background='#0a5d56'}
                onMouseOut={e =>e.currentTarget.style.background='#0e7a72'}>
                เข้าสู่ระบบ
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5"/></svg>
              </button>
              {err && <div style={{color:'#c8102e',fontSize:12,textAlign:'center',fontWeight:500}}>{err}</div>}
            </div>
          )}

          {step===2 && staff && rc && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <button onClick={()=>{setStep(1);setStaff(null);setErr('');}} style={{background:'none',border:'none',color:'#7a857f',fontSize:12,cursor:'pointer',padding:'6px 0',display:'flex',alignItems:'center',gap:6,fontWeight:500}}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
                เปลี่ยนบัญชี
              </button>

              <div style={{background:'#f1fdf9',border:'1.5px solid #b9d7be',borderRadius:10,padding:'14px 16px',display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:44,height:44,borderRadius:10,background:rc.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{rc.icon}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:'#15201d'}}>{staff.name}</div>
                  <span style={{display:'inline-block',marginTop:4,padding:'2px 9px',borderRadius:999,fontSize:11,fontWeight:600,background:rc.bg,color:rc.color}}>{rc.label}</span>
                </div>
              </div>

              <button onClick={()=>doLogin(staff)} disabled={loading}
                style={{...btnPrimary, opacity:loading?.7:1}}
                onMouseOver={e=>e.currentTarget.style.background='#0a5d56'}
                onMouseOut={e =>e.currentTarget.style.background='#0e7a72'}>
                {loading ? 'กำลังเข้าสู่ระบบ…' : <>ยืนยันเข้าสู่ระบบ <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5"/></svg></>}
              </button>
              {err && <div style={{color:'#c8102e',fontSize:12,textAlign:'center',fontWeight:500}}>{err}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
