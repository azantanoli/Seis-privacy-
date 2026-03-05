import { useState, useEffect, useRef, useCallback } from "react";

const P = "#6A0DAD", PL = "#8B2FC9", PP = "#F3E8FF", PB = "#D8B4FE";
const G = "#16a34a", R = "#dc2626";

const rHex = (n) => [...Array(n)].map(() => Math.floor(Math.random()*16).toString(16)).join("");
const genAddr = () => "0x" + rHex(40);
const WORDS = ["apple","bridge","castle","dragon","eagle","forest","garden","harbor","island","jungle","kitten","lemon","mango","noble","ocean","palace","quartz","rabbit","silver","tiger","urban","valley","wisdom","xenon","yellow","zenith"];
const genSeed = () => [...WORDS].sort(() => Math.random()-.5).slice(0,12);
const calcScore = (txs) => !txs.length ? 0 : Math.round(txs.filter(t=>!t.priv).length/txs.length*100);
const scoreInfo = (s) => s<=30?{label:"Highly Private",c:G}:s<=70?{label:"Moderate Exposure",c:"#d97706"}:{label:"High Exposure",c:R};

// LocalStorage helpers — simulate persistent accounts
const DB = {
  getAccounts: () => JSON.parse(localStorage.getItem("pw_accounts")||"{}"),
  saveAccount: (email, data) => {
    const acc = DB.getAccounts();
    acc[email.toLowerCase()] = data;
    localStorage.setItem("pw_accounts", JSON.stringify(acc));
  },
  getAccount: (email) => DB.getAccounts()[email.toLowerCase()] || null,
  getSavedLogin: () => JSON.parse(localStorage.getItem("pw_saved_login")||"null"),
  setSavedLogin: (email) => localStorage.setItem("pw_saved_login", JSON.stringify(email)),
  clearSavedLogin: () => localStorage.removeItem("pw_saved_login"),
};

// ── Hex background ────────────────────────────────────────────────────────────
function HexBg() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const items = Array.from({length:20}, () => ({
      x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
      r: Math.random()*20+8, vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3,
      op: Math.random()*.1+.03, rot:Math.random()*Math.PI, vr:(Math.random()-.5)*.002,
    }));
    const drawHex = (x,y,r,rot) => {
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=rot+i*Math.PI/3;i===0?ctx.moveTo(x+r*Math.cos(a),y+r*Math.sin(a)):ctx.lineTo(x+r*Math.cos(a),y+r*Math.sin(a));}
      ctx.closePath();
    };
    let af;
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      items.forEach(h=>{
        h.x+=h.vx;h.y+=h.vy;h.rot+=h.vr;
        if(h.x<-60)h.x=c.width+60;if(h.x>c.width+60)h.x=-60;
        if(h.y<-60)h.y=c.height+60;if(h.y>c.height+60)h.y=-60;
        drawHex(h.x,h.y,h.r,h.rot);
        ctx.strokeStyle=`rgba(138,47,201,${h.op})`;ctx.lineWidth=1;ctx.stroke();
      });
      af=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(af);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({score,color}){
  const r=38,circ=2*Math.PI*r,dash=(score/100)*circ;
  return(
    <svg width={96} height={96} style={{display:"block",margin:"0 auto"}}>
      <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(138,47,201,0.15)" strokeWidth={7}/>
      <circle cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round"
        style={{transition:"stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)"}}/>
      <text x={48} y={45} textAnchor="middle" fontSize={16} fontWeight={800} fill={color} fontFamily="DM Sans">{score}</text>
      <text x={48} y={59} textAnchor="middle" fontSize={8} fill="rgba(200,170,255,0.5)" fontFamily="DM Sans" letterSpacing={1}>SCORE</text>
    </svg>
  );
}

// ── Field Row (result screen) ─────────────────────────────────────────────────
function FieldRow({label,value,masked,delay=0}){
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),delay);return()=>clearTimeout(t);},[delay]);
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"10px 14px",borderRadius:10,marginBottom:7,
      background:"rgba(138,47,201,0.07)",border:"1px solid rgba(138,47,201,0.15)",
      opacity:show?1:0,transform:show?"translateY(0)":"translateY(12px)",
      transition:`opacity .4s ease ${delay}ms,transform .4s ease ${delay}ms`,
    }}>
      <span style={{fontSize:"0.68rem",fontWeight:700,color:"rgba(200,160,255,0.5)",textTransform:"uppercase",letterSpacing:"1px",flexShrink:0}}>{label}</span>
      {masked
        ? <span style={{fontFamily:"monospace",color:"#7c3aed",letterSpacing:"4px",fontSize:"1rem",textShadow:"0 0 10px rgba(124,58,237,0.5)"}}>{"●".repeat(8)}</span>
        : <span style={{fontSize:"0.79rem",color:"rgba(225,205,255,0.9)",fontFamily:"monospace",wordBreak:"break-all",textAlign:"right",maxWidth:"60%"}}>{value}</span>
      }
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({msg}){
  if(!msg) return null;
  return(
    <div style={{position:"fixed",bottom:24,right:24,background:"linear-gradient(135deg,#6A0DAD,#8B2FC9)",color:"#fff",borderRadius:12,padding:"11px 20px",fontWeight:600,fontSize:"0.85rem",boxShadow:"0 8px 28px rgba(106,13,173,0.5)",zIndex:9999,animation:"fadeUp .3s ease",maxWidth:"calc(100vw - 48px)"}}>
      {msg}
    </div>
  );
}

