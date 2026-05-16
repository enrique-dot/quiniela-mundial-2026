import { useState, useEffect, useCallback } from "react";

// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = "https://ynhzntyvwdficqqoknqd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluaHpudHl2d2RmaWNxcW9rbnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDU0NDYsImV4cCI6MjA5NDEyMTQ0Nn0.BBHSeP0Ixc28EsgPmZ4pF_O-v2ZieRhITFC8Pz8GlhI";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluaHpudHl2d2RmaWNxcW9rbnFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU0NTQ0NiwiZXhwIjoyMDk0MTIxNDQ2fQ.3Cd8NigKOMwqb0kZyArc7Q3MyunUz4pO5KkVDq3tLAw";
const ADMIN_PASSWORD = "mundial2026";

const sbFetch = async (path, options = {}, useServiceKey = false) => {
  const key = useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "Prefer": "return=representation", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const db = {
  getParticipantes: () => sbFetch("/participantes?select=*&order=registrado.asc"),
  registrarParticipante: (nombre, email, password) => sbFetch("/participantes", { method: "POST", body: JSON.stringify({ nombre, email, password, activo: false }) }),
  getPartidos: () => sbFetch("/partidos?select=*&order=grupo.asc,jornada.asc,id.asc"),
  actualizarPartido: (id, gl, gv) => sbFetch(`/partidos?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ goles_local: gl, goles_visitante: gv, jugado: true }) }, true),
  bloquearPartido: (id, bloqueado) => sbFetch(`/partidos?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ bloqueado }) }, true),
  confirmarJugador: (email, activo) => sbFetch(`/participantes?email=eq.${encodeURIComponent(email)}`, { method: "PATCH", body: JSON.stringify({ activo }) }, true),
  getPredicciones: () => sbFetch("/predicciones?select=*"),
  upsertPrediccion: (email, partido_id, goles_local, goles_visitante) => sbFetch("/predicciones", { method: "POST", headers: { "Prefer": "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ email, partido_id, goles_local, goles_visitante }) }),
  getEspeciales: () => sbFetch("/predicciones_especiales?select=*"),
  upsertEspeciales: (email, campeon, clasificados, lideres = {}) => sbFetch("/predicciones_especiales", { method: "POST", headers: { "Prefer": "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ email, campeon, clasificados, lideres }) }),
  getResultadosOficiales: () => sbFetch("/resultados_oficiales?select=*", {}, false).then(r => r?.[0] || {clasificados: [], lideres: {}}),
  guardarResultadosOficiales: (clasificados, lideres) => sbFetch("/resultados_oficiales?id=eq.1", { method: "PATCH", body: JSON.stringify({ clasificados, lideres, actualizado_at: new Date().toISOString() }) }, true),
};

const GRUPOS = {
  A: ["México", "Corea del Sur", "Sudáfrica", "República Checa"],
  B: ["Canadá", "Qatar", "Suiza", "Bosnia y Herzegovina"],
  C: ["Brasil", "Escocia", "Marruecos", "Haití"],
  D: ["Estados Unidos", "Paraguay", "Australia", "Turquía"],
  E: ["Alemania", "Costa de Marfil", "Ecuador", "Curazao"],
  F: ["Países Bajos", "Japón", "Túnez", "Suecia"],
  G: ["Bélgica", "Irán", "Nueva Zelanda", "Egipto"],
  H: ["España", "Arabia Saudita", "Uruguay", "Cabo Verde"],
  I: ["Francia", "Senegal", "Noruega", "Irak"],
  J: ["Argentina", "Argelia", "Austria", "Jordania"],
  K: ["Portugal", "Colombia", "Uzbekistán", "RD Congo"],
  L: ["Inglaterra", "Croacia", "Ghana", "Panamá"],
};
const TODOS_EQUIPOS = Object.values(GRUPOS).flat();

const FLAGS = {
  "México":"🇲🇽","Corea del Sur":"🇰🇷","Sudáfrica":"🇿🇦","Suecia":"🏳️",
  "Canadá":"🇨🇦","Qatar":"🇶🇦","Suiza":"🇨🇭","Bosnia y Herzegovina":"🏳️",
  "Brasil":"🇧🇷","Escocia":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","Marruecos":"🇲🇦","Haití":"🇭🇹",
  "Estados Unidos":"🇺🇸","Paraguay":"🇵🇾","Australia":"🇦🇺","Turquía":"🏳️",
  "Alemania":"🇩🇪","Costa de Marfil":"🇨🇮","Ecuador":"🇪🇨","Curazao":"🇨🇼",
  "Países Bajos":"🇳🇱","Japón":"🇯🇵","Túnez":"🇹🇳",
  "Suecia":"🇸🇪",
  "Bélgica":"🇧🇪","Irán":"🇮🇷","Nueva Zelanda":"🇳🇿","Egipto":"🇪🇬",
  "España":"🇪🇸","Arabia Saudita":"🇸🇦","Uruguay":"🇺🇾","Cabo Verde":"🇨🇻",
  "Francia":"🇫🇷","Senegal":"🇸🇳","Noruega":"🇳🇴","Irak":"🏳️",
  "Argentina":"🇦🇷","Argelia":"🇩🇿","Austria":"🇦🇹","Jordania":"🇯🇴",
  "Portugal":"🇵🇹","Colombia":"🇨🇴","Uzbekistán":"🇺🇿","RD Congo":"🏳️",
  "Inglaterra":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croacia":"🇭🇷","Ghana":"🇬🇭","Panamá":"🇵🇦",
};

const calcularPuntos = (pred, res) => {
  if (!pred || res.goles_local == null) return 0;
  const {goles_local:gl, goles_visitante:gv} = res;
  const {goles_local:pl, goles_visitante:pv} = pred;
  if (pl == null || pv == null) return 0;
  const aGL = pl===gl, aGV = pv===gv;
  const rR = gl>gv?"L":gv>gl?"V":"E", rP = pl>pv?"L":pv>pl?"V":"E";
  const aR = rR===rP;
  return (aGL?1:0)+(aGV?1:0)+(aR?1:0)+(aGL&&aGV&&aR?2:0);
};

const desglose = (pred, res) => {
  if (!pred || res.goles_local == null) return null;
  const {goles_local:gl, goles_visitante:gv} = res;
  const {goles_local:pl, goles_visitante:pv} = pred;
  if (pl == null || pv == null) return null;
  const aGL=pl===gl, aGV=pv===gv, rR=gl>gv?"L":gv>gl?"V":"E", rP=pl>pv?"L":pv>pl?"V":"E", aR=rR===rP;
  return {aGL,aGV,aR,bonus:aGL&&aGV&&aR,pts:calcularPuntos(pred,res)};
};

export default function App() {
  const [view, setView] = useState("home");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [predicciones, setPredicciones] = useState({});
  const [especiales, setEspeciales] = useState({});
  const [resultadosOficiales, setResultadosOficiales] = useState({clasificados: [], lideres: {}});
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("grupos");
  const [grupoFiltro, setGrupoFiltro] = useState("A");
  const [adminTab, setAdminTab] = useState("resultados");
  const [rankingTab, setRankingTab] = useState("puntos");

  useEffect(() => {
    (async () => {
      try {
        const [u,p,pred,esp,ro] = await Promise.all([db.getParticipantes(),db.getPartidos(),db.getPredicciones(),db.getEspeciales(),db.getResultadosOficiales()]);
        setUsers((u||[]).map(x=>({...x, activo: x.activo??false})));
        setPartidos((p||[]).map(x=>({...x, bloqueado: x.bloqueado??false})));
        const pm={};
        (pred||[]).forEach(r=>{if(!pm[r.email])pm[r.email]={};pm[r.email][r.partido_id]={goles_local:r.goles_local,goles_visitante:r.goles_visitante};});
        setPredicciones(pm);
        const em={};
        (esp||[]).forEach(r=>{em[r.email]={campeon:r.campeon,clasificados:r.clasificados||[],lideres:r.lideres||{}};});
        setEspeciales(em);
        setResultadosOficiales(ro || {clasificados: [], lideres: {}});
      } catch { showToast("Error al conectar con Supabase.","error"); }
      setLoading(false);
    })();
  },[]);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);};

  const calcTabla = useCallback(()=>
    users.filter(u=>u.activo).map(u=>({...u,pts:partidos.filter(p=>p.jugado).reduce((t,p)=>t+calcularPuntos((predicciones[u.email]||{})[p.id],p),0)})).sort((a,b)=>b.pts-a.pts)
  ,[users,predicciones,partidos]);

  const calcTablaClasificados = useCallback(()=>{
    const reales=new Set(resultadosOficiales.clasificados?.length > 0 ? resultadosOficiales.clasificados : Object.values(GRUPOS).flatMap(e=>e.slice(0,2)));
    return users.filter(u=>u.activo).map(u=>{const c=(especiales[u.email]||{}).clasificados||[];return{...u,aciertos:c.filter(e=>reales.has(e)).length,total:c.length};}).sort((a,b)=>b.aciertos-a.aciertos);
  },[users,especiales,resultadosOficiales]);

  const calcTablaLideres = useCallback(()=>{
    const lr={};
    Object.entries(GRUPOS).forEach(([g,eqs])=>{
      const pts=Object.fromEntries(eqs.map(e=>[e,0]));
      partidos.filter(p=>p.grupo===g&&p.jugado).forEach(p=>{
        if(p.goles_local>p.goles_visitante)pts[p.local]=(pts[p.local]||0)+3;
        else if(p.goles_local<p.goles_visitante)pts[p.visitante]=(pts[p.visitante]||0)+3;
        else{pts[p.local]=(pts[p.local]||0)+1;pts[p.visitante]=(pts[p.visitante]||0)+1;}
      });
      lr[g]=eqs.reduce((a,b)=>(pts[a]||0)>=(pts[b]||0)?a:b);
    });
    const lideresOficiales = Object.keys(resultadosOficiales.lideres||{}).length > 0 ? resultadosOficiales.lideres : lr;
    return users.filter(u=>u.activo).map(u=>{
      const pl=(especiales[u.email]||{}).lideres||{};
      return{...u,aciertos:Object.entries(lideresOficiales).filter(([g,l])=>pl[g]===l).length};
    }).sort((a,b)=>b.aciertos-a.aciertos);
  },[users,especiales,partidos,resultadosOficiales]);

  const inputCls = "bg-white/10 border border-white/20 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-400 w-full text-sm sm:text-base";
  const btnRed = "bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black uppercase tracking-wider transition-all active:scale-95";
  const btnGhost = "border border-white/15 text-white/50 hover:border-white/30 hover:text-white/80 transition-all font-semibold text-sm sm:text-base";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:"linear-gradient(135deg,#120308,#0a0a18)"}}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600;700;900&display=swap" rel="stylesheet"/>
      <div className="text-center"><div className="text-5xl sm:text-6xl animate-bounce mb-4">⚽</div><p className="text-white/30 tracking-[0.3em] text-xs uppercase">Cargando...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen text-white" style={{background:"linear-gradient(160deg,#120308 0%,#0a0a18 55%,#06060f 100%)",fontFamily:"'Barlow',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600;700;900&display=swap" rel="stylesheet"/>
      <div className="fixed top-0 w-full h-80 pointer-events-none" style={{background:"radial-gradient(ellipse 80% 60% at 50% -10%,rgba(180,20,20,0.22),transparent)"}}/>
      <div className="fixed bottom-0 right-0 w-72 h-72 pointer-events-none" style={{background:"radial-gradient(circle,rgba(220,160,0,0.06),transparent)"}}/>

      {toast&&<div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-2xl ${toast.type==="error"?"bg-red-600":"bg-emerald-600"} text-white`}>{toast.msg}</div>}

      {/* NAV */}
      <nav className="sticky top-0 z-40 border-b border-white/5" style={{background:"rgba(8,4,4,0.88)",backdropFilter:"blur(20px)"}}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <button onClick={()=>setView("home")} className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-base sm:text-lg shrink-0" style={{background:"linear-gradient(135deg,#dc2626,#7f1d1d)"}}>⚽</div>
            <div className="hidden sm:block">
              <div className="text-white font-black leading-none text-sm sm:text-base" style={{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.06em"}}>MUNDIAL</div>
              <div className="text-red-400/60 leading-none text-xs" style={{letterSpacing:"0.22em",textTransform:"uppercase"}}>Quiniela</div>
            </div>
          </button>
          <div className="flex items-center gap-1 sm:gap-2">
            {currentUser&&<div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-700/50 flex items-center justify-center font-black text-xs sm:text-sm text-red-200 shrink-0">{currentUser.nombre[0].toUpperCase()}</div>}
            <button onClick={()=>setView("info")} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition">ℹ️</button>
            <button onClick={()=>setView("ranking")} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition">🏆</button>
            <button onClick={()=>setView("premios")} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold text-green-400 border border-green-500/30 hover:bg-green-500/10 transition">💰</button>
            {currentUser
              ?<button onClick={()=>setView("lobby")} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs ${btnRed}`}>Picks</button>
              :<button onClick={()=>setView("auth")} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs ${btnRed}`}>Jugar</button>
            }
            <button onClick={()=>setView("admin")} className="text-white/15 hover:text-white/40 transition px-2">⚙️</button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-12">
        {view==="home"&&<HomeView setView={setView} users={users} partidos={partidos} currentUser={currentUser} setCurrentUser={setCurrentUser} showToast={showToast} inputCls={inputCls} btnRed={btnRed} btnGhost={btnGhost}/>}
        {view==="auth"&&<AuthView setView={setView} users={users} setUsers={setUsers} setCurrentUser={setCurrentUser} showToast={showToast} inputCls={inputCls} btnRed={btnRed}/>}
        {view==="register"&&<RegisterView setView={setView} users={users} setUsers={setUsers} setCurrentUser={setCurrentUser} showToast={showToast} inputCls={inputCls} btnRed={btnRed}/>}
        {view==="lobby"&&currentUser&&<LobbyView currentUser={currentUser} partidos={partidos} predicciones={predicciones} setPredicciones={setPredicciones} especiales={especiales} setEspeciales={setEspeciales} activeTab={activeTab} setActiveTab={setActiveTab} grupoFiltro={grupoFiltro} setGrupoFiltro={setGrupoFiltro} showToast={showToast} inputCls={inputCls} btnRed={btnRed} users={users} resultadosOficiales={resultadosOficiales}/>}
        {view==="ranking"&&<RankingView tabla={calcTabla()} tablaClasificados={calcTablaClasificados()} tablaLideres={calcTablaLideres()} partidos={partidos} rankingTab={rankingTab} setRankingTab={setRankingTab} users={users}/>}
        {view==="premios"&&<PremiosView tabla={calcTabla()} tablaClasificados={calcTablaClasificados()} tablaLideres={calcTablaLideres()} users={users}/>}
        {view==="info"&&<InfoView setView={setView} users={users}/>}
        {view==="admin"&&<AdminView adminUnlocked={adminUnlocked} setAdminUnlocked={setAdminUnlocked} adminPass={adminPass} setAdminPass={setAdminPass} partidos={partidos} setPartidos={setPartidos} users={users} setUsers={setUsers} predicciones={predicciones} resultadosOficiales={resultadosOficiales} setResultadosOficiales={setResultadosOficiales} adminTab={adminTab} setAdminTab={setAdminTab} showToast={showToast} inputCls={inputCls} btnRed={btnRed}/>}
      </div>
    </div>
  );
}

// ─── HOME ────────────────────────────────────────────────────
function HomeView({setView,users,partidos,currentUser,setCurrentUser,showToast,inputCls,btnRed,btnGhost}){
  const [email,setEmail]=useState("");
  const [loginPwd,setLoginPwd]=useState("");
  const [showLoginPwd,setShowLoginPwd]=useState(false);
  const jugados=partidos.filter(p=>p.jugado).length;
  const proximos=partidos.filter(p=>!p.jugado).slice(0,3);

  return(
    <div className="pt-4 sm:pt-5 space-y-4 sm:space-y-5">
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden" style={{minHeight:160,background:"linear-gradient(135deg,#7f0000 0%,#3a0000 45%,#0d0d22 100%)"}}>
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:"repeating-linear-gradient(45deg,transparent,transparent 18px,rgba(255,255,255,0.04) 18px,rgba(255,255,255,0.04) 19px)"}}/>
        <div className="absolute -right-4 -top-4 text-6xl sm:text-[8rem] opacity-10 select-none rotate-12">🏆</div>
        <div className="relative p-4 sm:p-6">
          <div className="text-red-300/70 text-[9px] sm:text-[10px] uppercase tracking-[0.35em] mb-2 font-semibold">⚽ La Quiniela Oficial</div>
          <h1 className="text-white leading-[0.95] mb-3" style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(1.8rem,6vw,3.5rem)",letterSpacing:"0.03em"}}>
            LA QUINIELA<br/>DEL MUNDIAL
          </h1>
          <p className="text-white/40 text-xs sm:text-sm mb-4">Predice marcadores · Compite · Gana</p>
          <div className="flex gap-4 sm:gap-6">
            {[{n:users.length,l:"Jugadores"},{n:partidos.length,l:"Partidos"},{n:jugados,l:"Jugados"}].map(({n,l})=>(
              <div key={l}>
                <div className="text-amber-400 font-black text-lg sm:text-2xl leading-none" style={{fontFamily:"'Bebas Neue',sans-serif"}}>{n}</div>
                <div className="text-white/35 text-[9px] sm:text-[10px] uppercase tracking-widest">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {currentUser?(
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-red-500/20" style={{background:"rgba(127,0,0,0.12)"}}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-600/40 flex items-center justify-center font-black text-red-200 text-sm sm:text-lg shrink-0">{currentUser.nombre[0].toUpperCase()}</div>
            <div className="min-w-0"><div className="font-bold text-xs sm:text-sm truncate">{currentUser.nombre}</div><div className="text-white/30 text-xs truncate">{currentUser.email}</div></div>
          </div>
          {currentUser.activo
            ?<button onClick={()=>setView("lobby")} className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base ${btnRed}`} style={{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.1em"}}>
              VER MIS PREDICCIONES →
            </button>
            :<div className="w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl text-center border border-amber-500/30" style={{background:"rgba(100,65,0,0.15)"}}>
              <div className="text-amber-400 font-black text-sm sm:text-base" style={{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.05em"}}>⏳ PAGO PENDIENTE</div>
              <p className="text-white/35 text-xs sm:text-sm mt-1">El admin confirmará tu acceso una vez que realices tu pago de $200</p>
            </div>
          }
          <button onClick={()=>setView("ranking")} className={`w-full py-2 sm:py-3 rounded-xl text-xs sm:text-sm ${btnGhost}`}>🏆 Tabla</button>
          <button onClick={()=>setView("info")} className={`w-full py-2 sm:py-3 rounded-xl text-xs sm:text-sm ${btnGhost}`}>ℹ️ ¿Cómo funciona?</button>
          <button onClick={()=>{setCurrentUser(null);}} className="w-full py-2 text-white/25 text-xs hover:text-white/50 transition">Cerrar sesión</button>
        </div>
      ):(
        <div className="space-y-3">
          <button onClick={()=>setView("auth")} className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg ${btnRed}`} style={{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.1em"}}>
            JUGAR
          </button>
        </div>
      )}

      {proximos.length>0&&(
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-semibold">Próximos</p>
            {currentUser&&<button onClick={()=>setView("lobby")} className="text-red-400 text-xs font-bold">Ver todos →</button>}
          </div>
          <div className="space-y-2">
            {proximos.map(p=>(
              <div key={p.id} className="rounded-lg sm:rounded-2xl border border-white/8 overflow-hidden p-2 sm:p-3" style={{background:"rgba(255,255,255,0.025)"}}>
                <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-start">
                  <div className="text-[9px] text-white/25 text-center shrink-0">
                    <div className="font-bold text-white/40 text-xs">G{p.grupo}</div>
                    <div className="text-[8px]">{p.fecha}</div>
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                      <span className="text-xl sm:text-3xl">{FLAGS[p.local]||"🏳️"}</span>
                      <span className="text-[9px] sm:text-[11px] text-white/60 text-center leading-tight truncate w-full">{p.local}</span>
                    </div>
                    <div className="text-white/20 font-black text-xs">VS</div>
                    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                      <span className="text-xl sm:text-3xl">{FLAGS[p.visitante]||"🏳️"}</span>
                      <span className="text-[9px] sm:text-[11px] text-white/60 text-center leading-tight truncate w-full">{p.visitante}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AUTH ────────────────────────────────────────────────────
function AuthView({setView,users,setUsers,setCurrentUser,showToast,inputCls,btnRed}){
  return(
    <div className="pt-8 max-w-xs mx-auto space-y-4">
      <div className="rounded-2xl sm:rounded-3xl p-6 text-center" style={{background:"linear-gradient(135deg,#2a0808,#0a0a1a)"}}>
        <div className="text-4xl sm:text-5xl mb-3">🎫</div>
        <h2 className="text-white font-black text-xl sm:text-2xl" style={{fontFamily:"'Bebas Neue',sans-serif"}}>ACCESO</h2>
        <p className="text-white/35 text-xs sm:text-sm">Registrarse o ingresar</p>
      </div>
      <button onClick={()=>setView("register")} className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base ${btnRed}`} style={{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.08em"}}>
        + NUEVO REGISTRO
      </button>
      <button onClick={()=>setView("home")} className="w-full py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm border border-white/15 text-white/50 hover:border-white/30 transition font-semibold">
        ← Volver
      </button>
    </div>
  );
}

// ─── REGISTER ────────────────────────────────────────────────────
function RegisterView({setView,users,setUsers,setCurrentUser,showToast,inputCls,btnRed}){
  const [nombre,setNombre]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [password2,setPassword2]=useState("");
  const [loading,setLoading]=useState(false);

  const registrar=async()=>{
    if(!nombre.trim()){showToast("Ingresa tu nombre","error");return;}
    if(!email.includes("@")){showToast("Email inválido","error");return;}
    if(users.find(u=>u.email.toLowerCase()===email.toLowerCase())){showToast("Este email ya está registrado","error");return;}
    if(password.length<4){showToast("La contraseña debe tener al menos 4 caracteres","error");return;}
    if(password!==password2){showToast("Las contraseñas no coinciden","error");return;}

    setLoading(true);
    try{
      await db.registrarParticipante(nombre,email,password);
      setUsers([...users,{nombre,email,password,activo:false,registrado:new Date().toISOString()}]);
      showToast("✅ Registrado. El admin confirmará tu pago.");
      setView("home");
    }catch{
      showToast("Error al registrar","error");
    }
    setLoading(false);
  };

  return(
    <div className="pt-8 max-w-xs mx-auto space-y-4">
      <div className="rounded-2xl sm:rounded-3xl p-6 text-center" style={{background:"linear-gradient(135deg,#2a0808,#0a0a1a)"}}>
        <div className="text-4xl sm:text-5xl mb-3">✍️</div>
        <h2 className="text-white font-black text-xl sm:text-2xl" style={{fontFamily:"'Bebas Neue',sans-serif"}}>REGISTRO</h2>
        <p className="text-white/35 text-xs sm:text-sm">Completa el formulario</p>
      </div>

      <div className="space-y-2">
        <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Tu nombre" className={inputCls}/>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="tu@email.com" className={inputCls}/>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Contraseña" className={inputCls}/>
        <input value={password2} onChange={e=>setPassword2(e.target.value)} type="password" placeholder="Confirmar contraseña"
          onKeyDown={e=>e.key==="Enter"&&registrar()}
          className={inputCls}/>
      </div>

      <button onClick={registrar} disabled={loading} className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base ${loading?"bg-white/10 text-white/30":""}${!loading?btnRed:""}`} style={{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.08em"}}>
        {loading?"REGISTRANDO...":"CREAR CUENTA"}
      </button>
      <button onClick={()=>setView("auth")} className="w-full py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm border border-white/15 text-white/50 hover:border-white/30 transition font-semibold">
        ← Volver
      </button>
    </div>
  );
}

// ─── LOBBY ────────────────────────────────────────────────────
function LobbyView({currentUser,partidos,predicciones,setPredicciones,especiales,setEspeciales,activeTab,setActiveTab,grupoFiltro,setGrupoFiltro,showToast,inputCls,btnRed,users,resultadosOficiales}){
  const [pronTab,setPronTab]=useState("partidos");
  const [campeon,setCampeon]=useState("");
  const [clasificados,setClasificados]=useState([]);
  const [lideres,setLideres]=useState({});

  useEffect(()=>{
    const ep=(especiales[currentUser.email]||{});
    setCampeon(ep.campeon||"");
    setClasificados(ep.clasificados||[]);
    setLideres(ep.lideres||{});
  },[currentUser,especiales]);

  const pg=partidos.filter(p=>p.grupo===grupoFiltro).sort((a,b)=>a.jornada-b.jornada);
  const reales=new Set(resultadosOficiales.clasificados?.length > 0 ? resultadosOficiales.clasificados : Object.values(GRUPOS).flatMap(e=>e.slice(0,2)));
  const lr={};
  Object.entries(GRUPOS).forEach(([g,eqs])=>{
    const pts=Object.fromEntries(eqs.map(e=>[e,0]));
    partidos.filter(p=>p.grupo===g&&p.jugado).forEach(p=>{
      if(p.goles_local>p.goles_visitante)pts[p.local]=(pts[p.local]||0)+3;
      else if(p.goles_local<p.goles_visitante)pts[p.visitante]=(pts[p.visitante]||0)+3;
      else{pts[p.local]=(pts[p.local]||0)+1;pts[p.visitante]=(pts[p.visitante]||0)+1;}
    });
    lr[g]=eqs.reduce((a,b)=>(pts[a]||0)>=(pts[b]||0)?a:b);
  });
  const lideresOficiales = Object.keys(resultadosOficiales.lideres||{}).length > 0 ? resultadosOficiales.lideres : lr;

  const updatePron=(pid,gl,gv)=>{
    setPredicciones(p=>({...p,[currentUser.email]:{...(p[currentUser.email]||{}),[pid]:{goles_local:parseInt(gl),goles_visitante:parseInt(gv)}}}));
    db.upsertPrediccion(currentUser.email,pid,parseInt(gl),parseInt(gv)).catch(()=>showToast("Error al guardar","error"));
  };

  const updateEsp=async()=>{
    try{
      await db.upsertEspeciales(currentUser.email,campeon,clasificados,lideres);
      setEspeciales(p=>({...p,[currentUser.email]:{campeon,clasificados,lideres}}));
      showToast("✅ Predicciones especiales guardadas");
    }catch{showToast("Error","error");}
  };

  const toggleClasif=(eq)=>{
    if(clasificados.includes(eq))setClasificados(clasificados.filter(e=>e!==eq));
    else if(clasificados.length<32)setClasificados([...clasificados,eq]);
  };

  return(
    <div className="pt-4 space-y-4">
      <div className="flex gap-1 p-1 rounded-xl sm:rounded-2xl" style={{background:"rgba(255,255,255,0.05)"}}>
        {[["partidos","⚽ Partidos"],["especiales","🎯 Especiales"]].map(([id,l])=>(
          <button key={id} onClick={()=>setPronTab(id)}
            className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wide transition ${pronTab===id?"bg-red-600 text-white":"text-white/35"}`}>{l}</button>
        ))}
      </div>

      {pronTab==="partidos"&&(
        <div className="space-y-3">
          <div className="flex gap-1 overflow-x-auto pb-2" style={{scrollbarWidth:"none"}}>
            {Object.keys(GRUPOS).map(g=>(
              <button key={g} onClick={()=>setGrupoFiltro(g)}
                className={`w-9 h-9 shrink-0 rounded-lg text-xs sm:text-sm font-black transition ${grupoFiltro===g?"bg-red-600 text-white":"text-white/40 border border-white/10"}`}>{g}</button>
            ))}
          </div>

          {[1,2,3].map(j=>{
            const ps=pg.filter(p=>p.jornada===j);
            if(!ps.length)return null;
            return(
              <div key={j}>
                <div className="flex items-center gap-2 my-2 sm:my-3">
                  <div className="h-px flex-1 bg-white/8"/>
                  <span className="text-white/20 text-[9px] sm:text-[10px] uppercase tracking-widest">Jornada {j}</span>
                  <div className="h-px flex-1 bg-white/8"/>
                </div>
                {ps.map(p=>{
                  const pred=(predicciones[currentUser.email]||{})[p.id]||{goles_local:"",goles_visitante:""};
                  const pts = p.jugado ? calcularPuntos(pred, p) : null;
                  return(
                    <div key={p.id} className={`rounded-lg sm:rounded-2xl border mb-2 overflow-hidden transition text-xs sm:text-sm ${p.bloqueado?"border-orange-500/25":"border-white/8"} ${p.jugado?"border-emerald-500/25":"border-white/8"}`}
                      style={{background:p.bloqueado?"rgba(80,40,0,0.15)":"rgba(255,255,255,0.025)"}}>
                      <div className="flex items-center justify-between px-3 sm:px-4 pt-2 sm:pt-3 pb-1">
                        <span className="text-white/20 text-[9px] sm:text-[10px]">{p.fecha}</span>
                        <div className="flex items-center gap-2">
                          {p.bloqueado&&<span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/25 text-orange-400 border border-orange-500/25">🔒</span>}
                          {p.jugado&&<span className={`text-[9px] px-2 py-0.5 rounded-full border ${pts > 0 ? 'bg-green-500/25 text-green-400 border-green-500/25' : 'bg-red-500/25 text-red-400 border-red-500/25'}`}>
                            {p.goles_local}:{p.goles_visitante} {pts > 0 ? `+${pts}` : '+0'} pts
                          </span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 pb-3 sm:pb-4 pt-2">
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-2xl sm:text-3xl">{FLAGS[p.local]||"🏳️"}</span>
                          <span className="text-white/55 text-[9px] sm:text-[11px] text-center leading-tight">{p.local}</span>
                        </div>
                        {!p.bloqueado&&!p.jugado?(
                          <div className="flex items-center gap-1 sm:gap-2">
                            <input type="number" min="0" max="20" value={pred.goles_local??""} onChange={e=>updatePron(p.id,e.target.value,pred.goles_visitante??"")}
                              placeholder="-" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg text-center font-black text-lg border border-white/20 focus:outline-none focus:border-red-500 bg-white/10 text-white [appearance:textfield]"/>
                            <span className="text-white/20 font-black">:</span>
                            <input type="number" min="0" max="20" value={pred.goles_visitante??""} onChange={e=>updatePron(p.id,pred.goles_local??"",e.target.value)}
                              placeholder="-" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg text-center font-black text-lg border border-white/20 focus:outline-none focus:border-red-500 bg-white/10 text-white [appearance:textfield]"/>
                          </div>
                        ):(
                          <div className="flex items-center gap-1 sm:gap-2">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-black text-lg flex items-center justify-center bg-white/10 text-white/40">{pred.goles_local??"-"}</div>
                            <span className="text-white/20 font-black">:</span>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-black text-lg flex items-center justify-center bg-white/10 text-white/40">{pred.goles_visitante??"-"}</div>
                          </div>
                        )}
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-2xl sm:text-3xl">{FLAGS[p.visitante]||"🏳️"}</span>
                          <span className="text-white/55 text-[9px] sm:text-[11px] text-center leading-tight">{p.visitante}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {pronTab==="especiales"&&(
        <div className="space-y-4">
          <div className="rounded-lg sm:rounded-2xl border border-amber-500/20 p-3 sm:p-4 space-y-2 sm:space-y-3" style={{background:"rgba(100,65,0,0.12)"}}>
            <label className="text-white/60 text-xs sm:text-sm font-bold block">🏆 Campeón</label>
            <select value={campeon} onChange={e=>setCampeon(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-2 sm:px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-red-400">
              <option value="">- Seleccionar -</option>
              {Object.values(GRUPOS).flat().map(eq=>(
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>

          <div className="rounded-lg sm:rounded-2xl border border-blue-500/20 p-3 sm:p-4 space-y-2 sm:space-y-3" style={{background:"rgba(0,50,90,0.12)"}}>
            <label className="text-white/60 text-xs sm:text-sm font-bold block">🎯 32 Clasificados</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-2">
              {Object.values(GRUPOS).flat().map(eq=>(
                <button key={eq} onClick={()=>toggleClasif(eq)}
                  className={`px-2 py-1.5 sm:py-2 rounded text-xs font-bold transition ${clasificados.includes(eq)?"bg-blue-600 text-white":"bg-white/10 text-white/40 hover:bg-white/20"}`}>
                  {eq.split(" ")[0]}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-white/30 text-xs">{clasificados.length}/32</p>
            </div>
          </div>

          <div className="rounded-lg sm:rounded-2xl border border-green-500/20 p-3 sm:p-4 space-y-2 sm:space-y-3" style={{background:"rgba(0,70,40,0.12)"}}>
            <label className="text-white/60 text-xs sm:text-sm font-bold block">👑 Líderes de Grupo</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
              {Object.entries(GRUPOS).map(([g,eqs])=>(
                <div key={g}>
                  <label className="text-white/40 text-xs mb-1 block">G{g}</label>
                  <select value={lideres[g]||""} onChange={e=>setLideres({...lideres,[g]:e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-green-400">
                    <option value="">-</option>
                    {eqs.map(eq=>(
                      <option key={eq} value={eq}>{eq.split(" ")[0]}</option>
                    ))}
                  </select>
                  {lideresOficiales[g] && (
                    <div className="mt-1 text-center text-[10px]">
                      {lideres[g]===lideresOficiales[g] ? "✅" : lideres[g] ? "❌" : "⏳"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg sm:rounded-2xl border border-purple-500/20 p-3 sm:p-4 space-y-2 sm:space-y-3" style={{background:"rgba(100,50,150,0.12)"}}>
            <label className="text-white/60 text-xs sm:text-sm font-bold block">📋 Aciertos Clasificados</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
              {clasificados.map(eq=>(
                <div key={eq} className={`px-2 py-1.5 rounded text-xs font-bold text-center ${reales.has(eq)?"bg-green-500/25 text-green-400":"bg-red-500/25 text-red-400"}`}>
                  {reales.has(eq)?"✅":"❌"} {eq.split(" ")[0]}
                </div>
              ))}
            </div>
            {clasificados.length === 0 && <p className="text-white/30 text-xs">Selecciona equipos arriba para ver aciertos</p>}
          </div>

          <button onClick={updateEsp} className="w-full py-3 rounded-lg sm:rounded-xl font-black text-sm sm:text-base bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white uppercase tracking-wide transition">
            💾 GUARDAR
          </button>
        </div>
      )}
    </div>
  );
}

// ─── RANKING ────────────────────────────────────────────────────
function RankingView({tabla,tablaClasificados,tablaLideres,partidos,rankingTab,setRankingTab,users}){
  return(
    <div className="pt-4 space-y-4">
      <div className="flex gap-1 p-1 rounded-xl sm:rounded-2xl" style={{background:"rgba(255,255,255,0.05)"}}>
        {[["puntos","⚽ Puntos"],["clasificados","🎯 Clasificados"],["lideres","👑 Líderes"]].map(([id,l])=>(
          <button key={id} onClick={()=>setRankingTab(id)}
            className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wide transition ${rankingTab===id?"bg-red-600 text-white":"text-white/35"}`}>{l}</button>
        ))}
      </div>

      {rankingTab==="puntos"&&(
        <div className="space-y-2">
          {tabla.map((u,i)=>(
            <div key={u.email} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-2xl border border-white/8" style={{background:"rgba(255,255,255,0.025)"}}>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-600/40 flex items-center justify-center font-black text-red-200 text-xs sm:text-sm shrink-0">{i+1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs sm:text-sm truncate">{u.nombre}</div>
                <div className="text-white/35 text-xs truncate">{u.email}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-base sm:text-lg text-amber-400">{u.pts}</div>
                <div className="text-white/25 text-[9px] sm:text-[10px]">pts</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rankingTab==="clasificados"&&(
        <div className="space-y-2">
          {tablaClasificados.map((u,i)=>(
            <div key={u.email} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-2xl border border-white/8" style={{background:"rgba(255,255,255,0.025)"}}>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600/40 flex items-center justify-center font-black text-blue-200 text-xs sm:text-sm shrink-0">{i+1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs sm:text-sm truncate">{u.nombre}</div>
                <div className="text-white/35 text-xs truncate">{u.email}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-base sm:text-lg text-blue-400">{u.aciertos}/{u.total}</div>
                <div className="text-white/25 text-[9px] sm:text-[10px]">aciertos</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rankingTab==="lideres"&&(
        <div className="space-y-2">
          {tablaLideres.map((u,i)=>(
            <div key={u.email} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-2xl border border-white/8" style={{background:"rgba(255,255,255,0.025)"}}>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-600/40 flex items-center justify-center font-black text-green-200 text-xs sm:text-sm shrink-0">{i+1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs sm:text-sm truncate">{u.nombre}</div>
                <div className="text-white/35 text-xs truncate">{u.email}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-base sm:text-lg text-green-400">{u.aciertos}/12</div>
                <div className="text-white/25 text-[9px] sm:text-[10px]">líderes</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PREMIOS ────────────────────────────────────────────────────
function PremiosView({tabla,tablaClasificados,tablaLideres,users}){
  const fmt=n=>`$${Math.round(n).toLocaleString("es-MX")}`;
  const total=users.filter(u=>u.activo).length*200;

  return(
    <div className="pt-4 space-y-4 sm:space-y-5">
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden p-4 sm:p-6" style={{background:"linear-gradient(135deg,#2a0808,#0a0a1a)"}}>
        <div className="relative">
          <div className="absolute right-4 top-4 text-4xl sm:text-6xl opacity-15 select-none">💰</div>
          <p className="text-red-300/70 text-[9px] sm:text-[10px] uppercase tracking-[0.35em] mb-2">Distribución</p>
          <h2 className="text-white leading-none mb-1 text-lg sm:text-2xl font-black" style={{fontFamily:"'Bebas Neue',sans-serif"}}>POZO</h2>
          <h3 className="text-amber-400 text-xl sm:text-2xl font-black" style={{fontFamily:"'Bebas Neue',sans-serif"}}>{fmt(total)}</h3>
          <p className="text-white/40 text-xs mt-2">{users.filter(u=>u.activo).length} jugadores × $200</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[{n:fmt(total*0.50),l:"50%"},{n:fmt(total*0.25),l:"25%"},{n:fmt(total*0.25),l:"25%"}].map(({n,l})=>(
          <div key={l} className="rounded-lg p-2 sm:p-3 border border-white/10 text-center" style={{background:"rgba(255,255,255,0.03)"}}>
            <div className="text-amber-400 font-black text-xs sm:text-sm">{n}</div>
            <div className="text-white/30 text-[9px] mt-1">{l}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2 sm:space-y-3">
        <div className="rounded-lg sm:rounded-2xl border border-amber-500/25 p-3 sm:p-4" style={{background:"rgba(100,65,0,0.12)"}}>
          <p className="text-amber-400 font-black text-xs sm:text-sm mb-2">⚽ PUNTOS</p>
          <div className="space-y-1 text-white/60 text-[10px] sm:text-xs">
            <p>🥇 1er: 50%</p>
            <p>🥈 2do: 30%</p>
            <p>🥉 3er: 20%</p>
          </div>
        </div>

        <div className="rounded-lg sm:rounded-2xl border border-blue-500/25 p-3 sm:p-4" style={{background:"rgba(0,50,90,0.12)"}}>
          <p className="text-blue-400 font-black text-xs sm:text-sm mb-2">🎯 CLASIFICADOS</p>
          <div className="space-y-1 text-white/60 text-[10px] sm:text-xs">
            <p>🥇 1er: 50%</p>
            <p>🥈 2do: 30%</p>
            <p>🥉 3er: 20%</p>
          </div>
        </div>

        <div className="rounded-lg sm:rounded-2xl border border-green-500/25 p-3 sm:p-4" style={{background:"rgba(0,70,40,0.12)"}}>
          <p className="text-green-400 font-black text-xs sm:text-sm mb-2">👑 LÍDERES</p>
          <div className="space-y-1 text-white/60 text-[10px] sm:text-xs">
            <p>🥇 1er: 50%</p>
            <p>🥈 2do: 30%</p>
            <p>🥉 3er: 20%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── INFO ────────────────────────────────────────────────────
function InfoView({setView,users}){
  return(
    <div className="pt-4 space-y-4">
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden p-4 sm:p-6" style={{background:"linear-gradient(135deg,#7f0000,#1a0000,#0a0a20)"}}>
        <p className="text-red-300/70 text-[9px] sm:text-[10px] uppercase tracking-[0.35em] mb-2">Guía</p>
        <h2 className="text-white leading-none mb-2 text-lg sm:text-2xl font-black" style={{fontFamily:"'Bebas Neue',sans-serif"}}>¿CÓMO FUNCIONA?</h2>
        <p className="text-white/40 text-xs sm:text-sm">Predice, compite, gana</p>
      </div>

      <div className="space-y-3 sm:space-y-4 text-white/65 text-xs sm:text-sm">
        <div className="rounded-lg sm:rounded-2xl border border-white/10 p-3 sm:p-4" style={{background:"rgba(255,255,255,0.025)"}}>
          <p className="font-bold text-white mb-2">⚽ Puntos</p>
          <p className="text-[10px] sm:text-xs">+1 gol correcto, +1 resultado correcto, +2 bonus por marcador exacto</p>
        </div>
        <div className="rounded-lg sm:rounded-2xl border border-white/10 p-3 sm:p-4" style={{background:"rgba(255,255,255,0.025)"}}>
          <p className="font-bold text-white mb-2">🎯 Clasificados</p>
          <p className="text-[10px] sm:text-xs">Predice los 32 equipos que avanzan a octavos (2 por grupo)</p>
        </div>
        <div className="rounded-lg sm:rounded-2xl border border-white/10 p-3 sm:p-4" style={{background:"rgba(255,255,255,0.025)"}}>
          <p className="font-bold text-white mb-2">👑 Líderes</p>
          <p className="text-[10px] sm:text-xs">Predice el líder de cada grupo (12 total)</p>
        </div>
        <div className="rounded-lg sm:rounded-2xl border border-white/10 p-3 sm:p-4" style={{background:"rgba(255,255,255,0.025)"}}>
          <p className="font-bold text-white mb-2">📅 Calendario</p>
          <p className="text-[10px] sm:text-xs">Fase de grupos: 11 jun - 19 jul 2026</p>
        </div>
      </div>

      <button onClick={()=>setView("home")} className="w-full py-2 text-white/30 text-xs hover:text-white/50 transition">
        ← Volver
      </button>
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────
function AdminView({adminUnlocked,setAdminUnlocked,adminPass,setAdminPass,partidos,setPartidos,users,setUsers,predicciones,resultadosOficiales,setResultadosOficiales,adminTab,setAdminTab,showToast,inputCls,btnRed}){
  const [grupoFiltro,setGrupoFiltro]=useState("A");
  const [temp,setTemp]=useState({});
  const [saving,setSaving]=useState(false);
  const [adminClasificados, setAdminClasificados] = useState(resultadosOficiales.clasificados || []);
  const [adminLideres, setAdminLideres] = useState(resultadosOficiales.lideres || {});

  if(!adminUnlocked) return(
    <div className="pt-8 max-w-xs mx-auto text-center space-y-4">
      <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8" style={{background:"linear-gradient(135deg,#2a0808,#0a0a1a)"}}>
        <div className="text-4xl sm:text-5xl mb-3">🔐</div>
        <h2 className="text-white font-black text-xl sm:text-2xl" style={{fontFamily:"'Bebas Neue',sans-serif"}}>PANEL ADMIN</h2>
        <p className="text-white/35 text-xs sm:text-sm">Solo para el administrador</p>
      </div>
      <input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&(adminPass===ADMIN_PASSWORD?setAdminUnlocked(true):showToast("Contraseña incorrecta","error"))}
        placeholder="Contraseña..." className={inputCls+" text-center text-lg sm:text-xl tracking-widest"}/>
      <button onClick={()=>adminPass===ADMIN_PASSWORD?setAdminUnlocked(true):showToast("Contraseña incorrecta","error")}
        className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-2xl text-sm sm:text-base ${btnRed}`} style={{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.08em"}}>
        ACCEDER
      </button>
    </div>
  );

  const setR=(id,campo,v)=>{const n=parseInt(v);if(isNaN(n)||n<0)return;setTemp(p=>({...p,[id]:{...p[id],[campo]:n}}));};
  const guardar=async()=>{
    setSaving(true);
    try{
      await Promise.all(Object.entries(temp).map(([id,v])=>{
        if(v.goles_local===undefined||v.goles_visitante===undefined)return null;
        return db.actualizarPartido(id,v.goles_local,v.goles_visitante);
      }).filter(Boolean));
      setPartidos(ps=>ps.map(p=>{
        if(!temp[p.id])return p;
        const {goles_local:gl,goles_visitante:gv}=temp[p.id];
        if(gl===undefined||gv===undefined)return p;
        return{...p,goles_local:gl,goles_visitante:gv,jugado:true};
      }));
      setTemp({});
      showToast("Resultados guardados ✅");
    }catch{showToast("Error al guardar.","error");}
    setSaving(false);
  };

  const pg=partidos.filter(p=>p.grupo===grupoFiltro);

  return(
    <div className="pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-black text-lg sm:text-2xl" style={{fontFamily:"'Bebas Neue',sans-serif"}}>PANEL ADMIN</h2>
          <p className="text-white/25 text-xs">Supabase conectado</p>
        </div>
        <button onClick={()=>setAdminUnlocked(false)} className="text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-red-500/25 text-red-400 hover:bg-red-500/10 transition">Salir</button>
      </div>

      <div className="flex gap-1 p-1 rounded-lg sm:rounded-2xl flex-wrap" style={{background:"rgba(255,255,255,0.05)"}}>
        {[["resultados","⚽ Editar"],["jugadores","👥 Jugadores"],["resultados_oficiales","📋 Oficiales"]].map(([id,l])=>(
          <button key={id} onClick={()=>setAdminTab(id)}
            className={`flex-1 min-w-max py-2 px-2 sm:px-3 rounded-lg text-xs font-black uppercase tracking-wide transition ${adminTab===id?"bg-red-600 text-white":"text-white/35 hover:text-white/60"}`}>{l}</button>
        ))}
      </div>

      {adminTab==="resultados"&&(
        <div>
          <div className="flex gap-1 overflow-x-auto pb-2 mb-3" style={{scrollbarWidth:"none"}}>
            {Object.keys(GRUPOS).map(g=>(
              <button key={g} onClick={()=>setGrupoFiltro(g)}
                className={`w-9 h-9 shrink-0 rounded-lg text-xs font-black transition ${grupoFiltro===g?"bg-red-600 text-white":"text-white/40 border border-white/10 hover:text-white"}`}>{g}</button>
            ))}
          </div>

          {[1,2,3].map(j=>{
            const ps=pg.filter(p=>p.jornada===j);
            if(!ps.length)return null;
            return(
              <div key={j}>
                <div className="flex items-center gap-2 my-2 sm:my-3">
                  <div className="h-px flex-1 bg-white/8"/>
                  <span className="text-white/20 text-[9px] sm:text-[10px] uppercase tracking-[0.25em]">Jornada {j}</span>
                  <div className="h-px flex-1 bg-white/8"/>
                </div>
                {ps.map(p=>{
                  const t=temp[p.id]||{};
                  const gl=t.goles_local??(p.jugado?p.goles_local:"");
                  const gv=t.goles_visitante??(p.jugado?p.goles_visitante:"");
                  const isBloqueado=p.bloqueado||false;
                  const toggleBloqueo=async()=>{
                    try{
                      await db.bloquearPartido(p.id,!isBloqueado);
                      setPartidos(ps=>ps.map(x=>x.id===p.id?{...x,bloqueado:!isBloqueado}:x));
                      showToast(isBloqueado?"Desbloqueado":"Bloqueado 🔒");
                    }catch{showToast("Error","error");}
                  };
                  return(
                    <div key={p.id} className={`rounded-lg sm:rounded-2xl mb-2 border overflow-hidden text-xs sm:text-sm ${p.jugado?"border-emerald-500/25":isBloqueado?"border-orange-500/30":"border-white/8"}`}
                      style={{background:p.jugado?"rgba(0,70,35,0.12)":isBloqueado?"rgba(80,40,0,0.15)":"rgba(255,255,255,0.025)"}}>
                      <div className="flex items-center justify-between px-3 sm:px-4 pt-2 sm:pt-3 pb-1">
                        <span className="text-white/20 text-[9px] sm:text-[10px]">{p.fecha}</span>
                        <div className="flex items-center gap-1 sm:gap-2">
                          {p.jugado&&<span className="text-[9px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-600/25 text-emerald-400 border border-emerald-500/25">✓</span>}
                          <button onClick={toggleBloqueo}
                            className={`text-[9px] px-1.5 sm:px-2.5 py-0.5 rounded-full font-bold border transition ${isBloqueado?"bg-orange-500/25 text-orange-300 border-orange-500/40 hover:bg-orange-500/40":"bg-white/5 text-white/35 border-white/15 hover:text-orange-300"}`}>
                            {isBloqueado?"🔒":"🔓"}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 pb-3 sm:pb-4 pt-2">
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-2xl sm:text-3xl">{FLAGS[p.local]||"🏳️"}</span>
                          <span className="text-white/55 text-[9px] sm:text-[11px] text-center">{p.local}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <input type="number" min="0" max="20" value={gl} onChange={e=>setR(p.id,"goles_local",e.target.value)}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg text-center font-black text-lg border border-white/20 focus:outline-none focus:border-red-500 bg-white/10 text-white [appearance:textfield]"/>
                          <span className="text-white/25 font-black">:</span>
                          <input type="number" min="0" max="20" value={gv} onChange={e=>setR(p.id,"goles_visitante",e.target.value)}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg text-center font-black text-lg border border-white/20 focus:outline-none focus:border-red-500 bg-white/10 text-white [appearance:textfield]"/>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-2xl sm:text-3xl">{FLAGS[p.visitante]||"🏳️"}</span>
                          <span className="text-white/55 text-[9px] sm:text-[11px] text-center">{p.visitante}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <button onClick={guardar} disabled={saving} className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-2xl text-sm sm:text-base mt-3 ${saving?"bg-white/10 text-white/30 font-black":btnRed}`}
            style={{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.08em"}}>
            {saving?"GUARDANDO...":"💾 GUARDAR"}
          </button>
        </div>
      )}

      {adminTab==="jugadores"&&(
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2 sm:p-3 border border-emerald-500/25 text-center" style={{background:"rgba(0,70,35,0.15)"}}>
              <div className="text-emerald-400 font-black text-base sm:text-lg">{users.filter(u=>u.activo).length}</div>
              <div className="text-white/30 text-[9px] sm:text-[10px] uppercase tracking-wider">Activos</div>
            </div>
            <div className="rounded-lg p-2 sm:p-3 border border-amber-500/25 text-center" style={{background:"rgba(100,65,0,0.15)"}}>
              <div className="text-amber-400 font-black text-base sm:text-lg">{users.filter(u=>!u.activo).length}</div>
              <div className="text-white/30 text-[9px] sm:text-[10px] uppercase tracking-wider">Pendientes</div>
            </div>
          </div>

          {users.length===0?(
            <div className="text-center py-8 text-white/15"><div className="text-3xl mb-2">👥</div><p className="text-xs">Nadie registrado</p></div>
          ):users.map(u=>{
            const activo=u.activo||false;
            const toggle=async()=>{
              try{
                await db.confirmarJugador(u.email,!activo);
                setUsers(ps=>ps.map(x=>x.email===u.email?{...x,activo:!activo}:x));
                showToast(activo?`${u.nombre} pendiente`:`✅ ${u.nombre} activo`);
              }catch{showToast("Error","error");}
            };
            return(
              <div key={u.email} className={`rounded-lg sm:rounded-2xl border overflow-hidden ${activo?"border-emerald-500/20":"border-amber-500/20"}`}
                style={{background:activo?"rgba(0,50,25,0.15)":"rgba(80,50,0,0.15)"}}>
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${activo?"bg-emerald-700/40 text-emerald-200":"bg-amber-700/30 text-amber-300"}`}>
                    {u.nombre[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs sm:text-sm truncate">{u.nombre}</div>
                    <div className="text-white/25 text-xs truncate">{u.email}</div>
                  </div>
                </div>
                <div className="px-3 sm:px-4 pb-2 sm:pb-3">
                  <button onClick={toggle}
                    className={`w-full py-1.5 sm:py-2 rounded-lg text-xs font-black uppercase tracking-wide transition ${activo?"border border-red-500/30 text-red-400 hover:bg-red-500/10":"bg-emerald-600 hover:bg-emerald-500 text-white"}`}>
                    {activo?"Rechazar":"Activar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adminTab==="resultados_oficiales"&&(
        <div className="space-y-6">
          <h3 className="text-white font-black text-base sm:text-lg">📋 Resultados Oficiales</h3>

          <div>
            <label className="text-white/60 text-xs sm:text-sm font-bold mb-2 block">32 CLASIFICADOS</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-2">
              {TODOS_EQUIPOS.map(eq=>(
                <button key={eq}
                  onClick={()=>{
                    if(adminClasificados.includes(eq))
                      setAdminClasificados(adminClasificados.filter(e=>e!==eq));
                    else if(adminClasificados.length<32)
                      setAdminClasificados([...adminClasificados,eq]);
                  }}
                  className={`px-2 py-1.5 rounded text-xs font-bold transition ${adminClasificados.includes(eq)?"bg-red-600 text-white":"bg-white/10 text-white/40 hover:bg-white/20"}`}>
                  {eq.split(' ')[0]}
                </button>
              ))}
            </div>
            <p className="text-white/30 text-xs mt-2">{adminClasificados.length}/32</p>
          </div>

          <div>
            <label className="text-white/60 text-xs sm:text-sm font-bold mb-2 block">🏆 LÍDERES</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(GRUPOS).map(([grupo,equipos])=>(
                <div key={grupo} className="bg-white/5 border border-white/10 rounded-lg p-2 sm:p-3">
                  <label className="text-white/60 text-xs font-bold mb-1 block">G{grupo}</label>
                  <select value={adminLideres[grupo]||""}
                    onChange={(e)=>setAdminLideres({...adminLideres,[grupo]:e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-xs">
                    <option value="">- -</option>
                    {equipos.map(eq=>(
                      <option key={eq} value={eq}>{eq.split(" ")[0]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <button onClick={async()=>{
            try{
              await db.guardarResultadosOficiales(adminClasificados, adminLideres);
              setResultadosOficiales({clasificados:adminClasificados, lideres:adminLideres});
              showToast("✅ Guardado","success");
            }catch(e){
              showToast("Error","error");
            }
          }}
          className={`w-full py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-black ${btnRed}`}>
            GUARDAR
          </button>
        </div>
      )}
    </div>
  );
}