const DI = {
  width:"100%",background:"rgba(138,47,201,0.08)",border:"1.5px solid rgba(138,47,201,0.22)",
  borderRadius:10,padding:"12px 14px",fontSize:"0.9rem",color:"rgba(230,210,255,0.95)",
  fontFamily:"'DM Sans',sans-serif",outline:"none",transition:"border .2s,box-shadow .2s",
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page,setPage]   = useState("landing");
  const [user,setUser]   = useState(null);
  const [wallet,setWal]  = useState(null);
  const [txs,setTxs]     = useState([]);
  const [lastTx,setLast] = useState(null);
  const [toast,setToast] = useState(null);

  const toast$ = useCallback((m)=>{setToast(m);setTimeout(()=>setToast(null),2800);},[]);

  // Check saved login on mount
  useEffect(()=>{
    const saved = DB.getSavedLogin();
    if(saved){
      const acc = DB.getAccount(saved);
      if(acc){
        setUser({username:acc.username,email:acc.email});
        setWal(acc.wallet);
        setTxs(acc.txs||[]);
        setPage("dashboard");
      }
    }
  },[]);

  // Save txs to DB whenever they change
  useEffect(()=>{
    if(user?.email){
      const acc = DB.getAccount(user.email);
      if(acc){ DB.saveAccount(user.email,{...acc,txs,wallet}); }
    }
  },[txs,wallet]);

  const handleSignup = ({username,email,password,saveLogin}) => {
    const existing = DB.getAccount(email);
    if(existing){ toast$("Account already exists! Please log in."); return false; }
    const newWallet = {address:genAddr(),seed:genSeed(),balance:1000,created:new Date().toLocaleString()};
    const accData = {username,email,password,wallet:newWallet,txs:[]};
    DB.saveAccount(email, accData);
    if(saveLogin) DB.setSavedLogin(email);
    setUser({username,email});
    setWal(newWallet);
    setTxs([]);
    setPage("dashboard");
    toast$(`Welcome, ${username}! 🎉 Your wallet is ready.`);
    return true;
  };

  const handleLogin = ({emailOrUser,password,saveLogin}) => {
    // Find by email or username
    const accounts = DB.getAccounts();
    const acc = Object.values(accounts).find(a=>
      a.email.toLowerCase()===emailOrUser.toLowerCase() ||
      a.username.toLowerCase()===emailOrUser.toLowerCase()
    );
    if(!acc){ toast$("Account not found. Please sign up first."); return false; }
    if(acc.password!==password){ toast$("Incorrect password. Try again."); return false; }
    if(saveLogin) DB.setSavedLogin(acc.email);
    setUser({username:acc.username,email:acc.email});
    setWal(acc.wallet);
    setTxs(acc.txs||[]);
    setPage("dashboard");
    toast$(`Welcome back, ${acc.username}! 👋`);
    return true;
  };

  const handleImportWallet = (seedWords) => {
    // Find account that matches seed
    const accounts = DB.getAccounts();
    const acc = Object.values(accounts).find(a=> a.wallet.seed.join(" ")===seedWords.trim());
    if(acc){
      setUser({username:acc.username,email:acc.email});
      setWal(acc.wallet);
      setTxs(acc.txs||[]);
      setPage("dashboard");
      toast$("Wallet imported! All your data restored. ✅");
      return true;
    }
    toast$("Seed phrase not found. Check and try again.");
    return false;
  };

  const handleLogout = (saveLogin) => {
    if(!saveLogin) DB.clearSavedLogin();
    setUser(null);setWal(null);setTxs([]);setLast(null);
    setPage("landing");
    toast$("Logged out successfully.");
  };

  const handleSend = (tx) => {
    const newTxs = [tx,...txs];
    const newBal = wallet.balance - tx.amt;
    const newWal = {...wallet,balance:newBal};
    setTxs(newTxs);
    setWal(newWal);
    setLast(tx);
    // Persist
    if(user?.email){
      const acc = DB.getAccount(user.email);
      if(acc) DB.saveAccount(user.email,{...acc,txs:newTxs,wallet:newWal});
    }
  };

  const score=calcScore(txs);
  const {label:sLbl,c:sCol}=scoreInfo(score);

  return(
    <div style={{minHeight:"100vh",background:"#0D0618",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#fff",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes glow{0%,100%{box-shadow:0 0 18px rgba(106,13,173,0.3)}50%{box-shadow:0 0 36px rgba(106,13,173,0.6)}}
        input::placeholder{color:rgba(178,130,255,0.3)!important;}
        input:focus{border-color:rgba(138,47,201,0.8)!important;box-shadow:0 0 0 3px rgba(106,13,173,0.18)!important;}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(138,47,201,0.35);border-radius:3px}
        .hov:hover{transform:translateY(-3px)!important;box-shadow:0 12px 30px rgba(106,13,173,0.22)!important;}
        .gh:hover{background:rgba(138,47,201,0.14)!important;}
        @media(max-width:520px){.seed-g{grid-template-columns:repeat(3,1fr)!important}.cmp{grid-template-columns:1fr!important}}
      `}</style>
      <HexBg/>

      {/* ── NAVBAR ── */}
      <nav style={{background:"rgba(13,6,24,0.92)",backdropFilter:"blur(14px)",borderBottom:"1px solid rgba(138,47,201,0.18)",padding:"0 1.5rem",height:58,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div onClick={()=>setPage(user?"dashboard":"landing")} style={{fontWeight:800,fontSize:"1.05rem",color:"#c4b5fd",display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none"}}>
          <span style={{background:"linear-gradient(135deg,#6A0DAD,#8B2FC9)",color:"#fff",borderRadius:7,padding:"3px 9px",fontSize:"0.68rem",fontWeight:800,letterSpacing:"0.5px"}}>PW</span>
          Privacy World
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {user?(
            <>
              <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(106,13,173,0.15)",border:"1px solid rgba(138,47,201,0.25)",borderRadius:20,padding:"5px 12px"}}>
                <div style={{width:26,height:26,background:"linear-gradient(135deg,#6A0DAD,#8B2FC9)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.7rem",fontWeight:800,color:"#fff",flexShrink:0}}>
                  {user.username[0].toUpperCase()}
                </div>
                <span style={{fontSize:"0.8rem",color:"rgba(210,190,255,0.9)",fontWeight:600}}>{user.username}</span>
                {wallet&&<span style={{fontSize:"0.75rem",color:"#c4b5fd",fontWeight:700,borderLeft:"1px solid rgba(138,47,201,0.3)",paddingLeft:8}}>{wallet.balance.toFixed(0)} $SEIS</span>}
              </div>
              <button onClick={()=>handleLogout(DB.getSavedLogin()===user.email)} className="gh" style={{background:"transparent",border:"1px solid rgba(138,47,201,0.3)",color:"rgba(196,181,253,0.7)",borderRadius:8,padding:"6px 14px",fontWeight:600,fontSize:"0.78rem",cursor:"pointer",transition:"background .2s",fontFamily:"inherit"}}>
                Log Out
              </button>
            </>
          ):(
            <button onClick={()=>setPage("auth")} style={{background:"linear-gradient(135deg,#6A0DAD,#8B2FC9)",color:"#fff",border:"none",borderRadius:9,padding:"8px 18px",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(106,13,173,0.4)"}}>
              Sign Up / Log In
            </button>
          )}
        </div>
      </nav>

      {/* ══ LANDING ══ */}
      {page==="landing"&&(
        <div style={{position:"relative",zIndex:1,animation:"fadeUp .5s ease"}}>
          <div style={{maxWidth:640,margin:"0 auto",padding:"80px 1.5rem 52px",textAlign:"center"}}>
            <div style={{display:"inline-block",background:"rgba(106,13,173,0.18)",border:"1px solid rgba(138,47,201,0.35)",borderRadius:20,padding:"5px 16px",fontSize:"0.72rem",fontWeight:700,color:"#c4b5fd",letterSpacing:"1px",marginBottom:20}}>
              🔐 EDUCATIONAL CRYPTO SIMULATOR
            </div>
            <h1 style={{fontSize:"clamp(2rem,5.5vw,3.2rem)",fontWeight:800,lineHeight:1.12,marginBottom:16,letterSpacing:"-1px"}}>
              Welcome to<br/>
              <span style={{background:"linear-gradient(135deg,#c4b5fd,#8B2FC9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Privacy World</span>
            </h1>
            <p style={{fontSize:"0.96rem",color:"rgba(200,170,255,0.65)",lineHeight:1.75,marginBottom:36,maxWidth:460,margin:"0 auto 36px"}}>
              Sign up once — your wallet is saved permanently. Log in anytime to restore your account, balance, and transaction history.
            </p>
            <button onClick={()=>setPage("auth")} style={{background:"linear-gradient(135deg,#6A0DAD,#8B2FC9)",color:"#fff",border:"none",borderRadius:12,padding:"15px 42px",fontWeight:800,fontSize:"1rem",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 6px 24px rgba(106,13,173,0.5)",animation:"glow 3s ease-in-out infinite",transition:"transform .15s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform=""}>
              Get Started Free →
            </button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:13,maxWidth:760,margin:"0 auto",padding:"0 1.5rem 80px"}}>
            {[["⚡","Auto Wallet","Wallet auto-created on sign up."],["💾","Persistent Account","Log in → wallet restores automatically."],["🔒","Encrypt Mode","Fields show ●●●●●● — fully private."],["📊","Privacy Audit","Real-time exposure score."]].map(([ic,t,d])=>(
              <div key={t} className="hov" style={{background:"rgba(21,13,36,0.8)",border:"1px solid rgba(138,47,201,0.18)",borderRadius:14,padding:20,backdropFilter:"blur(8px)",transition:"transform .2s,box-shadow .2s"}}>
                <div style={{fontSize:"1.5rem",marginBottom:10}}>{ic}</div>
                <div style={{fontWeight:700,fontSize:"0.88rem",color:"#e2d4ff",marginBottom:5}}>{t}</div>
                <div style={{fontSize:"0.78rem",color:"rgba(180,150,230,0.55)",lineHeight:1.6}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ AUTH ══ */}
      {page==="auth"&&(
        <AuthPage
          onSignup={handleSignup}
          onLogin={handleLogin}
          onImport={handleImportWallet}
          onBack={()=>setPage("landing")}
          toast$={toast$}
        />
      )}

      {/* ══ DASHBOARD ══ */}
      {page==="dashboard"&&user&&wallet&&(
        <div style={{position:"relative",zIndex:1,maxWidth:1020,margin:"0 auto",padding:"28px 1.5rem",animation:"fadeUp .4s ease"}}>
          <div style={{marginBottom:22}}>
            <h1 style={{fontSize:"1.4rem",fontWeight:800,color:"#e2d4ff",letterSpacing:"-0.5px"}}>Hey, {user.username} 👋</h1>
            <p style={{color:"rgba(180,150,230,0.45)",fontSize:"0.83rem",marginTop:3}}>Your account & wallet are loaded and ready.</p>
          </div>
          <div style={{display:"flex",gap:11,marginBottom:20,flexWrap:"wrap"}}>
            {[["Balance",`${wallet.balance.toFixed(2)} $SEIS`,"#c4b5fd"],["Transactions",txs.length,"#67e8f9"],["Privacy Score",`${score}/100`,sCol],["Status",sLbl,sCol]].map(([l,v,c])=>(
              <div key={l} style={{background:"rgba(21,13,36,0.8)",border:"1px solid rgba(138,47,201,0.18)",borderRadius:12,padding:"12px 17px",flex:1,minWidth:120,backdropFilter:"blur(6px)"}}>
                <div style={{fontSize:"0.66rem",color:"rgba(180,150,230,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:5}}>{l}</div>
                <div style={{fontSize:"1rem",fontWeight:800,color:c}}>{v}</div>
              </div>
            ))}
          </div>
          {/* Wallet info */}
          <div style={{background:"rgba(21,13,36,0.85)",border:"1px solid rgba(138,47,201,0.2)",borderRadius:16,padding:"20px 22px",marginBottom:16,backdropFilter:"blur(12px)"}}>
            <div style={{fontWeight:700,fontSize:"0.82rem",color:"rgba(196,181,253,0.5)",marginBottom:12,textTransform:"uppercase",letterSpacing:"0.6px"}}>🔑 Your Wallet</div>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:14,paddingBottom:14,borderBottom:"1px solid rgba(138,47,201,0.1)"}}>
              <span style={{fontSize:"0.68rem",color:"rgba(180,150,230,0.4)",fontWeight:700,textTransform:"uppercase",paddingTop:2}}>Address</span>
              <span style={{fontSize:"0.75rem",fontFamily:"monospace",color:"rgba(210,190,255,0.75)",wordBreak:"break-all",textAlign:"right",maxWidth:"72%"}}>{wallet.address}</span>
            </div>
            <div style={{fontSize:"0.68rem",color:"rgba(180,150,230,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:9}}>🌱 Seed Phrase — Save this!</div>
            <div className="seed-g" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
              {wallet.seed.map((w,i)=>(
                <div key={i} style={{background:"rgba(106,13,173,0.12)",border:"1px solid rgba(138,47,201,0.18)",borderRadius:6,padding:"6px 5px",fontSize:"0.73rem",textAlign:"center",color:"#c4b5fd",fontWeight:600}}>
                  <span style={{color:"rgba(138,47,201,0.35)",fontSize:"0.6rem"}}>{i+1}. </span>{w}
                </div>
              ))}
            </div>
          </div>
          {/* Action cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
            {[["💸","Send Transaction","Send $SEIS — encrypt or decrypt mode.","transactions"],["📊","Graph & Audit","Privacy exposure graph + audit.","graph"],["📜","History","All transactions with spy view.","history"]].map(([ic,t,d,pg])=>(
              <div key={t} className="hov" onClick={()=>setPage(pg)} style={{background:"rgba(21,13,36,0.8)",border:"1px solid rgba(138,47,201,0.18)",borderRadius:14,padding:20,cursor:"pointer",position:"relative",overflow:"hidden",transition:"transform .2s,box-shadow .2s",backdropFilter:"blur(8px)"}}>
                <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:"linear-gradient(180deg,#6A0DAD,#8B2FC9)",borderRadius:"14px 0 0 14px"}}/>
                <div style={{paddingLeft:10}}>
                  <div style={{fontSize:"1.6rem",marginBottom:8}}>{ic}</div>
                  <div style={{fontWeight:700,fontSize:"0.9rem",color:"#e2d4ff",marginBottom:4}}>{t}</div>
                  <div style={{fontSize:"0.77rem",color:"rgba(180,150,230,0.5)",lineHeight:1.5}}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {page==="transactions"&&user&&wallet&&<TxPage wallet={wallet} txs={txs} lastTx={lastTx} onSend={handleSend} onBack={()=>setPage("dashboard")} toast$={toast$}/>}
      {page==="graph"&&user&&<GraphPage txs={txs} onBack={()=>setPage("dashboard")}/>}
      {page==="history"&&user&&<HistoryPage txs={txs} onBack={()=>setPage("dashboard")}/>}

      <Toast msg={toast}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH PAGE — Signup + Login + Import Wallet
// ══════════════════════════════════════════════════════════════════════════════
function AuthPage({onSignup,onLogin,onImport,onBack,toast$}){
  const [tab,setTab]       = useState("signup"); // signup | login | import
  const [form,setForm]     = useState({username:"",email:"",password:"",confirm:"",emailOrUser:"",loginPw:"",saveLogin:true,seed:""});
  const [showPw,setShowPw] = useState(false);
  const [err,setErr]       = useState("");

  const set = (k)=>(e)=>setForm(p=>({...p,[k]:typeof e==="boolean"?e:e.target.value}));

  const pwStr = form.password.length===0?0:form.password.length<6?1:form.password.length<10?2:3;

  const submitSignup = () => {
    setErr("");
    if(!form.username.trim()){setErr("Username is required.");return;}
    if(form.username.trim().length<3){setErr("Username must be at least 3 characters.");return;}
    if(!form.email.trim()||!form.email.includes("@")){setErr("Enter a valid email address.");return;}
    if(form.password.length<6){setErr("Password must be at least 6 characters.");return;}
    if(form.password!==form.confirm){setErr("Passwords do not match.");return;}
    onSignup({username:form.username.trim(),email:form.email.trim(),password:form.password,saveLogin:form.saveLogin});
  };

  const submitLogin = () => {
    setErr("");
    if(!form.emailOrUser.trim()){setErr("Enter your email or username.");return;}
    if(!form.loginPw){setErr("Enter your password.");return;}
    onLogin({emailOrUser:form.emailOrUser.trim(),password:form.loginPw,saveLogin:form.saveLogin});
  };

  const submitImport = () => {
    setErr("");
    const words = form.seed.trim().split(/\s+/);
    if(words.length!==12){setErr("Seed phrase must be exactly 12 words.");return;}
    onImport(form.seed.trim());
  };

  return(
    <div style={{position:"relative",zIndex:1,minHeight:"calc(100vh - 58px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem",animation:"fadeUp .4s ease"}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{width:56,height:56,background:"linear-gradient(135deg,#6A0DAD,#8B2FC9)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",margin:"0 auto 12px",boxShadow:"0 8px 24px rgba(106,13,173,0.45)"}}>🔐</div>
          <h2 style={{fontSize:"1.5rem",fontWeight:800,color:"#e2d4ff",letterSpacing:"-0.5px"}}>
            {tab==="signup"?"Create Your Account":tab==="login"?"Log In":"Import Wallet"}
          </h2>
          <p style={{fontSize:"0.79rem",color:"rgba(180,150,230,0.45)",marginTop:4}}>
            {tab==="signup"?"Wallet auto-created & saved to your account":tab==="login"?"Your wallet restores automatically":"Restore wallet using your 12-word seed phrase"}
          </p>
        </div>

        <div style={{background:"rgba(21,13,36,0.92)",border:"1px solid rgba(138,47,201,0.24)",borderRadius:20,padding:"26px 24px",backdropFilter:"blur(18px)",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>

          {/* Tabs */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:22,background:"rgba(106,13,173,0.1)",border:"1px solid rgba(138,47,201,0.18)",borderRadius:11,padding:4}}>
            {[["signup","Sign Up"],["login","Log In"],["import","Import"]].map(([t,lbl])=>(
              <button key={t} onClick={()=>{setTab(t);setErr("");}} style={{padding:"9px 4px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:"0.79rem",transition:"all .2s",
                background:tab===t?"linear-gradient(135deg,#6A0DAD,#8B2FC9)":"transparent",
                color:tab===t?"#fff":"rgba(196,181,253,0.4)",
                boxShadow:tab===t?"0 3px 12px rgba(106,13,173,0.4)":"none"}}>
                {lbl}
              </button>
            ))}
          </div>

          {/* ── SIGN UP ── */}
          {tab==="signup"&&(
            <>
              {[["Username","text","e.g. satoshi_123","username"],["Email","email","you@email.com","email"]].map(([lbl,type,ph,key])=>(
                <div key={key} style={{marginBottom:13}}>
                  <label style={{display:"block",fontSize:"0.72rem",fontWeight:700,color:"rgba(196,181,253,0.5)",letterSpacing:"0.4px",marginBottom:5}}>{lbl}</label>
                  <input type={type} placeholder={ph} value={form[key]} onChange={set(key)} onKeyDown={e=>e.key==="Enter"&&submitSignup()}
                    onFocus={e=>{e.target.style.borderColor="rgba(138,47,201,0.8)";e.target.style.boxShadow="0 0 0 3px rgba(106,13,173,0.18)";}}
                    onBlur={e=>{e.target.style.borderColor="rgba(138,47,201,0.22)";e.target.style.boxShadow="none";}}
                    style={DI}/>
                </div>
              ))}
              <div style={{marginBottom:13}}>
                <label style={{display:"block",fontSize:"0.72rem",fontWeight:700,color:"rgba(196,181,253,0.5)",letterSpacing:"0.4px",marginBottom:5}}>Password</label>
                <div style={{position:"relative"}}>
                  <input type={showPw?"text":"password"} placeholder="Min 6 characters" value={form.password} onChange={set("password")} onKeyDown={e=>e.key==="Enter"&&submitSignup()}
                    onFocus={e=>{e.target.style.borderColor="rgba(138,47,201,0.8)";e.target.style.boxShadow="0 0 0 3px rgba(106,13,173,0.18)";}}
                    onBlur={e=>{e.target.style.borderColor="rgba(138,47,201,0.22)";e.target.style.boxShadow="none";}}
                    style={DI}/>
                  <button type="button" onClick={()=>setShowPw(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"0.85rem",color:"rgba(196,181,253,0.4)"}}>
                    {showPw?"🙈":"👁"}
                  </button>
                </div>
                {form.password.length>0&&(
                  <div style={{marginTop:6}}>
                    <div style={{height:3,borderRadius:2,background:"rgba(138,47,201,0.12)",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:2,transition:"width .3s,background .3s",width:["0%","33%","66%","100%"][pwStr],background:["","#dc2626","#d97706","#16a34a"][pwStr]}}/>
                    </div>
                    <div style={{fontSize:"0.67rem",color:["","#dc2626","#d97706","#16a34a"][pwStr],marginTop:3,fontWeight:600}}>{["","Weak","Medium","Strong"][pwStr]}</div>
                  </div>
                )}
              </div>
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:"0.72rem",fontWeight:700,color:"rgba(196,181,253,0.5)",letterSpacing:"0.4px",marginBottom:5}}>Confirm Password</label>
                <input type={showPw?"text":"password"} placeholder="Repeat password" value={form.confirm} onChange={set("confirm")} onKeyDown={e=>e.key==="Enter"&&submitSignup()}
                  onFocus={e=>{e.target.style.borderColor="rgba(138,47,201,0.8)";e.target.style.boxShadow="0 0 0 3px rgba(106,13,173,0.18)";}}
                  onBlur={e=>{e.target.style.borderColor="rgba(138,47,201,0.22)";e.target.style.boxShadow="none";}}
                  style={{...DI,borderColor:form.confirm&&form.confirm!==form.password?"rgba(220,38,38,0.5)":form.confirm&&form.confirm===form.password?"rgba(22,163,74,0.5)":"rgba(138,47,201,0.22)"}}/>
                {form.confirm&&form.confirm===form.password&&<div style={{fontSize:"0.67rem",color:G,marginTop:3,fontWeight:600}}>✓ Passwords match</div>}
              </div>
              {/* Save login checkbox */}
              <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,cursor:"pointer"}}>
                <div onClick={()=>set("saveLogin")(!form.saveLogin)} style={{width:18,height:18,borderRadius:5,border:`2px solid ${form.saveLogin?"#6A0DAD":"rgba(138,47,201,0.35)"}`,background:form.saveLogin?"#6A0DAD":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s",cursor:"pointer"}}>
                  {form.saveLogin&&<span style={{color:"#fff",fontSize:"0.7rem",lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontSize:"0.79rem",color:"rgba(196,181,253,0.6)"}}>Save Login — auto-restore wallet on next visit</span>
              </label>
              {err&&<div style={{background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.28)",borderRadius:8,padding:"9px 12px",fontSize:"0.79rem",color:"#f87171",marginBottom:13}}>⚠ {err}</div>}
              <button onClick={submitSignup} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#6A0DAD,#8B2FC9)",color:"#fff",fontFamily:"inherit",fontWeight:800,fontSize:"0.95rem",boxShadow:"0 4px 20px rgba(106,13,173,0.45)",transition:"transform .15s",animation:"glow 3s ease-in-out infinite"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                onMouseLeave={e=>e.currentTarget.style.transform=""}>
                Create Account →
              </button>
              <p style={{textAlign:"center",marginTop:10,fontSize:"0.72rem",color:"rgba(180,150,230,0.35)"}}>⚡ Wallet is auto-generated and saved to your account</p>
            </>
          )}

          {/* ── LOG IN ── */}
          {tab==="login"&&(
            <>
              <div style={{marginBottom:13}}>
                <label style={{display:"block",fontSize:"0.72rem",fontWeight:700,color:"rgba(196,181,253,0.5)",letterSpacing:"0.4px",marginBottom:5}}>Email / Username</label>
                <input type="text" placeholder="your email or username" value={form.emailOrUser} onChange={set("emailOrUser")} onKeyDown={e=>e.key==="Enter"&&submitLogin()}
                  onFocus={e=>{e.target.style.borderColor="rgba(138,47,201,0.8)";e.target.style.boxShadow="0 0 0 3px rgba(106,13,173,0.18)";}}
                  onBlur={e=>{e.target.style.borderColor="rgba(138,47,201,0.22)";e.target.style.boxShadow="none";}}
                  style={DI}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:"0.72rem",fontWeight:700,color:"rgba(196,181,253,0.5)",letterSpacing:"0.4px",marginBottom:5}}>Password</label>
                <div style={{position:"relative"}}>
                  <input type={showPw?"text":"password"} placeholder="Your password" value={form.loginPw} onChange={set("loginPw")} onKeyDown={e=>e.key==="Enter"&&submitLogin()}
                    onFocus={e=>{e.target.style.borderColor="rgba(138,47,201,0.8)";e.target.style.boxShadow="0 0 0 3px rgba(106,13,173,0.18)";}}
                    onBlur={e=>{e.target.style.borderColor="rgba(138,47,201,0.22)";e.target.style.boxShadow="none";}}
                    style={DI}/>
                  <button type="button" onClick={()=>setShowPw(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"0.85rem",color:"rgba(196,181,253,0.4)"}}>
                    {showPw?"🙈":"👁"}
                  </button>
                </div>
              </div>
              {/* Save login */}
              <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,cursor:"pointer"}}>
                <div onClick={()=>set("saveLogin")(!form.saveLogin)} style={{width:18,height:18,borderRadius:5,border:`2px solid ${form.saveLogin?"#6A0DAD":"rgba(138,47,201,0.35)"}`,background:form.saveLogin?"#6A0DAD":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s",cursor:"pointer"}}>
                  {form.saveLogin&&<span style={{color:"#fff",fontSize:"0.7rem",lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontSize:"0.79rem",color:"rgba(196,181,253,0.6)"}}>Save Login — restore wallet automatically next time</span>
              </label>
              {err&&<div style={{background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.28)",borderRadius:8,padding:"9px 12px",fontSize:"0.79rem",color:"#f87171",marginBottom:13}}>⚠ {err}</div>}
              <button onClick={submitLogin} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#6A0DAD,#8B2FC9)",color:"#fff",fontFamily:"inherit",fontWeight:800,fontSize:"0.95rem",boxShadow:"0 4px 20px rgba(106,13,173,0.45)",transition:"transform .15s",animation:"glow 3s ease-in-out infinite"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                onMouseLeave={e=>e.currentTarget.style.transform=""}>
                Log In →
              </button>
              <div style={{textAlign:"center",marginTop:12,fontSize:"0.75rem",color:"rgba(180,150,230,0.35)"}}>
                💾 Same email = same wallet restored automatically
              </div>
            </>
          )}

          {/* ── IMPORT WALLET ── */}
          {tab==="import"&&(
            <>
              <div style={{background:"rgba(106,13,173,0.1)",border:"1px solid rgba(138,47,201,0.2)",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:"0.79rem",color:"rgba(196,181,253,0.6)",lineHeight:1.6}}>
                💡 Enter your 12-word seed phrase to restore your wallet with full balance and transaction history.
              </div>
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:"0.72rem",fontWeight:700,color:"rgba(196,181,253,0.5)",letterSpacing:"0.4px",marginBottom:5}}>Seed Phrase (12 words)</label>
                <textarea placeholder="word1 word2 word3 ... word12" value={form.seed} onChange={e=>setForm(p=>({...p,seed:e.target.value}))}
                  style={{...DI,minHeight:90,resize:"vertical",lineHeight:1.6}}/>
                <div style={{fontSize:"0.67rem",color:"rgba(180,150,230,0.35)",marginTop:4}}>
                  {form.seed.trim().split(/\s+/).filter(w=>w).length} / 12 words entered
                </div>
              </div>
              {err&&<div style={{background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.28)",borderRadius:8,padding:"9px 12px",fontSize:"0.79rem",color:"#f87171",marginBottom:13}}>⚠ {err}</div>}
              <button onClick={submitImport} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#6A0DAD,#8B2FC9)",color:"#fff",fontFamily:"inherit",fontWeight:800,fontSize:"0.95rem",boxShadow:"0 4px 20px rgba(106,13,173,0.45)",transition:"transform .15s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                onMouseLeave={e=>e.currentTarget.style.transform=""}>
                Import Wallet →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS — Encrypt / Decrypt mode (not Seismic/Public)
// ══════════════════════════════════════════════════════════════════════════════
function TxPage({wallet,txs,lastTx,onSend,onBack,toast$}){
  const [view,setView] = useState(lastTx?"result":"form");
  const [isEnc,setEnc] = useState(true); // true = encrypt, false = decrypt
  const [form,setForm] = useState({to:"",amt:"",note:""});
  const [err,setErr]   = useState("");
  const score=calcScore(txs);
  const {label:sLbl,c:sCol}=scoreInfo(score);

  const submit=()=>{
    setErr("");
    if(!form.to.trim()){setErr("Enter receiver address.");return;}
    const a=parseFloat(form.amt);
    if(!form.amt||isNaN(a)||a<=0){setErr("Enter a valid amount.");return;}
    if(a>wallet.balance){setErr(`Insufficient balance. You have ${wallet.balance.toFixed(2)} $SEIS.`);return;}
    const tx={id:"PW-"+rHex(6).toUpperCase(),from:wallet.address,to:form.to.startsWith("0x")?form.to:genAddr(),amt:a,note:form.note.trim()||"—",priv:isEnc,time:new Date().toLocaleTimeString()};
    onSend(tx);
    setForm({to:"",amt:"",note:""});
    setView("result");
    toast$(isEnc?"🔒 Encrypted transaction sent!":"🔓 Decrypted transaction sent!");
  };

  return(
    <div style={{position:"relative",zIndex:1,maxWidth:580,margin:"0 auto",padding:"28px 1.5rem",animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <button onClick={onBack} className="gh" style={{background:"transparent",border:"1px solid rgba(138,47,201,0.28)",color:"rgba(196,181,253,0.65)",borderRadius:8,padding:"6px 14px",fontWeight:600,fontSize:"0.78rem",cursor:"pointer",transition:"background .2s",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
          ← Dashboard
        </button>
        <div style={{display:"flex",gap:5,background:"rgba(21,13,36,0.8)",border:"1px solid rgba(138,47,201,0.18)",borderRadius:9,padding:3}}>
          {[["form","💸 Send"],["result","📋 Result"]].map(([v,lbl])=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"6px 13px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:"0.78rem",transition:"all .2s",background:view===v?"linear-gradient(135deg,#6A0DAD,#8B2FC9)":"transparent",color:view===v?"#fff":"rgba(196,181,253,0.4)"}}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── SEND FORM ── */}
      {view==="form"&&(
        <div style={{background:"rgba(21,13,36,0.88)",border:"1px solid rgba(138,47,201,0.2)",borderRadius:18,padding:"24px 22px",backdropFilter:"blur(14px)",animation:"fadeUp .35s ease"}}>
          <h3 style={{fontWeight:800,fontSize:"1rem",color:"#e2d4ff",marginBottom:16}}>New Transaction</h3>

          {/* Encrypt / Decrypt toggle */}
          <div style={{display:"flex",gap:7,marginBottom:16,background:"rgba(106,13,173,0.08)",border:"1px solid rgba(138,47,201,0.16)",borderRadius:11,padding:4}}>
            {[["encrypt","🔒 Encrypt Mode",true],["decrypt","🔓 Decrypt Mode",false]].map(([m,lbl,enc])=>(
              <button key={m} onClick={()=>setEnc(enc)} style={{flex:1,padding:"10px 6px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:"0.83rem",transition:"all .2s",
                background:isEnc===enc?(enc?"linear-gradient(135deg,#16a34a,#15803d)":"linear-gradient(135deg,#dc2626,#b91c1c)"):"transparent",
                color:isEnc===enc?"#fff":"rgba(180,150,230,0.38)",
                boxShadow:isEnc===enc?"0 3px 12px rgba(0,0,0,0.3)":"none"}}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Mode hint */}
          <div style={{padding:"10px 13px",borderRadius:9,marginBottom:16,fontSize:"0.78rem",lineHeight:1.6,
            background:isEnc?"rgba(22,163,74,0.08)":"rgba(220,38,38,0.08)",
            border:`1px solid ${isEnc?"rgba(22,163,74,0.22)":"rgba(220,38,38,0.22)"}`,
            color:isEnc?"rgba(134,239,172,0.8)":"rgba(252,165,165,0.75)"}}>
            {isEnc?"🔒 Encrypt Mode — All fields hidden. Observers see only ●●●●●●●●":"🔓 Decrypt Mode — Sender, receiver, amount & note visible to all."}
          </div>

          {/* Sender */}
          <div style={{marginBottom:13}}>
            <label style={{display:"block",fontSize:"0.71rem",fontWeight:700,color:"rgba(196,181,253,0.45)",letterSpacing:"0.3px",marginBottom:5}}>From (your wallet)</label>
            <input readOnly value={wallet.address.slice(0,22)+"…"} style={{...DI,cursor:"not-allowed",opacity:0.4}}/>
          </div>
          {/* Receiver */}
          <div style={{marginBottom:13}}>
            <label style={{display:"block",fontSize:"0.71rem",fontWeight:700,color:"rgba(196,181,253,0.45)",letterSpacing:"0.3px",marginBottom:5}}>Receiver Address *</label>
            <input placeholder="0x… or any address" value={form.to} onChange={e=>setForm(p=>({...p,to:e.target.value}))}
              onFocus={e=>{e.target.style.borderColor="rgba(138,47,201,0.8)";e.target.style.boxShadow="0 0 0 3px rgba(106,13,173,0.18)";}}
              onBlur={e=>{e.target.style.borderColor="rgba(138,47,201,0.22)";e.target.style.boxShadow="none";}}
              style={DI}/>
          </div>
          {/* Amount */}
          <div style={{marginBottom:13}}>
            <label style={{display:"block",fontSize:"0.71rem",fontWeight:700,color:"rgba(196,181,253,0.45)",letterSpacing:"0.3px",marginBottom:5}}>Amount ($SEIS) *</label>
            <input type="number" min="0.01" placeholder={`Max ${wallet.balance.toFixed(2)}`} value={form.amt}
              onChange={e=>setForm(p=>({...p,amt:e.target.value}))}
              onFocus={e=>{e.target.style.borderColor="rgba(138,47,201,0.8)";e.target.style.boxShadow="0 0 0 3px rgba(106,13,173,0.18)";}}
              onBlur={e=>{e.target.style.borderColor="rgba(138,47,201,0.22)";e.target.style.boxShadow="none";}}
              style={DI}/>
          </div>
          {/* Note */}
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:"0.71rem",fontWeight:700,color:"rgba(196,181,253,0.45)",letterSpacing:"0.3px",marginBottom:5}}>Note (optional)</label>
            <input placeholder="e.g. payment for…" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}
              onFocus={e=>{e.target.style.borderColor="rgba(138,47,201,0.8)";e.target.style.boxShadow="0 0 0 3px rgba(106,13,173,0.18)";}}
              onBlur={e=>{e.target.style.borderColor="rgba(138,47,201,0.22)";e.target.style.boxShadow="none";}}
              style={DI}/>
          </div>
          {err&&<div style={{background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.28)",borderRadius:8,padding:"9px 12px",fontSize:"0.79rem",color:"#f87171",marginBottom:14}}>⚠ {err}</div>}
          <button onClick={submit} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#6A0DAD,#8B2FC9)",color:"#fff",fontFamily:"inherit",fontWeight:800,fontSize:"0.95rem",boxShadow:"0 4px 20px rgba(106,13,173,0.45)",transition:"transform .15s",animation:"glow 3s ease-in-out infinite"}}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform=""}>
            Send Transaction →
          </button>
        </div>
      )}

      {/* ── RESULT SCREEN ── */}
      {view==="result"&&(
        <div style={{animation:"popIn .45s cubic-bezier(.34,1.56,.64,1)"}}>
          {!lastTx?(
            <div style={{textAlign:"center",padding:"60px 0",color:"rgba(180,150,230,0.35)",fontSize:"0.88rem"}}>No transaction yet — go to Send tab first.</div>
          ):(
            <>
              {/* Status banner — Encrypt / Decrypt (not Seismic/Public) */}
              <div style={{borderRadius:18,padding:"22px",marginBottom:16,textAlign:"center",position:"relative",overflow:"hidden",
                background:lastTx.priv?"linear-gradient(135deg,rgba(22,163,74,0.18),rgba(21,128,61,0.08))":"linear-gradient(135deg,rgba(220,38,38,0.18),rgba(185,28,28,0.08))",
                border:`1.5px solid ${lastTx.priv?"rgba(22,163,74,0.38)":"rgba(220,38,38,0.38)"}`,
                boxShadow:lastTx.priv?"0 0 40px rgba(22,163,74,0.12)":"0 0 40px rgba(220,38,38,0.12)"}}>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)",backgroundSize:"200% 100%",animation:"shimmer 2.5s infinite"}}/>
                <div style={{fontSize:"2rem",marginBottom:7}}>{lastTx.priv?"🔒":"🔓"}</div>
                <div style={{fontWeight:800,fontSize:"1.15rem",color:"#e2d4ff",marginBottom:7}}>
                  {lastTx.priv?"Encrypt Mode — Active":"Decrypt Mode — Active"}
                </div>
                <span style={{display:"inline-block",
                  background:lastTx.priv?"rgba(22,163,74,0.18)":"rgba(220,38,38,0.18)",
                  border:`1px solid ${lastTx.priv?"rgba(22,163,74,0.4)":"rgba(220,38,38,0.4)"}`,
                  borderRadius:20,padding:"4px 16px",fontSize:"0.73rem",fontWeight:700,
                  color:lastTx.priv?"#4ade80":"#f87171",letterSpacing:"0.5px"}}>
                  {lastTx.priv?"✓ ALL FIELDS ENCRYPTED":"⚡ ALL FIELDS VISIBLE"}
                </span>
              </div>

              {/* TX ID */}
              <div style={{textAlign:"center",marginBottom:14}}>
                <span style={{background:"rgba(106,13,173,0.18)",border:"1px solid rgba(138,47,201,0.32)",borderRadius:20,padding:"5px 16px",fontSize:"0.72rem",color:"#c4b5fd",fontWeight:700,fontFamily:"monospace",letterSpacing:"0.5px"}}>
                  🔖 {lastTx.id}
                </span>
              </div>

              {/* Score + details */}
              <div style={{background:"rgba(21,13,36,0.88)",border:"1px solid rgba(138,47,201,0.2)",borderRadius:16,padding:"18px 16px",marginBottom:13,backdropFilter:"blur(14px)"}}>
                <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:14}}>
                  <ScoreRing score={score} color={sCol}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.68rem",color:"rgba(180,150,230,0.45)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Privacy Score</div>
                    <div style={{fontWeight:800,fontSize:"1.05rem",color:sCol,marginBottom:4}}>{sLbl}</div>
                    <div style={{fontSize:"0.75rem",color:"rgba(180,150,230,0.45)",lineHeight:1.5}}>
                      {lastTx.priv?"Wallet, amount & identity fully hidden from observers.":"Transaction details are visible to all network participants."}
                    </div>
                  </div>
                </div>
                <div style={{fontSize:"0.67rem",color:"rgba(180,150,230,0.38)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>Transaction Details</div>
                {[["From",lastTx.from.slice(0,10)+"…"+lastTx.from.slice(-6),80],["To",lastTx.to.slice(0,10)+"…"+lastTx.to.slice(-6),160],["Amount",`${lastTx.amt} $SEIS`,240],["Note",lastTx.note,320],["Time",lastTx.time,400]].map(([l,v,d])=>(
                  <FieldRow key={l} label={l} value={v} masked={lastTx.priv} delay={d}/>
                ))}
              </div>

              {/* Compare — Encrypt vs Decrypt */}
              <div className="cmp" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                {[
                  {t:"Decrypt Mode",ic:"🔓",active:!lastTx.priv,col:"#f87171",border:"rgba(220,38,38,0.32)",bg:"rgba(220,38,38,0.06)",items:["Wallet Address Visible","Amount Visible","Note Visible","Timestamp Visible"]},
                  {t:"Encrypt Mode",ic:"🔒",active:lastTx.priv,col:"#4ade80",border:"rgba(22,163,74,0.32)",bg:"rgba(22,163,74,0.06)",items:["Wallet Address Hidden","Amount Encrypted","Note Encrypted","Zero Trace"]},
                ].map(card=>(
                  <div key={card.t} style={{background:card.active?card.bg:"rgba(21,13,36,0.5)",border:`1.5px solid ${card.active?card.border:"rgba(138,47,201,0.1)"}`,borderRadius:12,padding:"13px 11px",transform:card.active?"scale(1.02)":"scale(1)",transition:"all .3s"}}>
                    <div style={{fontWeight:800,fontSize:"0.84rem",color:card.active?card.col:"rgba(180,150,230,0.25)",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                      {card.ic} {card.t}
                    </div>
                    {card.items.map(item=>(
                      <div key={item} style={{fontSize:"0.73rem",color:card.active?"rgba(215,195,255,0.7)":"rgba(180,150,230,0.22)",marginBottom:5,display:"flex",alignItems:"center",gap:5}}>
                        <span style={{color:card.active?card.col:"rgba(138,47,201,0.18)",fontSize:"0.58rem"}}>◆</span>{item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <button onClick={()=>setView("form")} className="gh" style={{width:"100%",padding:"12px",borderRadius:12,cursor:"pointer",background:"transparent",border:"1px solid rgba(138,47,201,0.28)",color:"rgba(196,181,253,0.75)",fontFamily:"inherit",fontWeight:700,fontSize:"0.87rem",transition:"background .2s"}}>
                  ↺ Send Another Transaction
                </button>
                <button onClick={()=>{
                  const t=lastTx;
                  const lines=[`╔══════════════════════════════╗`,`   PRIVACY WORLD — TX REPORT   `,`╚══════════════════════════════╝`,`ID     : ${t.id}`,`Mode   : ${t.priv?"ENCRYPT MODE":"DECRYPT MODE"}`,`Score  : ${score}/100 — ${sLbl}`,`From   : ${t.priv?"[ENCRYPTED]":t.from}`,`To     : ${t.priv?"[ENCRYPTED]":t.to}`,`Amount : ${t.priv?"[ENCRYPTED]":t.amt+" $SEIS"}`,`Note   : ${t.priv?"[ENCRYPTED]":t.note}`,`Time   : ${t.time}`].join("\n");
                  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([lines],{type:"text/plain"}));a.download=`${t.id}-report.txt`;a.click();
                }} style={{width:"100%",padding:"12px",borderRadius:12,cursor:"pointer",background:"linear-gradient(135deg,#6A0DAD,#8B2FC9)",color:"#fff",border:"none",fontFamily:"inherit",fontWeight:700,fontSize:"0.87rem",boxShadow:"0 4px 16px rgba(106,13,173,0.35)",transition:"transform .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform=""}>
                  ⬇ Download Privacy Report
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GRAPH PAGE
// ══════════════════════════════════════════════════════════════════════════════
function GraphPage({txs,onBack}){
  const ref=useRef(null),anim=useRef(null);
  const score=calcScore(txs);const{label,c}=scoreInfo(score);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas||!txs.length)return;
    const ctx=canvas.getContext("2d");
    const W=canvas.width=canvas.offsetWidth||600,H=canvas.height=260;
    const map={};
    const node=(addr,x,y)=>{if(!map[addr])map[addr]={addr,x:x??Math.random()*(W-100)+50,y:y??Math.random()*(H-80)+40,op:0};return map[addr];};
    const edges=txs.map((tx,i)=>{const a=(i/txs.length)*Math.PI*2,cx=W/2,cy=H/2,r=Math.min(W,H)*.28;return{from:node(tx.from,cx+r*Math.cos(a-.3),cy+r*Math.sin(a-.3)),to:node(tx.to,cx+r*Math.cos(a+.3),cy+r*Math.sin(a+.3)),priv:tx.priv,prog:0};});
    const nodes=Object.values(map);let fr=0;
    const draw=()=>{
      ctx.clearRect(0,0,W,H);
      edges.forEach(e=>{if(e.prog<1)e.prog=Math.min(1,e.prog+.018);});
      edges.forEach((e,idx)=>{
        const col=e.priv?G:R,ex=e.from.x+(e.to.x-e.from.x)*e.prog,ey=e.from.y+(e.to.y-e.from.y)*e.prog;
        ctx.beginPath();ctx.moveTo(e.from.x,e.from.y);ctx.lineTo(ex,ey);ctx.strokeStyle=col;ctx.lineWidth=2;ctx.globalAlpha=.6;ctx.stroke();ctx.globalAlpha=1;
        if(e.prog>.95){const a=Math.atan2(e.to.y-e.from.y,e.to.x-e.from.x);ctx.beginPath();ctx.moveTo(e.to.x,e.to.y);ctx.lineTo(e.to.x-10*Math.cos(a-.4),e.to.y-10*Math.sin(a-.4));ctx.lineTo(e.to.x-10*Math.cos(a+.4),e.to.y-10*Math.sin(a+.4));ctx.closePath();ctx.fillStyle=col;ctx.fill();}
        const t=(fr*.009+idx*.3)%1;ctx.beginPath();ctx.arc(e.from.x+(e.to.x-e.from.x)*t,e.from.y+(e.to.y-e.from.y)*t,3.5,0,Math.PI*2);ctx.fillStyle=col;ctx.globalAlpha=.8;ctx.fill();ctx.globalAlpha=1;
      });
      nodes.forEach(n=>{
        n.op=Math.min(1,n.op+.04);ctx.globalAlpha=n.op;
        const g=ctx.createRadialGradient(n.x,n.y,2,n.x,n.y,18);g.addColorStop(0,"rgba(106,13,173,0.2)");g.addColorStop(1,"rgba(106,13,173,0)");
        ctx.beginPath();ctx.arc(n.x,n.y,18,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
        ctx.beginPath();ctx.arc(n.x,n.y,7,0,Math.PI*2);ctx.fillStyle=P;ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();
        ctx.font="9px monospace";ctx.fillStyle="rgba(200,170,255,0.6)";ctx.fillText(n.addr.slice(0,8)+"…",n.x-26,n.y+22);ctx.globalAlpha=1;
      });
      fr++;anim.current=requestAnimationFrame(draw);
    };
    draw();return()=>cancelAnimationFrame(anim.current);
  },[txs]);

  return(
    <div style={{position:"relative",zIndex:1,maxWidth:860,margin:"0 auto",padding:"28px 1.5rem",animation:"fadeUp .4s ease"}}>
      <button onClick={onBack} className="gh" style={{background:"transparent",border:"1px solid rgba(138,47,201,0.28)",color:"rgba(196,181,253,0.65)",borderRadius:8,padding:"6px 14px",fontWeight:600,fontSize:"0.78rem",cursor:"pointer",transition:"background .2s",fontFamily:"inherit",marginBottom:20,display:"flex",alignItems:"center",gap:6}}>← Dashboard</button>
      <h2 style={{fontSize:"1.25rem",fontWeight:800,color:"#e2d4ff",marginBottom:16}}>📊 Graph & Audit</h2>
      <div style={{background:"rgba(21,13,36,0.88)",border:"1px solid rgba(138,47,201,0.2)",borderRadius:16,padding:18,marginBottom:14,backdropFilter:"blur(14px)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <span style={{fontWeight:700,fontSize:"0.86rem",color:"#c4b5fd"}}>Transaction Network</span>
          <div style={{display:"flex",gap:8}}>
            <span style={{background:`${G}18`,border:`1px solid ${G}55`,color:G,borderRadius:20,padding:"3px 10px",fontSize:"0.72rem",fontWeight:700}}>🟢 Encrypt</span>
            <span style={{background:`${R}18`,border:`1px solid ${R}55`,color:R,borderRadius:20,padding:"3px 10px",fontSize:"0.72rem",fontWeight:700}}>🔴 Decrypt</span>
          </div>
        </div>
        {!txs.length?<div style={{textAlign:"center",color:"rgba(180,150,230,0.3)",padding:"40px 0",fontSize:"0.87rem"}}>No transactions yet.</div>:<canvas ref={ref} style={{width:"100%",height:260,display:"block",borderRadius:8}}/>}
      </div>
      {txs.length>0&&(
        <div style={{background:"rgba(21,13,36,0.88)",border:"1px solid rgba(138,47,201,0.2)",borderRadius:16,padding:"18px 16px",backdropFilter:"blur(14px)"}}>
          <div style={{fontWeight:800,fontSize:"0.95rem",color:"#e2d4ff",marginBottom:4}}>🔍 Privacy Audit</div>
          <div style={{fontSize:"0.78rem",color:"rgba(180,150,230,0.45)",marginBottom:14}}>What an observer can learn about your wallet.</div>
          <div style={{height:11,borderRadius:6,background:"rgba(138,47,201,0.15)",overflow:"hidden",marginBottom:6}}>
            <div style={{height:"100%",width:`${score}%`,background:c,borderRadius:6,transition:"width .9s ease"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.74rem",marginBottom:14}}>
            <span style={{color:c,fontWeight:700}}>{label}</span>
            <span style={{color:"rgba(180,150,230,0.4)"}}>Score: {score}/100</span>
          </div>
          {[["Total transactions",txs.length,"rgba(210,190,255,0.8)"],["🟢 Encrypted",txs.filter(t=>t.priv).length,G],["🔴 Decrypted (visible)",txs.filter(t=>!t.priv).length,R],["Total sent",`${txs.reduce((s,t)=>s+t.amt,0)} $SEIS`,"rgba(210,190,255,0.8)"]].map(([l,v,col],i,a)=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",fontSize:"0.84rem",borderBottom:i<a.length-1?"1px solid rgba(138,47,201,0.1)":"none"}}>
              <span style={{color:"rgba(180,150,230,0.55)"}}>{l}</span><strong style={{color:col}}>{v}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORY PAGE
// ══════════════════════════════════════════════════════════════════════════════
function HistoryPage({txs,onBack}){
  const [spy,setSpy]=useState(false);
  return(
    <div style={{position:"relative",zIndex:1,maxWidth:860,margin:"0 auto",padding:"28px 1.5rem",animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <button onClick={onBack} className="gh" style={{background:"transparent",border:"1px solid rgba(138,47,201,0.28)",color:"rgba(196,181,253,0.65)",borderRadius:8,padding:"6px 14px",fontWeight:600,fontSize:"0.78rem",cursor:"pointer",transition:"background .2s",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>← Dashboard</button>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:"0.76rem",color:"rgba(180,150,230,0.5)",fontWeight:600}}>👁 Spy View</span>
          <div onClick={()=>setSpy(p=>!p)} style={{width:40,height:21,borderRadius:11,background:spy?"rgba(220,38,38,0.6)":"rgba(138,47,201,0.22)",cursor:"pointer",position:"relative",transition:"background .2s",border:"1px solid rgba(138,47,201,0.28)"}}>
            <div style={{position:"absolute",top:2,left:spy?20:2,width:15,height:15,background:"#fff",borderRadius:"50%",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
          </div>
        </div>
      </div>
      <h2 style={{fontSize:"1.25rem",fontWeight:800,color:"#e2d4ff",marginBottom:16}}>📜 Transaction History</h2>
      {spy&&<div style={{background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.22)",borderRadius:9,padding:"10px 14px",marginBottom:13,fontSize:"0.79rem",color:"rgba(248,113,113,0.75)"}}>🕵️ <strong>Spy View ON</strong> — Encrypted txns show as ●●●●●●</div>}
      {!txs.length?<div style={{textAlign:"center",padding:"60px 0",color:"rgba(180,150,230,0.3)",fontSize:"0.88rem"}}>No transactions yet.</div>:(
        <div style={{background:"rgba(21,13,36,0.88)",border:"1px solid rgba(138,47,201,0.2)",borderRadius:16,overflow:"hidden",backdropFilter:"blur(14px)"}}>
          <div style={{padding:"12px 18px",background:"rgba(106,13,173,0.1)",borderBottom:"1px solid rgba(138,47,201,0.12)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:700,fontSize:"0.84rem",color:"#c4b5fd"}}>History ({txs.length})</span>
            <span style={{fontSize:"0.7rem",color:"rgba(180,150,230,0.35)"}}>{spy?"👁 Observer":"🔐 Your view"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"12px 1fr 1fr 90px 75px",gap:10,padding:"7px 18px",fontSize:"0.65rem",fontWeight:700,color:"rgba(180,150,230,0.3)",textTransform:"uppercase",letterSpacing:"0.5px",borderBottom:"1px solid rgba(138,47,201,0.08)"}}>
            {["","From","To","Amount","Mode"].map(h=><div key={h}>{h}</div>)}
          </div>
          {txs.map(tx=>{
            const hid=spy&&tx.priv;
            return(
              <div key={tx.id} style={{display:"grid",gridTemplateColumns:"12px 1fr 1fr 90px 75px",gap:10,padding:"11px 18px",borderBottom:"1px solid rgba(138,47,201,0.07)",alignItems:"center",animation:"fadeUp .3s ease"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:tx.priv?G:R,boxShadow:`0 0 6px ${tx.priv?G:R}77`}}/>
                <div style={{fontSize:"0.74rem",fontFamily:"monospace",color:hid?"rgba(124,58,237,0.45)":"rgba(205,185,255,0.7)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {hid?<span style={{letterSpacing:"3px",color:"#7c3aed"}}>●●●●●</span>:<span title={tx.from}>{tx.from.slice(0,8)}…</span>}
                </div>
                <div style={{fontSize:"0.74rem",fontFamily:"monospace",color:hid?"rgba(124,58,237,0.45)":"rgba(205,185,255,0.7)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {hid?<span style={{letterSpacing:"3px",color:"#7c3aed"}}>●●●●●</span>:<span title={tx.to}>{tx.to.slice(0,8)}…</span>}
                </div>
                <div style={{fontSize:"0.78rem",fontWeight:700,color:hid?"rgba(124,58,237,0.35)":"#c4b5fd"}}>
                  {hid?<span style={{letterSpacing:"3px",color:"#7c3aed"}}>●●●</span>:`-${tx.amt}`}
                </div>
                <div>
                  <span style={{background:tx.priv?"rgba(22,163,74,0.1)":"rgba(220,38,38,0.1)",border:`1px solid ${tx.priv?"rgba(22,163,74,0.28)":"rgba(220,38,38,0.28)"}`,color:tx.priv?"#4ade80":"#f87171",borderRadius:20,padding:"2px 8px",fontSize:"0.68rem",fontWeight:700}}>
                    {tx.priv?"🔒 Enc":"🔓 Dec"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
