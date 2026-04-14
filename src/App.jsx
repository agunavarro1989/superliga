import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Users, CalendarDays, ShieldCheck, Phone, Plus, CheckCircle2, Image as ImageIcon, Settings, LayoutList, Medal, Trash2, Camera, Bell, FileText, AlertTriangle, X, Download, LogOut, Shield, ChevronRight, ChevronDown, Search, Share2, Edit3, Lock, MessageCircle, TrendingUp, ToggleRight, ToggleLeft, MapPin } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyC8oNa-55C0DnxsdFAndPkIZ06gROeCOnQ",
  authDomain: "la-super-liga.firebaseapp.com",
  projectId: "la-super-liga",
  storageBucket: "la-super-liga.firebasestorage.app",
  messagingSenderId: "561955297080",
  appId: "1:561955297080:web:eaff1dda169c74929913cd",
  measurementId: "G-ZEWBD48N70"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const getCollectionPath = (colName) => colName;

// --- UTILS: COMPRESOR DE IMÁGENES AMPLIADO ---
const resizeImage = (file, callback, maxWidth = 300, maxHeight = 400, quality = 0.6) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width; let height = img.height;
      if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } 
      else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
      const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      callback(canvas.toDataURL(format, format === 'image/png' ? undefined : quality)); 
    }; img.src = e.target.result;
  }; reader.readAsDataURL(file);
};


// --- COMPONENTE: SELECTOR CON BUSCADOR ---
function SearchableTeamSelect({ value, options, onChange, placeholder, className }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedName = options.find(o => o.id === value)?.name || '';

  useEffect(() => { if (!isOpen) setSearch(selectedName); }, [isOpen, selectedName]);

  useEffect(() => {
    function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input type="text" value={isOpen ? search : selectedName}
          onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => { setIsOpen(true); setSearch(''); }}
          placeholder={placeholder} className={`${className} pr-8 truncate`}
        />
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
      {isOpen && (
        <div className="absolute z-[60] w-full mt-1 max-h-48 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-2xl">
          {filtered.map(o => (
            <div key={o.id} className="px-3 py-2 text-xs md:text-sm text-white font-bold hover:bg-lime-500 hover:text-slate-900 cursor-pointer border-b border-white/5 last:border-0 truncate"
              onClick={() => { onChange(o.id); setIsOpen(false); }}>
              {o.name}
            </div>
          ))}
          {filtered.length === 0 && <div className="px-3 py-2 text-xs text-slate-400 italic">No se encontraron equipos...</div>}
        </div>
      )}
    </div>
  );
}


export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('inicio');
  const [torneosTab, setTorneosTab] = useState('activos'); 
  
  const [userRole, setUserRole] = useState('user'); 
  const [adminPin, setAdminPin] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [viewingTeam, setViewingTeam] = useState(null);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [confirmDeleteMatchId, setConfirmDeleteMatchId] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [news, setNews] = useState([]);
  const [clubs, setClubs] = useState([]);
  
  const [config, setConfig] = useState({
    pageName: 'La Super Liga', showPageName: true, pageNameSize: 'text-2xl', titleColor: '#a3e635', logoSize: 'h-12 w-12 md:h-14 md:w-14',
    primaryColor: '#a3e635', accentColor: '#fbbf24', bgColor: '#020617', cardColor: 'rgba(15, 23, 42, 0.7)', textColor: '#f8fafc',
    logoUrl: '', bgUrl: 'https://images.unsplash.com/photo-1622204554308-5925bb0902fb?q=80&w=2000&auto=format&fit=crop', 
    exportWithBg: true, exportBgUrl: '', exportBgColor: '', exportShowSponsors: false,
    adminPin: 'padel2026', superAdminPin: 'super2026', 
    showWelcomeMessage: true, welcomeTitle: '¡Bienvenido a la web oficial de La Super Liga!', welcomeSubtitle: 'La mejor liga de General Roca',
    welcomeTitleColor: '#ffffff', welcomeSubtitleColor: '#a3e635', welcomeTitleSize: 'text-4xl md:text-5xl', welcomeSubtitleSize: 'text-lg md:text-xl',
    fontPrimary: 'system-ui, sans-serif', fontSecondary: 'system-ui, sans-serif', resultCardSize: 'md',
    
    feature_background: true, feature_welcome: true, feature_identity: true, feature_colors: true,
    feature_stats: true, feature_medals: true, feature_news: true, feature_cardSize: true, feature_fonts: true, feature_clubs: true
  });

  useEffect(() => {
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (error) { console.error("Error:", error); } };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubPlayers = onSnapshot(collection(db, getCollectionPath('players')), (snapshot) => setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubTeams = onSnapshot(collection(db, getCollectionPath('teams')), (snapshot) => setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubMatches = onSnapshot(collection(db, getCollectionPath('matches')), (snapshot) => setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubTournaments = onSnapshot(collection(db, getCollectionPath('tournaments')), (snapshot) => setTournaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubNews = onSnapshot(collection(db, getCollectionPath('news')), (snapshot) => setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubClubs = onSnapshot(collection(db, getCollectionPath('clubs')), (snapshot) => setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubConfig = onSnapshot(doc(db, getCollectionPath('settings'), 'main'), (docSnap) => { 
       if (docSnap.exists()) {
          const data = docSnap.data();
          setConfig(prev => ({ ...prev, ...data })); 
       }
    });

    return () => { unsubPlayers(); unsubTeams(); unsubMatches(); unsubTournaments(); unsubNews(); unsubClubs(); unsubConfig(); };
  }, [user]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === config.superAdminPin) { 
       setUserRole('superadmin'); setAdminPin(''); setLoginError(''); 
    } else if (adminPin === config.adminPin) { 
       setUserRole('admin'); setAdminPin(''); setLoginError(''); 
    } else { 
       setLoginError("PIN incorrecto."); 
    }
  };
  const handleAdminLogout = () => { setUserRole('user'); setActiveTab('inicio'); }

  const openTeamDetails = (teamId) => { if(!teamId) return; const team = teams.find(t => t.id === teamId); if(team) setViewingTeam(team); }
  const openPlayerDetails = (playerId) => { if(!playerId) return; const player = players.find(p => p.id === playerId); if(player) setViewingPlayer(player); }

  const getTeam = (teamId) => teams.find(t => t.id === teamId) || { name: 'Equipo Desconocido', player1Id: '', player2Id: '', player3Id: '', photoUrl: '', phone: '' };
  const getPlayer = (pId) => players.find(p => p.id === pId);
  const getTeamPhone = (team) => { return team?.phone || null; };

  const handleClearAllResults = async () => {
    const completed = matches.filter(m => m.status === 'completed');
    for (const match of completed) { await deleteDoc(doc(db, getCollectionPath('matches'), match.id)); }
    setConfirmClearAll(false);
  };

  const handleShareCanvas = async (canvas, filename, action) => {
    const dataUrl = canvas.toDataURL('image/png');
    if (action === 'download') {
        const link = document.createElement('a'); link.download = filename; link.href = dataUrl; link.click(); return;
    }
    if (action === 'whatsapp') {
        try {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], filename, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ title: 'Resultados Oficiales', files: [file] });
            } else {
                alert('Tu navegador no soporta compartir imágenes directo a WhatsApp. Se descargará la imagen para que la envíes.');
                const link = document.createElement('a'); link.download = filename; link.href = dataUrl; link.click();
            }
        } catch (error) {
            console.error("Error sharing:", error);
            const link = document.createElement('a'); link.download = filename; link.href = dataUrl; link.click();
        }
    }
  };

  const shareResultAsImage = async (match, team1, team2, action) => {
    const canvas = document.createElement('canvas'); canvas.width = 1080; 
    canvas.height = 1080 + (config.exportShowSponsors ? 120 : 0); // Ajuste altura para sponsors
    const ctx = canvas.getContext('2d');
    
    await drawCanvasBg(ctx, canvas, config, true);
    const headerY = await drawCanvasHeader(ctx, canvas, config);

    const fontSecondary = config.fontSecondary || 'sans-serif';

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = config.textColor || '#94a3b8'; ctx.font = `bold 35px "${fontSecondary}"`; 
    ctx.fillText(match.round || 'Partido Oficial', canvas.width / 2, headerY + 80);

    const yCenter = headerY + 300;
    
    const drawTeamHorizontal = async (team, isWinner, xPos, alignLeft) => {
       ctx.font = isWinner ? `bold 45px "${fontSecondary}"` : `bold 35px "${fontSecondary}"`;
       let text = team.name;
       if (isWinner) text += ' 🏆';
       
       const textWidth = ctx.measureText(text).width;
       const logoSize = 80;
       const gap = 20;
       const totalWidth = team.photoUrl ? (logoSize + gap + textWidth) : textWidth;
       
       let startX = xPos - totalWidth / 2;
       
       if (team.photoUrl) {
           try {
               const img = new Image(); img.crossOrigin = "Anonymous"; img.src = team.photoUrl;
               await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
               
               ctx.save(); ctx.beginPath(); ctx.arc(startX + logoSize/2, yCenter, logoSize/2, 0, Math.PI * 2);
               ctx.closePath(); ctx.clip();
               
               ctx.fillStyle = config.cardColor || '#1e293b'; ctx.fill();
               
               const size = Math.max(img.width, img.height); const scale = logoSize / size;
               const dx = (logoSize - img.width * scale) / 2; const dy = (logoSize - img.height * scale) / 2;
               
               ctx.drawImage(img, startX + dx, yCenter - logoSize/2 + dy, img.width * scale, img.height * scale);
               ctx.restore();
               
               ctx.beginPath(); ctx.arc(startX + logoSize/2, yCenter, logoSize/2, 0, Math.PI * 2);
               ctx.lineWidth = 4; ctx.strokeStyle = isWinner ? (config.accentColor || '#fbbf24') : 'rgba(255,255,255,0.2)'; ctx.stroke();
               
               startX += logoSize + gap;
           } catch(e) {}
       }
       
       ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
       ctx.fillStyle = isWinner ? (config.accentColor || '#fbbf24') : 'rgba(255,255,255,0.75)';
       ctx.fillText(text, startX, yCenter);
    };

    const isW1 = match.winnerId === team1.id;
    const isW2 = match.winnerId === team2.id;
    
    await drawTeamHorizontal(team1, isW1, 270);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = config.primaryColor || '#a3e635'; ctx.font = `italic bold 45px "${fontSecondary}"`; 
    ctx.fillText('VS', 540, yCenter);
    await drawTeamHorizontal(team2, isW2, 810);

    const scoreText = [match.s1, match.s2, match.s3].filter(Boolean).join(' ') || match.score;
    const boxY = headerY + 480;
    
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 20;
    ctx.fillStyle = config.cardColor || 'rgba(15, 23, 42, 0.9)'; 
    ctx.beginPath(); ctx.roundRect(canvas.width/2 - 350, boxY, 700, 180, 25); ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = config.primaryColor || '#a3e635'; ctx.lineWidth = 5; ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = config.primaryColor || '#a3e635'; ctx.font = `bold 25px "${fontSecondary}"`; 
    ctx.fillText('RESULTADO FINAL', canvas.width / 2, boxY + 50);
    
    ctx.fillStyle = '#ffffff'; ctx.font = `bold 85px "${fontSecondary}"`; 
    ctx.fillText(scoreText, canvas.width / 2, boxY + 130);

    await drawExportFooter(ctx, canvas, config, clubs); // Dibujar sponsors
    await handleShareCanvas(canvas, `resultado-${match.round || 'liga'}.png`, action);
  };

  const isAdminOrSuper = userRole === 'admin' || userRole === 'superadmin';
  
  const cardSizeClasses = {
     sm: { pad: 'p-4 pt-6', text: 'text-base md:text-lg', icon: 'w-5 h-5', resultText: 'text-xl' },
     md: { pad: 'p-6 pt-8', text: 'text-lg md:text-xl', icon: 'w-6 h-6', resultText: 'text-2xl' },
     lg: { pad: 'p-8 pt-10', text: 'text-xl md:text-2xl', icon: 'w-8 h-8', resultText: 'text-3xl' }
  }[config.resultCardSize || 'md'];

  return (
    <div className="min-h-screen font-sans selection:bg-black selection:text-white relative overflow-x-hidden theme-text theme-font-primary">
      <style>{`
        .theme-font-primary { font-family: ${config.fontPrimary || 'system-ui, sans-serif'}; }
        h1, h2, h3, h4, h5, h6, .font-black, .theme-font-secondary { font-family: ${config.fontSecondary || config.fontPrimary || 'system-ui, sans-serif'}; }
        .theme-text { color: ${config.textColor || '#f8fafc'}; }
        .theme-title-text { color: ${config.titleColor || config.primaryColor || '#a3e635'}; }
        .theme-bg-base { background-color: ${config.bgColor || '#020617'}; }
        .theme-bg-card { background-color: ${config.cardColor || 'rgba(15, 23, 42, 0.7)'}; }
        .theme-primary-text { color: ${config.primaryColor || '#a3e635'}; }
        .theme-primary-bg { background-color: ${config.primaryColor || '#a3e635'}; color: #000; }
        .theme-primary-border { border-color: ${config.primaryColor || '#a3e635'}; }
        .theme-accent-text { color: ${config.accentColor || '#fbbf24'}; }
        .theme-accent-bg { background-color: ${config.accentColor || '#fbbf24'}; color: #000; }
        .theme-accent-border { border-color: ${config.accentColor || '#fbbf24'}; }
      `}</style>

      <div className="fixed inset-0 z-0">
         <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${config.bgUrl})` }} />
         <div className="absolute inset-0 backdrop-blur-sm theme-bg-base" style={{ opacity: config.bgUrl ? 0.85 : 1 }} />
      </div>

      <div className="relative z-10">
        <nav className="bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center h-18 py-2 overflow-x-auto custom-scrollbar">
              <div className="flex items-center space-x-3 cursor-pointer shrink-0 mr-4" onClick={() => setActiveTab('inicio')}>
                {config.logoUrl ? 
                   <img src={config.logoUrl} alt="Logo" className={`${config.logoSize || 'h-12 w-12 md:h-14 md:w-14'} object-contain drop-shadow-lg`} /> : 
                   <div className={`${config.logoSize || 'h-12 w-12 md:h-14 md:w-14'} rounded-full theme-primary-bg flex items-center justify-center shrink-0`}><Trophy className="w-1/2 h-1/2" /></div>
                }
                {config.showPageName && (
                   <span className={`font-black ${config.pageNameSize || 'text-2xl'} tracking-tight uppercase italic drop-shadow-md hidden sm:inline theme-title-text theme-font-secondary`}>{config.pageName || 'La Super Liga'}</span>
                )}
              </div>
              
              <div className="hidden md:flex space-x-1 items-center">
                <NavButton icon={<Trophy />} label="Inicio" active={activeTab === 'inicio'} onClick={() => setActiveTab('inicio')} config={config} />
                <NavButton icon={<CalendarDays />} label="Grilla VS" active={activeTab === 'grilla'} onClick={() => setActiveTab('grilla')} config={config} />
                <NavButton icon={<LayoutList />} label="Torneos" active={activeTab === 'torneos'} onClick={() => setActiveTab('torneos')} config={config} />
                <NavButton icon={<Users />} label="Jugadores" active={activeTab === 'jugadores'} onClick={() => setActiveTab('jugadores')} config={config} />
                {config.feature_clubs !== false && <NavButton icon={<MapPin />} label="Clubes" active={activeTab === 'clubes'} onClick={() => setActiveTab('clubes')} config={config} />}
                
                {isAdminOrSuper ? (
                  <div className="flex items-center">
                    <NavButton icon={<Settings />} label="Panel" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} config={config} className="theme-primary-text ml-4" />
                    <button onClick={handleAdminLogout} className="flex items-center space-x-2 px-3 py-2 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors ml-2 rounded-lg border border-red-500/30">
                      <LogOut size={16} /> <span>Salir</span>
                    </button>
                  </div>
                ) : (
                  <NavButton icon={<ShieldCheck />} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} config={config} />
                )}
              </div>

              <div className="md:hidden flex items-center space-x-2 shrink-0">
                <button onClick={() => setActiveTab('inicio')} className={`p-2 rounded-lg ${activeTab === 'inicio' ? 'bg-white/10 theme-primary-text' : 'opacity-60'}`}><Trophy size={22} /></button>
                <button onClick={() => setActiveTab('grilla')} className={`p-2 rounded-lg ${activeTab === 'grilla' ? 'bg-white/10 theme-primary-text' : 'opacity-60'}`}><CalendarDays size={22} /></button>
                <button onClick={() => setActiveTab('torneos')} className={`p-2 rounded-lg ${activeTab === 'torneos' ? 'bg-white/10 theme-primary-text' : 'opacity-60'}`}><LayoutList size={22} /></button>
                {config.feature_clubs !== false && <button onClick={() => setActiveTab('clubes')} className={`p-2 rounded-lg ${activeTab === 'clubes' ? 'bg-white/10 theme-primary-text' : 'opacity-60'}`}><MapPin size={22} /></button>}
                <button onClick={() => setActiveTab('admin')} className={`p-2 rounded-lg ${activeTab === 'admin' ? 'bg-white/10 theme-primary-text' : 'opacity-60'}`}>
                  {isAdminOrSuper ? <Settings size={22} /> : <ShieldCheck size={22} />}
                </button>
                {isAdminOrSuper && <button onClick={handleAdminLogout} className="p-2 rounded-lg text-red-400 bg-red-500/10"><LogOut size={22} /></button>}
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 py-8">
          
          {/* VISTA: INICIO */}
          {activeTab === 'inicio' && (
            <div className="animate-in fade-in duration-500">
              
              {/* MENSAJE DE BIENVENIDA */}
              {config.feature_welcome !== false && config.showWelcomeMessage !== false && (
                 <div className="text-center mb-12 animate-in slide-in-from-top-4 duration-700">
                    <h1 className={`font-black tracking-tight drop-shadow-lg mb-2 theme-font-secondary ${config.welcomeTitleSize || 'text-4xl md:text-5xl'}`} style={{ color: config.welcomeTitleColor || '#ffffff' }}>
                       {config.welcomeTitle || '¡Bienvenido a La Super Liga!'}
                    </h1>
                    <p className={`font-bold drop-shadow-md opacity-90 ${config.welcomeSubtitleSize || 'text-lg md:text-xl'}`} style={{ color: config.welcomeSubtitleColor || config.primaryColor || '#a3e635' }}>
                       {config.welcomeSubtitle || 'La mejor liga de General Roca'}
                    </p>
                 </div>
              )}

              {/* SPONSORS / CLUBES PUBLICOS */}
              {config.feature_clubs !== false && clubs.length > 0 && (
                 <div className="mb-12 bg-black/20 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                    <h3 className="text-sm font-black uppercase tracking-widest opacity-60 text-center mb-6">Sedes y Sponsors Oficiales</h3>
                    <div className="flex flex-wrap justify-center gap-6 md:gap-12 items-center">
                       {clubs.map(c => (
                          <div 
                             key={c.id} 
                             className={`flex flex-col items-center group ${c.type !== 'sponsor' ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`} 
                             onClick={() => { if(c.type !== 'sponsor') setActiveTab('clubes'); }}
                          >
                             <div className={`w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full p-2 mb-2 border border-white/10 transition-colors ${c.type !== 'sponsor' ? 'group-hover:theme-primary-border' : ''}`}>
                               {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-contain drop-shadow-lg" /> : <MapPin className="w-full h-full opacity-30 p-4" />}
                             </div>
                             <span className={`text-[10px] md:text-xs font-bold opacity-50 uppercase tracking-wider transition-colors ${c.type !== 'sponsor' ? 'group-hover:theme-primary-text' : ''}`}>{c.name}</span>
                          </div>
                       ))}
                    </div>
                 </div>
              )}

              {/* NOVEDADES PUBLICAS */}
              {config.feature_news !== false && news.length > 0 && (
                <div className="mb-12 space-y-4">
                  <h2 className="text-2xl font-black uppercase tracking-wider flex items-center theme-font-secondary"><Bell className="mr-3 theme-accent-text" /> Novedades Importantes</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {news.sort((a,b)=>b.createdAt - a.createdAt).map(n => (
                      <div key={n.id} className={`p-6 rounded-2xl border backdrop-blur-md shadow-lg ${n.type === 'alert' ? 'bg-red-500/10 border-red-500/30' : 'theme-bg-card border-white/10'}`}>
                        <div className="flex items-start gap-3">
                          {n.type === 'alert' ? <AlertTriangle className="text-red-400 mt-1 flex-shrink-0" /> : <FileText className="theme-primary-text mt-1 flex-shrink-0" />}
                          <div><h3 className={`font-bold text-lg mb-2 ${n.type === 'alert' ? 'text-red-300' : ''}`}>{n.title}</h3><p className="opacity-80 text-sm whitespace-pre-wrap leading-relaxed">{n.content}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-3xl font-black uppercase tracking-wider flex items-center theme-font-secondary"><CheckCircle2 className="mr-3 theme-primary-text" /> Últimos Resultados</h2>
                
                {isAdminOrSuper && matches.filter(m => m.status === 'completed').length > 0 && (
                  confirmClearAll ? (
                     <div className="flex items-center gap-2 bg-red-500/20 p-2 rounded-xl border border-red-500/50">
                       <span className="text-xs text-red-400 font-bold">¿Borrar TODOS?</span>
                       <button onClick={handleClearAllResults} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-lg hover:bg-red-600 transition-colors">Sí</button>
                       <button onClick={() => setConfirmClearAll(false)} className="bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-black/80 transition-colors">No</button>
                     </div>
                  ) : (
                     <button onClick={() => setConfirmClearAll(true)} className="flex items-center gap-2 text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 rounded-xl border border-red-500/20 transition-colors shadow-sm shrink-0">
                       <Trash2 size={16} /> Limpiar Tablero
                     </button>
                  )
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.filter(m => m.status === 'completed').length === 0 && <p className="opacity-60 italic">No hay resultados cargados.</p>}
                {matches.filter(m => m.status === 'completed').sort((a,b) => b.createdAt - a.createdAt).map(match => {
                  const t1 = getTeam(match.team1Id); const t2 = getTeam(match.team2Id);
                  return (
                    <div key={match.id} className={`theme-bg-card backdrop-blur-md rounded-2xl ${cardSizeClasses.pad} border border-white/10 shadow-xl relative overflow-hidden group hover:theme-primary-border transition-colors`}>
                      {isAdminOrSuper && (
                        <div className="absolute top-2 left-2 z-20">
                          {confirmDeleteMatchId === match.id ? (
                             <div className="flex items-center gap-1 bg-black/80 p-1 rounded-lg border border-red-500 shadow-xl">
                               <span className="text-[10px] text-red-400 font-bold px-1">¿Borrar?</span>
                               <button onClick={() => { deleteDoc(doc(db, getCollectionPath('matches'), match.id)); setConfirmDeleteMatchId(null); }} className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">Sí</button>
                               <button onClick={() => setConfirmDeleteMatchId(null)} className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-bold">No</button>
                             </div>
                          ) : (
                             <button onClick={() => setConfirmDeleteMatchId(match.id)} className="p-1.5 bg-black/40 hover:bg-red-500/80 text-white/50 hover:text-white rounded-lg transition-colors border border-white/10 shadow">
                               <X size={14} />
                             </button>
                          )}
                        </div>
                      )}
                      
                      <div className="absolute top-0 right-0 theme-primary-bg font-bold px-4 py-1.5 rounded-bl-xl shadow-lg text-xs uppercase text-black text-right">
                         {match.tournamentName && <div className="text-[9px] opacity-80 leading-none mb-0.5">{match.tournamentName}</div>}
                         <div>{match.round}</div>
                      </div>
                      
                      <div className="mt-4 space-y-4">
                        <div className={`flex justify-between items-center ${match.winnerId === t1.id ? 'font-black opacity-100' : 'font-semibold opacity-60'}`}>
                          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-colors flex-1" onClick={() => openTeamDetails(t1.id)}>
                             {t1.photoUrl ? <img src={t1.photoUrl} className={`${cardSizeClasses.icon} rounded-full object-cover border border-white/10 shrink-0`} alt="logo" /> : <Shield className={`${cardSizeClasses.icon} shrink-0`} />}
                             <span className={`${cardSizeClasses.text} truncate`}>{t1.name}</span>
                          </div>
                          {match.winnerId === t1.id && <Medal className={`${cardSizeClasses.icon} theme-primary-text shrink-0 ml-2`} />}
                        </div>
                        
                        <div className={`flex justify-between items-center ${match.winnerId === t2.id ? 'font-black opacity-100' : 'font-semibold opacity-60'}`}>
                           <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-colors flex-1" onClick={() => openTeamDetails(t2.id)}>
                             {t2.photoUrl ? <img src={t2.photoUrl} className={`${cardSizeClasses.icon} rounded-full object-cover border border-white/10 shrink-0`} alt="logo" /> : <Shield className={`${cardSizeClasses.icon} shrink-0`} />}
                             <span className={`${cardSizeClasses.text} truncate`}>{t2.name}</span>
                          </div>
                          {match.winnerId === t2.id && <Medal className={`${cardSizeClasses.icon} theme-primary-text shrink-0 ml-2`} />}
                        </div>
                      </div>

                      <div className="mt-6 pt-5 border-t border-white/10 flex justify-between items-center">
                        <span className={`${cardSizeClasses.resultText} font-black tracking-widest theme-accent-text theme-font-secondary`}>{[match.s1, match.s2, match.s3].filter(Boolean).join(' ') || match.score}</span>
                        <div className="flex gap-2 shrink-0">
                           <button onClick={() => shareResultAsImage(match, t1, t2, 'download')} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"><Download size={16} /></button>
                           <button onClick={() => shareResultAsImage(match, t1, t2, 'whatsapp')} className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl transition-colors"><MessageCircle size={16} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISTA: GRILLA */}
          {activeTab === 'grilla' && (
            <div className="animate-in fade-in duration-500">
              <h2 className="text-3xl font-black mb-2 uppercase tracking-wider flex items-center theme-font-secondary"><CalendarDays className="mr-3 theme-primary-text" /> Próximos Partidos</h2>
              <p className="opacity-60 mb-8 font-medium">Contacta a tus rivales y coordina el partido.</p>
              
              <div className="space-y-10">
                {matches.filter(m => m.status === 'pending').length === 0 && (
                  <div className="theme-bg-card backdrop-blur-md p-8 rounded-2xl text-center border border-white/10"><CalendarDays className="w-16 h-16 opacity-20 mx-auto mb-4" /><p className="text-lg opacity-80">No hay partidos en la grilla.</p></div>
                )}
                
                {(() => {
                  const pendingMatches = matches.filter(m => m.status === 'pending');
                  const sortedGrilla = [...pendingMatches].sort((a, b) => {
                      if (a.tournamentName !== b.tournamentName) return (a.tournamentName || '').localeCompare(b.tournamentName || '');
                      if (a.roundNumber !== b.roundNumber) return (a.roundNumber || 0) - (b.roundNumber || 0);
                      return a.createdAt - b.createdAt;
                  });
                  const groupedGrilla = sortedGrilla.reduce((groups, m) => {
                      const key = m.tournamentName ? `${m.tournamentName} - ${m.round}` : (m.round || 'Partidos Amistosos / Manuales');
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(m);
                      return groups;
                  }, {});

                  return Object.entries(groupedGrilla).map(([groupName, groupMatches]) => (
                    <div key={groupName} className="space-y-4">
                      <h3 className="text-xl md:text-2xl font-black uppercase tracking-widest theme-accent-text border-b border-white/10 pb-2 mb-4 drop-shadow-md theme-font-secondary">
                         {groupName}
                      </h3>
                      
                      {groupMatches.map(match => {
                        const t1 = getTeam(match.team1Id); const t2 = getTeam(match.team2Id);
                        const t1Phone = getTeamPhone(t1); const t2Phone = getTeamPhone(t2);

                        return (
                          <div key={match.id} className="theme-bg-card backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg overflow-hidden relative p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 pt-10 md:pt-8">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 theme-primary-bg font-black px-6 py-1.5 rounded-b-xl text-[10px] tracking-widest z-10 text-black uppercase shadow-md whitespace-nowrap flex flex-col items-center leading-tight">
                               <span>{match.zoneName || 'Partido Oficial'}</span>
                            </div>
                            
                            <div className="flex-1 flex flex-col items-center md:items-start w-full mt-2 md:mt-0">
                              <div className="flex items-center gap-2 mb-3 cursor-pointer hover:theme-primary-text transition-colors" onClick={() => openTeamDetails(t1.id)}>
                                {t1.photoUrl ? <img src={t1.photoUrl} className="w-10 h-10 rounded-full object-cover border border-white/20" alt="logo" /> : <Shield size={24} className="opacity-50" />}
                                <h3 className="text-xl font-black theme-font-secondary">{t1.name}</h3>
                              </div>
                              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                                 <PlayerMiniCard player={getPlayer(t1.player1Id)} />
                                 <PlayerMiniCard player={getPlayer(t1.player2Id)} />
                                 {t1.player3Id && <PlayerMiniCard player={getPlayer(t1.player3Id)} isSup={true} />}
                              </div>
                              {t1Phone && <a href={`https://wa.me/${t1Phone.replace(new RegExp('[^0-9]', 'g'), '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-2 text-xs font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 rounded-full transition-colors shadow-lg"><Phone size={12} /> <span>{t1Phone}</span></a>}
                            </div>

                            <div className="text-2xl font-black italic opacity-20 px-4 my-2 md:my-0 theme-font-secondary">VS</div>

                            <div className="flex-1 flex flex-col items-center md:items-end w-full">
                              <div className="flex items-center gap-2 mb-3 cursor-pointer hover:theme-primary-text transition-colors" onClick={() => openTeamDetails(t2.id)}>
                                <h3 className="text-xl font-black theme-font-secondary">{t2.name}</h3>
                                {t2.photoUrl ? <img src={t2.photoUrl} className="w-10 h-10 rounded-full object-cover border border-white/20" alt="logo" /> : <Shield size={24} className="opacity-50" />}
                              </div>
                              <div className="flex flex-wrap justify-center md:justify-end gap-2 mb-3">
                                 <PlayerMiniCard player={getPlayer(t2.player1Id)} />
                                 <PlayerMiniCard player={getPlayer(t2.player2Id)} />
                                 {t2.player3Id && <PlayerMiniCard player={getPlayer(t2.player3Id)} isSup={true} />}
                              </div>
                              {t2Phone && <a href={`https://wa.me/${t2Phone.replace(new RegExp('[^0-9]', 'g'), '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-2 text-xs font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 rounded-full transition-colors shadow-lg"><Phone size={12} /> <span>{t2Phone}</span></a>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* VISTA: TORNEOS PUBLICOS */}
          {activeTab === 'torneos' && (
            <div className="animate-in fade-in duration-500">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                  <h2 className="text-3xl font-black uppercase tracking-wider flex items-center theme-font-secondary"><LayoutList className="mr-3 theme-primary-text" /> Torneos y Tablas</h2>
                  <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 w-full md:w-auto">
                     <button onClick={() => setTorneosTab('activos')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${torneosTab === 'activos' ? 'theme-primary-bg text-black shadow-lg' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}>Activos</button>
                     <button onClick={() => setTorneosTab('historial')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${torneosTab === 'historial' ? 'theme-primary-bg text-black shadow-lg' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}>Historial Archivados</button>
                  </div>
               </div>

               {tournaments.length === 0 && <p className="opacity-60">Aún no hay torneos registrados en el sistema.</p>}
               
               <div className="space-y-12">
                 {tournaments.filter(t => torneosTab === 'activos' ? !t.isArchived : t.isArchived).length === 0 && tournaments.length > 0 && (
                   <div className="text-center p-12 bg-black/20 rounded-3xl border border-white/5">
                      <p className="opacity-60 text-lg">No hay torneos {torneosTab === 'activos' ? 'activos' : 'archivados'} en este momento.</p>
                   </div>
                 )}
                 {tournaments.filter(t => torneosTab === 'activos' ? !t.isArchived : t.isArchived).map(tournament => (
                     <PublicTournamentCard key={tournament.id} tournament={tournament} config={config} allTeams={teams} clubs={clubs} onTeamClick={openTeamDetails} handleShareCanvas={handleShareCanvas} /> 
                 ))}
               </div>
            </div>
          )}

          {/* VISTA: CLUBES */}
          {activeTab === 'clubes' && config.feature_clubs !== false && (
            <div className="animate-in fade-in duration-500">
               <h2 className="text-3xl font-black mb-8 uppercase tracking-wider flex items-center theme-font-secondary"><MapPin className="mr-3 theme-primary-text" /> Sedes y Clubes</h2>
               <p className="opacity-60 mb-8 font-medium">Conoce las sedes oficiales de la liga y reserva tus canchas.</p>
               
               {clubs.filter(c => c.type !== 'sponsor').length === 0 && <p className="opacity-60">Aún no hay sedes registradas.</p>}
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {clubs.filter(c => c.type !== 'sponsor').map(c => (
                    <div key={c.id} className="theme-bg-card backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl flex flex-col relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><MapPin size={100} /></div>
                       
                       <div className="flex items-center gap-4 mb-4 relative z-10">
                          <div className="w-16 h-16 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-2 shrink-0">
                             {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-contain drop-shadow-md" /> : <MapPin className="opacity-30" />}
                          </div>
                          <div>
                             <h3 className="text-xl font-black leading-tight theme-font-secondary">{c.name}</h3>
                             {c.address && <p className="text-xs opacity-60 mt-1 flex items-start"><MapPin size={12} className="mr-1 mt-0.5 shrink-0" /> {c.address}</p>}
                          </div>
                       </div>
                       
                       <div className="mt-auto pt-4 relative z-10">
                          {c.phone ? (
                             <a href={`https://wa.me/${c.phone.replace(new RegExp('[^0-9]', 'g'), '')}`} target="_blank" rel="noreferrer" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black px-4 py-3 rounded-xl flex items-center justify-center transition-colors shadow-lg">
                                <MessageCircle size={18} className="mr-2" /> Reservar Cancha
                             </a>
                          ) : (
                             <div className="w-full bg-white/5 opacity-50 text-center font-bold px-4 py-3 rounded-xl text-sm border border-white/10">No hay contacto</div>
                          )}
                       </div>
                    </div>
                 ))}
               </div>
            </div>
          )}

          {/* VISTA: JUGADORES */}
          {activeTab === 'jugadores' && (
            <div className="animate-in fade-in duration-500">
               <h2 className="text-3xl font-black mb-6 uppercase tracking-wider flex items-center theme-font-secondary"><Users className="mr-3 theme-primary-text" /> Jugadores Registrados</h2>
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                  {players.length === 0 && <p className="col-span-full opacity-60">No hay jugadores registrados.</p>}
                  {players.map(p => (
                    <div key={p.id} className="theme-bg-card backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-center text-center shadow-lg group hover:-translate-y-1 hover:theme-primary-border transition-all cursor-pointer" onClick={() => openPlayerDetails(p.id)}>
                      <div className="w-24 h-32 md:w-28 md:h-36 rounded-xl bg-black/20 mb-3 flex items-center justify-center overflow-hidden border-2 border-white/10 group-hover:theme-primary-border transition-colors">
                        {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" /> : <Users className="opacity-20 w-10 h-10" />}
                      </div>
                      <h3 className="font-bold leading-tight group-hover:theme-primary-text transition-colors line-clamp-1">{p.name}</h3>
                      
                      {p.nickname && <span className="text-[10px] theme-primary-text font-black leading-none mt-1 line-clamp-1">"{p.nickname}"</span>}
                      {p.position && <span className="text-[9px] opacity-60 uppercase font-bold mt-1 bg-black/40 px-2 py-0.5 rounded border border-white/5">{p.position}</span>}
                      
                      <span className="text-xs font-black theme-primary-bg px-3 py-1 rounded-full mt-3 shadow-md text-black">{p.category}</span>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* VISTA: ADMIN */}
          {activeTab === 'admin' && (
            <div className="animate-in fade-in duration-500 relative z-20">
              {!isAdminOrSuper ? (
                <div className="max-w-md mx-auto theme-bg-card backdrop-blur-xl p-10 rounded-3xl border border-white/10 shadow-2xl mt-10">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 theme-primary-bg rounded-full flex items-center justify-center mx-auto mb-4 bg-opacity-20 border border-current text-black"><ShieldCheck className="w-10 h-10 opacity-80" /></div>
                    <h2 className="text-2xl font-black uppercase tracking-wider theme-font-secondary">Acceso Restringido</h2>
                  </div>
                  <form onSubmit={handleAdminLogin}>
                    <input type="password" placeholder="PIN de Acceso" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:theme-primary-border mb-2 text-center tracking-[0.5em] text-xl font-black shadow-inner theme-font-secondary" />
                    {loginError && <p className="text-red-400 text-xs font-bold text-center mb-4">{loginError}</p>}
                    <button type="submit" className="w-full theme-primary-bg font-black py-4 rounded-xl transition-all shadow-lg uppercase tracking-widest mt-2 hover:opacity-80 text-black">Ingresar al Panel</button>
                  </form>
                </div>
              ) : (
                <AdminDashboard userRole={userRole} players={players} teams={teams} matches={matches} tournaments={tournaments} news={news} clubs={clubs} config={config} db={db} getCollectionPath={getCollectionPath} allTeams={teams} handleShareCanvas={handleShareCanvas} onTeamClick={openTeamDetails} />
              )}
            </div>
          )}

        </main>
      </div>

      {/* MODAL DETALLE DE EQUIPO */}
      {viewingTeam && (
        <TeamDetailModal team={viewingTeam} players={players} matches={matches} tournaments={tournaments} onClose={() => setViewingTeam(null)} onPlayerClick={openPlayerDetails} config={config} />
      )}

      {/* MODAL DETALLE DE JUGADOR */}
      {viewingPlayer && (
        <PlayerDetailModal player={viewingPlayer} matches={matches} teams={teams} onClose={() => setViewingPlayer(null)} config={config} />
      )}
    </div>
  );
}

// --- SUBCOMPONENTE: JUGADOR MINI EN GRILLA (RELACIÓN 1:1) ---
function PlayerMiniCard({ player, isSup }) {
   if(!player) return null;
   return (
      <div className="flex items-center gap-2 bg-black/40 rounded-full pr-3 border border-white/10">
         {player.photoUrl ? (
            <img src={player.photoUrl} className="w-8 h-8 rounded-full object-cover border border-white/10" alt="p" />
         ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Users size={12} /></div>
         )}
         <span className="text-xs font-bold opacity-80">{player.name.split(' ')[0]} {isSup && <span className="text-[9px] opacity-50">(Sup)</span>}</span>
      </div>
   )
}

// --- SUBCOMPONENTE: BADGE CAMPEÓN ---
function ChampionBadge({ champion, onClick }) {
   if (!champion) return null;
   return (
      <div 
         className="mt-3 inline-flex items-center gap-3 bg-gradient-to-r from-amber-500/20 to-amber-700/20 border border-amber-500/50 px-4 py-2 rounded-full cursor-pointer hover:scale-105 transition-transform shadow-lg w-max max-w-full"
         onClick={(e) => { e.stopPropagation(); onClick && onClick(champion.id); }}
      >
         <Trophy size={18} className="text-amber-400 drop-shadow-md shrink-0" />
         <div className="flex flex-col items-start leading-none text-left min-w-0">
            <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-0.5">Campeón</span>
            <span className="text-white font-black text-sm drop-shadow-md truncate max-w-[150px] md:max-w-[200px]">{champion.name}</span>
         </div>
         {champion.photoUrl ? <img src={champion.photoUrl} className="w-7 h-7 rounded-full object-cover ml-1 border border-amber-500/50 shrink-0" alt="logo" /> : <Shield size={16} className="text-amber-400 ml-1 shrink-0" />}
      </div>
   )
}

const drawExportFooter = async (ctx, canvas, config, clubs) => {
    if (!config.exportShowSponsors || !clubs) return;
    const sponsors = clubs.filter(c => c.type === 'sponsor' && c.photoUrl);
    if (sponsors.length === 0) return;

    const iconSize = 60;
    const gap = 20;
    const totalWidth = sponsors.length * iconSize + (sponsors.length - 1) * gap;
    let startX = (canvas.width - totalWidth) / 2;
    const y = canvas.height - iconSize - 20; 

    ctx.textAlign = 'center';
    ctx.fillStyle = config.textColor || '#ffffff';
    ctx.font = `bold 14px "${config.fontPrimary || 'sans-serif'}"`;
    ctx.fillText("SPONSORS OFICIALES", canvas.width / 2, y - 15);

    for (const sponsor of sponsors) {
        try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = sponsor.photoUrl;
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });

            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.beginPath();
            ctx.roundRect(startX, y, iconSize, iconSize, 8);
            ctx.fill();

            const scale = Math.min(iconSize / img.width, iconSize / img.height) * 0.8;
            const dw = img.width * scale;
            const dh = img.height * scale;
            const dx = startX + (iconSize - dw) / 2;
            const dy = y + (iconSize - dh) / 2;

            ctx.drawImage(img, dx, dy, dw, dh);
        } catch(e) {}
        startX += iconSize + gap;
    }
};

const drawCanvasHeader = async (ctx, canvas, config) => {
   let startYText = 100;
   const fontSecondary = config.fontSecondary || 'sans-serif';
   if (config.exportWithBg !== false && config.logoUrl) {
       try {
           const logo = new Image();
           logo.crossOrigin = "Anonymous";
           logo.src = config.logoUrl;
           await new Promise((resolve, reject) => { logo.onload = resolve; logo.onerror = reject; });
           ctx.drawImage(logo, canvas.width / 2 - 60, 40, 120, 120);
           startYText = 210;
       } catch(e) {}
   }
   ctx.textAlign = 'center'; 
   ctx.fillStyle = config.titleColor || config.primaryColor || '#ffffff'; 
   ctx.font = `bold 50px "${fontSecondary}"`; 
   ctx.fillText(config.pageName ? config.pageName.toUpperCase() : 'LA SUPER LIGA', canvas.width / 2, startYText);
   return startYText;
};

const drawCanvasBg = async (ctx, canvas, config, isExport = true) => {
   const useExportBgUrl = isExport && config.exportBgUrl !== undefined && config.exportBgUrl !== '';
   const useExportBgColor = isExport && config.exportBgColor !== undefined && config.exportBgColor !== '';
   
   const finalBgUrl = useExportBgUrl ? config.exportBgUrl : (config.exportWithBg !== false ? config.bgUrl : null);
   const finalBgColor = useExportBgColor ? config.exportBgColor : config.bgColor;

   if (finalBgUrl) {
      try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = finalBgUrl;
          await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
          
          const canvasRatio = canvas.width / canvas.height;
          const imgRatio = img.width / img.height;
          let drawWidth, drawHeight, offsetX, offsetY;

          if (imgRatio > canvasRatio) {
              drawHeight = canvas.height;
              drawWidth = img.width * (canvas.height / img.height);
              offsetX = (canvas.width - drawWidth) / 2;
              offsetY = 0;
          } else {
              drawWidth = canvas.width;
              drawHeight = img.height * (canvas.width / img.width);
              offsetX = 0;
              offsetY = (canvas.height - drawHeight) / 2;
          }

          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          
          // Si sube un fondo export específico, aplicamos menos opacidad para que resalte más.
          const opacity = useExportBgUrl ? '99' : 'E6'; 
          ctx.fillStyle = finalBgColor ? finalBgColor + opacity : 'rgba(2, 6, 23, 0.9)'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      } catch(e) {
          ctx.fillStyle = finalBgColor || '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
  } else {
      ctx.fillStyle = finalBgColor || '#0f172a'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

const exportZonesAsImage = async (tournament, allTeams, config, clubs) => {
  if (!tournament.zones || tournament.zones.length === 0) return null;

  const canvas = document.createElement('canvas');
  const rowHeight = 40;
  const zoneHeaderHeight = 60;
  let totalRows = 0;
  tournament.zones.forEach(z => totalRows += z.teams.length);
  
  const sponsorHeight = (config.exportShowSponsors && clubs && clubs.some(c=>c.type==='sponsor')) ? 120 : 0;
  
  canvas.width = 1100;
  canvas.height = 350 + (tournament.zones.length * zoneHeaderHeight) + (totalRows * rowHeight) + (tournament.zones.length * 40) + sponsorHeight;
  const ctx = canvas.getContext('2d');

  await drawCanvasBg(ctx, canvas, config, true);
  ctx.fillStyle = config.primaryColor || '#a3e635'; ctx.fillRect(0, 0, canvas.width, 15); ctx.fillRect(0, canvas.height - 15, canvas.width, 15);

  const headerY = await drawCanvasHeader(ctx, canvas, config);
  const fontSecondary = config.fontSecondary || 'sans-serif';
  const fontPrimary = config.fontPrimary || 'sans-serif';

  ctx.fillStyle = config.primaryColor || '#a3e635'; ctx.font = `bold 30px "${fontSecondary}"`; 
  ctx.fillText(tournament.name.toUpperCase() + ' - POSICIONES', canvas.width / 2, headerY + 60);

  let currentY = headerY + 120;

  tournament.zones.forEach(zone => {
    const sortedTeams = [...zone.teams].sort((a,b) => {
       if (b.pts !== a.pts) return b.pts - a.pts;
       const diffB = (b.sf || 0) - (b.sc || 0); const diffA = (a.sf || 0) - (a.sc || 0);
       if (diffB !== diffA) return diffB - diffA;
       return (b.sf || 0) - (a.sf || 0);
    });

    ctx.fillStyle = config.cardColor || 'rgba(30, 41, 59, 0.8)'; ctx.beginPath(); ctx.roundRect(40, currentY, canvas.width - 80, 40, 8); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = config.textColor || '#ffffff'; ctx.font = `bold 20px "${fontSecondary}"`;
    ctx.fillText(zone.name, 60, currentY + 28);
    currentY += 60;

    ctx.fillStyle = config.textColor || '#94a3b8'; ctx.font = `bold 14px "${fontPrimary}"`;
    ctx.fillText('EQUIPO', 60, currentY);
    ctx.textAlign = 'center';
    ctx.fillStyle = config.primaryColor || '#a3e635'; ctx.fillText('PTS', 650, currentY);
    ctx.fillStyle = config.textColor || '#94a3b8';
    ctx.fillText('PJ', 750, currentY); ctx.fillText('PG', 830, currentY); ctx.fillText('SF', 910, currentY); ctx.fillText('SC', 990, currentY);
    currentY += 25;

    sortedTeams.forEach((t, i) => {
       const tName = allTeams.find(tm => tm.id === t.teamId)?.name || t.name || 'Desconocido';
       ctx.textAlign = 'left'; ctx.fillStyle = config.textColor || '#ffffff'; ctx.font = `bold 18px "${fontPrimary}"`;
       ctx.fillText(`${i+1}. ${tName}`, 60, currentY + 25);
       
       ctx.textAlign = 'center';
       ctx.fillStyle = config.primaryColor || '#a3e635'; ctx.fillText(t.pts, 650, currentY + 25);
       ctx.fillStyle = config.textColor || '#e2e8f0';
       ctx.fillText(t.pj, 750, currentY + 25); ctx.fillText(t.pg, 830, currentY + 25); ctx.fillText(t.sf || 0, 910, currentY + 25); ctx.fillText(t.sc || 0, 990, currentY + 25);
       
       ctx.strokeStyle = config.cardColor || 'rgba(30, 41, 59, 0.5)'; ctx.lineWidth = 1;
       ctx.beginPath(); ctx.moveTo(50, currentY + 40); ctx.lineTo(canvas.width - 50, currentY + 40); ctx.stroke();
       currentY += rowHeight + 5;
    });
    currentY += 40; 
  });
  
  await drawExportFooter(ctx, canvas, config, clubs);
  return canvas;
}

const exportBracketAsImage = async (tournament, allTeams, config, clubs) => {
  const validBrackets = tournament.brackets || [];
  if (validBrackets.length === 0) return null;

  const finalRound = validBrackets.find(b => b.matches.length === 1);
  const regularRounds = validBrackets.filter(b => b.matches.length > 1);

  const boxW = 280; const boxH = 90; const colW = 340; 
  const maxDepth = regularRounds.length;
  const requiredWidth = 50 * 2 + (maxDepth * 2) * colW + boxW + 200; 
  const maxMatches = regularRounds[0]?.matches.length || 1;
  
  const sponsorHeight = (config.exportShowSponsors && clubs && clubs.some(c=>c.type==='sponsor')) ? 120 : 0;
  
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1600, requiredWidth); 
  canvas.height = Math.max(1080, 400 + (maxMatches / 2) * 140 + 100) + sponsorHeight; 
  const ctx = canvas.getContext('2d');
  
  const fontSecondary = config.fontSecondary || 'sans-serif';
  const fontPrimary = config.fontPrimary || 'sans-serif';

  await drawCanvasBg(ctx, canvas, config, true);
  ctx.fillStyle = config.primaryColor || '#a3e635'; ctx.fillRect(0, 0, canvas.width, 20); ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

  const headerY = await drawCanvasHeader(ctx, canvas, config);

  ctx.textAlign = 'center'; 
  ctx.fillStyle = config.primaryColor || '#a3e635'; ctx.font = `bold 40px "${fontSecondary}"`; 
  ctx.fillText(tournament.name.toUpperCase() + ' - FASE ELIMINATORIA', canvas.width / 2, headerY + 60);

  const getTName = (id) => { if (!id) return 'Por definir'; const t = allTeams.find(tm => tm.id === id); return t ? t.name : 'Por definir'; };

  const drawMatchBox = (m, x, y, roundName, isLeft, isFinal=false) => {
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 5;
    ctx.fillStyle = config.cardColor || 'rgba(30, 41, 59, 0.9)'; ctx.beginPath(); ctx.roundRect(x, y, boxW, boxH, 10); ctx.fill(); ctx.shadowBlur = 0; 
    ctx.strokeStyle = isFinal ? (config.accentColor || '#fbbf24') : 'rgba(255,255,255,0.1)'; ctx.lineWidth = isFinal ? 3 : 2; ctx.stroke();
    
    ctx.textAlign = 'center'; ctx.fillStyle = isFinal ? (config.accentColor || '#fbbf24') : (config.primaryColor || '#a3e635'); ctx.font = `bold 12px "${fontPrimary}"`; 
    ctx.fillText(roundName.toUpperCase(), x + boxW/2, y - 10);

    const t1Name = getTName(m.team1Id); const t2Name = getTName(m.team2Id); const wId = m.winnerId;
    const txtColor = config.textColor || '#ffffff';

    ctx.font = (wId === m.team1Id) ? `bold 18px "${fontPrimary}"` : `18px "${fontPrimary}"`; ctx.fillStyle = (wId === m.team1Id) ? txtColor : 'rgba(255,255,255,0.5)'; ctx.textAlign = 'left'; ctx.fillText(t1Name, x + 15, y + 35);
    ctx.font = (wId === m.team2Id) ? `bold 18px "${fontPrimary}"` : `18px "${fontPrimary}"`; ctx.fillStyle = (wId === m.team2Id) ? txtColor : 'rgba(255,255,255,0.5)'; ctx.fillText(t2Name, x + 15, y + 70);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, y + 50); ctx.lineTo(x + boxW - 10, y + 50); ctx.stroke();

    const scoreText = [m.s1, m.s2, m.s3].filter(Boolean).join(' ') || m.score || '';
    if (scoreText) { ctx.textAlign = 'right'; ctx.fillStyle = isFinal ? (config.accentColor || '#fbbf24') : (config.primaryColor || '#a3e635'); ctx.font = `bold 16px "${fontSecondary}"`; ctx.fillText(scoreText, x + boxW - 15, y + 52); }
  };

  const startYBase = headerY + 160;
  
  const calcY = (rIdx, mIdx) => {
     const spacing = 140 * Math.pow(2, rIdx);
     const startY = startYBase + (spacing - 140) / 2;
     return startY + mIdx * spacing;
  }
  
  regularRounds.forEach((r, rIdx) => {
    const matchesLeft = r.matches.slice(0, Math.ceil(r.matches.length / 2));
    const xPos = 50 + (rIdx * colW); 
    matchesLeft.forEach((m, mIdx) => { drawMatchBox(m, xPos, calcY(rIdx, mIdx), r.round, true); });
  });

  regularRounds.forEach((r, rIdx) => {
    const matchesRight = r.matches.slice(Math.ceil(r.matches.length / 2));
    const xPos = canvas.width - 50 - boxW - (rIdx * colW); 
    matchesRight.forEach((m, mIdx) => { drawMatchBox(m, xPos, calcY(rIdx, mIdx), r.round, false); });
  });

  if (finalRound && finalRound.matches[0]) {
     const finalY = calcY(regularRounds.length > 0 ? regularRounds.length - 1 : 0, 0);
     drawMatchBox(finalRound.matches[0], (canvas.width / 2) - (boxW/2), finalY, finalRound.round, false, true);
     ctx.textAlign = 'center'; ctx.fillStyle = config.accentColor || '#fbbf24'; ctx.font = `bold 40px "${fontSecondary}"`; ctx.fillText('🏆 GANADOR', canvas.width / 2, finalY - 40);
  }
  
  await drawExportFooter(ctx, canvas, config, clubs);
  return canvas;
};

function PublicTournamentCard({ tournament, config, allTeams, clubs, onTeamClick, handleShareCanvas }) {
  const [showRules, setShowRules] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!tournament.isArchived);
  
  const getZoneTeamInfo = (t) => { if(t.teamId) { const found = allTeams.find(tm => tm.id === t.teamId); return found ? { id: found.id, name: found.name, photoUrl: found.photoUrl } : { id: null, name: t.name, photoUrl: null }; } return { id: null, name: t.name, photoUrl: null }; }

  const champion = tournament.championId ? allTeams.find(t => t.id === tournament.championId) : null;

  return (
    <div className="theme-bg-card backdrop-blur-md border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl relative overflow-hidden">
      
      <div 
        className={`text-center relative z-10 flex flex-col items-center cursor-pointer group ${isExpanded ? 'mb-8 pb-6 border-b border-white/10' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {(tournament.rulesText || tournament.rulesPdfUrl) && isExpanded && (
          <button onClick={(e) => { e.stopPropagation(); setShowRules(!showRules); }} className="absolute left-0 top-0 mt-2 ml-2 bg-black/40 hover:bg-black/60 theme-primary-text theme-primary-border border px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center transition-colors">
            <FileText size={14} className="mr-2" /> Reglas
          </button>
        )}
        <h3 className="text-3xl md:text-4xl font-black theme-primary-text mt-12 md:mt-0 theme-font-secondary group-hover:opacity-80 transition-opacity">
           {tournament.name}
        </h3>
        
        <ChampionBadge champion={champion} onClick={onTeamClick} />

        <div className="flex items-center justify-center gap-3 mt-4">
           <span className="px-4 py-1 rounded-full bg-white/10 text-xs md:text-sm font-bold tracking-widest opacity-80 uppercase">
              {tournament.status || 'En Juego'} {tournament.isArchived && '- Archivado'}
           </span>
           <div className="bg-black/40 p-1.5 rounded-full theme-primary-text border border-white/10 shadow-lg transition-transform">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
           </div>
        </div>
      </div>

      {isExpanded && (
         <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            {showRules && (
              <div className="bg-black/40 p-5 rounded-xl border border-white/10 mb-8 text-sm animate-in fade-in slide-in-from-top-2 mx-2">
                {tournament.rulesText && <p className="whitespace-pre-wrap mb-4 opacity-90">{tournament.rulesText}</p>}
                {tournament.rulesPdfUrl && (
                  <a href={tournament.rulesPdfUrl} download={`Reglamento_${tournament.name}.pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center theme-primary-bg font-bold px-4 py-2 rounded-lg hover:opacity-80 transition-opacity text-black">
                     <Download size={16} className="mr-2" /> Descargar Reglamento (PDF)
                  </a>
                )}
              </div>
            )}

            {(tournament.zones && tournament.zones.length > 0) && (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 px-2 gap-4">
                 <h4 className="text-xl md:text-2xl font-black uppercase tracking-widest flex items-center theme-font-secondary"><LayoutList className="mr-3 theme-primary-text" /> Zonas</h4>
                 <div className="flex gap-2 w-full md:w-auto">
                   <button onClick={async () => { const canvas = await exportZonesAsImage(tournament, allTeams, config, clubs); if(canvas) await handleShareCanvas(canvas, `Zonas-${tournament.name}.png`, 'download'); }} className="flex-1 md:flex-none bg-white/10 hover:bg-white/20 font-bold px-3 py-2 rounded-lg flex items-center justify-center transition-colors text-xs md:text-sm shadow-lg">
                     <Download size={14} className="mr-2" /> <span className="hidden sm:inline">Descargar</span>
                   </button>
                   <button onClick={async () => { const canvas = await exportZonesAsImage(tournament, allTeams, config, clubs); if(canvas) await handleShareCanvas(canvas, `Zonas-${tournament.name}.png`, 'whatsapp'); }} className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black px-3 py-2 rounded-lg flex items-center justify-center transition-colors text-xs md:text-sm shadow-lg">
                     <MessageCircle size={14} className="mr-2" /> WhatsApp
                   </button>
                 </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-10 relative z-10">
              {(tournament.zones || []).map((zone, zIdx) => {
                const sortedTeams = [...zone.teams].sort((a,b) => {
                  if (b.pts !== a.pts) return b.pts - a.pts;
                  const diffB = (b.sf || 0) - (b.sc || 0); const diffA = (a.sf || 0) - (a.sc || 0);
                  if (diffB !== diffA) return diffB - diffA;
                  return (b.sf || 0) - (a.sf || 0);
                });

                return (
                <div key={zIdx} className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="bg-white/5 px-4 md:px-6 py-4 flex justify-between items-center">
                    <h4 className="text-lg md:text-xl font-bold">{zone.name}</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-center">
                      <thead className="bg-black/40 opacity-80 text-[9px] md:text-xs font-black uppercase tracking-wider">
                        <tr><th className="p-2 md:p-3 text-left pl-4 md:pl-6">Equipo</th><th className="p-2 md:p-3 theme-primary-text">PTS</th><th className="p-2 md:p-3">PJ</th><th className="p-2 md:p-3">PG</th><th className="p-2 md:p-3">SF</th><th className="p-2 md:p-3">SC</th></tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sortedTeams.map((t, i) => {
                          const tInfo = getZoneTeamInfo(t);
                          return (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="p-2 md:p-3 pl-4 md:pl-6 text-left font-bold flex items-center">
                              <span className="w-4 md:w-5 opacity-60 text-[10px] md:text-xs mr-1 md:mr-2">{i+1}.</span>
                              <div className="flex items-center cursor-pointer hover:theme-primary-text transition-colors" onClick={()=>onTeamClick(tInfo.id)}>
                                 {tInfo.photoUrl ? <img src={tInfo.photoUrl} className="w-4 h-4 md:w-5 md:h-5 rounded-full object-cover mr-2" alt="L" /> : <Shield size={12} className="opacity-60 mr-2" />}
                                 <span className="truncate max-w-[80px] md:max-w-[150px] text-xs md:text-sm">{tInfo.name}</span>
                              </div>
                            </td>
                            <td className="p-2 md:p-3 font-black theme-primary-text bg-white/5 text-xs md:text-sm">{t.pts}</td>
                            <td className="p-2 md:p-3 opacity-80 text-xs md:text-sm">{t.pj}</td>
                            <td className="p-2 md:p-3 opacity-80 text-xs md:text-sm">{t.pg}</td>
                            <td className="p-2 md:p-3 opacity-80 text-xs md:text-sm">{t.sf || 0}</td>
                            <td className="p-2 md:p-3 opacity-80 text-xs md:text-sm">{t.sc || 0}</td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                </div>
              )})}
            </div>

            <SymmetricBracket tournament={tournament} allTeams={allTeams} config={config} clubs={clubs} onTeamClick={onTeamClick} handleShareCanvas={handleShareCanvas} />
         </div>
      )}
    </div>
  );
}

function SymmetricBracket({ tournament, config, allTeams, clubs, onTeamClick, isAdmin = false, onEditMatch = null, handleShareCanvas }) {
  const validBrackets = tournament.brackets || [];
  if (validBrackets.length === 0) return null;

  const finalRound = validBrackets.find(b => b.matches.length === 1);
  const regularRounds = validBrackets.filter(b => b.matches.length > 1);

  const getBracketTeamInfo = (teamId, fallbackName) => {
    if(teamId) { const found = allTeams.find(tm => tm.id === teamId); return found ? { id: found.id, name: found.name, photoUrl: found.photoUrl } : { id: null, name: fallbackName || 'Por definir', photoUrl: null }; }
    return { id: null, name: fallbackName || 'Por definir', photoUrl: null };
  }

  return (
     <div className="mt-12 relative w-full border-t border-white/10 pt-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 px-2 md:px-4 gap-4">
           <h4 className="text-xl md:text-2xl font-black uppercase tracking-widest flex items-center theme-font-secondary"><Trophy className="mr-3 theme-accent-text" /> {isAdmin ? 'Edición de Llaves' : 'Fase Final'}</h4>
           {(handleShareCanvas) && (
             <div className="flex gap-2 w-full md:w-auto">
               <button onClick={async () => { const canvas = await exportBracketAsImage(tournament, allTeams, config, clubs); if(canvas) await handleShareCanvas(canvas, `Llaves-${tournament.name}.png`, 'download'); }} className="flex-1 md:flex-none bg-white/10 hover:bg-white/20 font-bold px-3 py-2 rounded-lg flex items-center justify-center transition-colors text-xs md:text-sm shadow-lg">
                 <Download size={14} className="mr-2" /> <span className="hidden sm:inline">Descargar</span>
               </button>
               <button onClick={async () => { const canvas = await exportBracketAsImage(tournament, allTeams, config, clubs); if(canvas) await handleShareCanvas(canvas, `Llaves-${tournament.name}.png`, 'whatsapp'); }} className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black px-3 py-2 rounded-lg flex items-center justify-center transition-colors text-xs md:text-sm shadow-lg">
                 <MessageCircle size={14} className="mr-2" /> WhatsApp
               </button>
             </div>
           )}
        </div>

        <div className="w-full overflow-x-auto custom-scrollbar pb-8 relative z-10">
           {isAdmin && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none z-0"><Trophy size={300} /></div>}
           <div className="w-max min-w-full mx-auto px-2 md:px-4 flex justify-center">
              <div className="flex items-stretch justify-center gap-3 md:gap-6 relative z-10">
                 
                 <div className="flex flex-1 justify-end gap-3 md:gap-6 border-r border-dashed border-white/10 pr-3 md:pr-6">
                    {regularRounds.map((b, bIdx) => {
                      const originalBIdx = validBrackets.findIndex(br => br.round === b.round);
                      return (
                      <div key={`L-${originalBIdx}`} className="flex flex-col justify-around gap-2 md:gap-4 w-[130px] md:w-[170px] shrink-0">
                         {b.matches.slice(0, Math.ceil(b.matches.length / 2)).map((m, mIdx) => (
                            <MatchNode key={`L-m-${originalBIdx}-${mIdx}`} match={m} roundName={b.round} onTeamClick={onTeamClick} getTeamInfo={getBracketTeamInfo} isAdmin={isAdmin} onEdit={() => onEditMatch && onEditMatch(originalBIdx, mIdx, m)} config={config} />
                         ))}
                      </div>
                    )})}
                 </div>

                 {finalRound && (
                   <div className="flex flex-col justify-center px-4 shrink-0 relative z-10 w-[150px] md:w-[200px]">
                      {!isAdmin && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none"><Trophy size={150} className="theme-accent-text" /></div>}
                      <div className="text-center mb-3"><span className="theme-accent-bg font-black px-3 py-1 rounded-full text-[10px] md:text-xs uppercase tracking-widest shadow-lg text-black">{finalRound.round}</span></div>
                      <MatchNode match={finalRound.matches[0]} roundName="" onTeamClick={onTeamClick} getTeamInfo={getBracketTeamInfo} isFinal={true} isAdmin={isAdmin} onEdit={() => onEditMatch && onEditMatch(validBrackets.findIndex(br => br.round === finalRound.round), 0, finalRound.matches[0])} config={config} />
                   </div>
                 )}

                 <div className="flex flex-1 justify-start gap-3 md:gap-6 border-l border-dashed border-white/10 pl-3 md:pl-6">
                    {[...regularRounds].reverse().map((b, revIdx) => {
                      const originalBIdx = validBrackets.findIndex(br => br.round === b.round);
                      const halfLength = Math.ceil(b.matches.length / 2);
                      return (
                      <div key={`R-${originalBIdx}`} className="flex flex-col justify-around gap-2 md:gap-4 w-[130px] md:w-[170px] shrink-0">
                         {b.matches.slice(halfLength).map((m, relativeMIdx) => {
                            const actualMIdx = halfLength + relativeMIdx;
                            return <MatchNode key={`R-m-${originalBIdx}-${actualMIdx}`} match={m} roundName={b.round} onTeamClick={onTeamClick} getTeamInfo={getBracketTeamInfo} isAdmin={isAdmin} onEdit={() => onEditMatch && onEditMatch(originalBIdx, actualMIdx, m)} config={config} />
                         })}
                      </div>
                    )})}
                 </div>

              </div>
           </div>
        </div>
     </div>
  );
}

function MatchNode({ match, roundName, onTeamClick, getTeamInfo, isFinal = false, isAdmin = false, onEdit, config }) {
  if(!match) return null;
  const t1 = getTeamInfo(match.team1Id, match.t1);
  const t2 = getTeamInfo(match.team2Id, match.t2);
  const isW1 = match.winnerId === match.team1Id && match.team1Id;
  const isW2 = match.winnerId === match.team2Id && match.team2Id;

  const scoreDisplay = [match.s1, match.s2, match.s3].filter(Boolean).join(' | ') || match.score || '';

  const getStyle = (isWinner) => {
     if (!isWinner) return { backgroundColor: 'transparent', border: '1px solid transparent' };
     return { backgroundColor: `${config?.primaryColor || '#a3e635'}33`, border: `1px solid ${config?.primaryColor || '#a3e635'}66` };
  };

  const getTextColor = (isWinner) => {
     return isWinner ? (config?.primaryColor || '#a3e635') : 'inherit';
  };

  return (
    <div className={`relative bg-black/40 rounded-lg border p-1.5 md:p-2 flex flex-col justify-center shadow-md transition-all group ${isAdmin ? 'cursor-pointer hover:theme-primary-border hover:-translate-y-0.5' : 'hover:border-white/20'} ${isFinal ? 'theme-accent-border shadow-lg scale-105' : 'border-white/10'}`} onClick={isAdmin ? onEdit : undefined}>
       {isAdmin && <div className="absolute -top-2 -right-2 theme-primary-bg rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md text-black"><Edit3 size={10} /></div>}

       {roundName && <div className="text-[8px] md:text-[9px] font-black theme-primary-text uppercase tracking-widest text-center mb-1.5">{roundName}</div>}

       <div className="space-y-1 md:space-y-1.5">
         <div className={`flex items-center justify-between p-1 rounded-md mb-0.5 transition-colors ${!isAdmin ? 'cursor-pointer hover:bg-white/5' : ''}`}
              style={getStyle(isW1)}
              onClick={(e) => { if(!isAdmin) onTeamClick(t1.id); }}>
            <div className="flex items-center flex-1 min-w-0">
              {t1.photoUrl ? <img src={t1.photoUrl} className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full object-cover mr-1.5 shrink-0 border border-white/10" alt=""/> : <Shield size={12} className="opacity-50 mr-1.5 shrink-0" />}
              <span className={`truncate text-[9px] md:text-[11px] ${isW1 ? 'font-black opacity-100' : 'font-semibold opacity-60 group-hover:opacity-100'}`} style={{ color: getTextColor(isW1) }}>{t1.name}</span>
            </div>
            {isW1 && <CheckCircle2 size={12} color={getTextColor(isW1)} className="ml-1 shrink-0" />}
         </div>

         <div className="h-px w-full bg-white/5 my-0.5"></div>

         <div className={`flex items-center justify-between p-1 rounded-md mt-0.5 transition-colors ${!isAdmin ? 'cursor-pointer hover:bg-white/5' : ''}`}
              style={getStyle(isW2)}
              onClick={(e) => { if(!isAdmin) onTeamClick(t2.id); }}>
            <div className="flex items-center flex-1 min-w-0">
              {t2.photoUrl ? <img src={t2.photoUrl} className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full object-cover mr-1.5 shrink-0 border border-white/10" alt=""/> : <Shield size={12} className="opacity-50 mr-1.5 shrink-0" />}
              <span className={`truncate text-[9px] md:text-[11px] ${isW2 ? 'font-black opacity-100' : 'font-semibold opacity-60 group-hover:opacity-100'}`} style={{ color: getTextColor(isW2) }}>{t2.name}</span>
            </div>
            {isW2 && <CheckCircle2 size={12} color={getTextColor(isW2)} className="ml-1 shrink-0" />}
         </div>
       </div>

       {scoreDisplay && (
         <div className="mt-1.5 bg-black/60 rounded py-0.5 px-1 border border-white/5 flex justify-center">
            <span className={`text-[8px] md:text-[9px] font-black tracking-widest ${isFinal ? 'theme-accent-text' : 'opacity-80'}`}>{scoreDisplay}</span>
         </div>
       )}
    </div>
  )
}

function PlayerCardVertical({ player, size="sm", title="", onClick, config }) {
  if (!player) return null;
  const isLg = size === "lg";
  return (
    <div className={`flex flex-col items-center relative group ${onClick ? 'cursor-pointer hover:-translate-y-1 transition-transform' : ''}`} onClick={(e) => { if(onClick) { e.stopPropagation(); onClick(); } }}>
      {title && <span className="absolute -top-3 theme-primary-bg text-[9px] font-black px-2 py-0.5 rounded-full z-10 uppercase text-black">{title}</span>}
      <div className={`${isLg ? 'w-20 h-28 md:w-28 md:h-40 border-2' : 'w-14 h-20 md:w-20 md:h-28 border'} rounded-xl bg-black/40 overflow-hidden border-white/20 shadow-md group-hover:theme-primary-border transition-colors flex shrink-0`}>
        {player.photoUrl ? <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white/5"><Users className="opacity-20" /></div>}
      </div>
      <div className="mt-2 w-full flex flex-col items-center bg-black/40 px-2 py-1.5 rounded-md border border-white/5 group-hover:bg-black/60 transition-colors">
         <span className={`${isLg ? 'text-xs md:text-sm max-w-[100px]' : 'text-[10px] md:text-xs max-w-[70px] md:max-w-[80px]'} font-bold opacity-80 text-center leading-tight truncate w-full group-hover:opacity-100 transition-colors`}>{player.name.split(' ')[0]}</span>
         {player.nickname && <span className="text-[9px] theme-primary-text font-black leading-none mt-0.5 truncate w-full text-center group-hover:opacity-100 opacity-90">"{player.nickname}"</span>}
         {player.position && <span className="text-[8px] opacity-50 uppercase font-bold mt-0.5 leading-none">{player.position}</span>}
      </div>
    </div>
  )
}

function AdminDashboard({ userRole, players, teams, matches, tournaments, news, clubs, config, db, getCollectionPath, allTeams, handleShareCanvas, onTeamClick }) {
  const [adminSection, setAdminSection] = useState('resultados');
  const navClasses = (sec) => `px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${adminSection === sec ? 'theme-primary-bg shadow-md text-black' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`;

  return (
    <div>
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <h2 className="text-3xl font-black uppercase tracking-wider flex items-center theme-font-secondary">
           {userRole === 'superadmin' ? <><Lock className="mr-3 theme-primary-text" /> Súper Panel Maestro</> : <><Settings className="mr-3 theme-primary-text" /> Panel Admin</>}
        </h2>
        <div className="flex flex-wrap theme-bg-card backdrop-blur-md rounded-xl p-1.5 border border-white/10 gap-1 w-full xl:w-auto overflow-x-auto">
          <button onClick={() => setAdminSection('resultados')} className={navClasses('resultados')}>Resultados</button>
          <button onClick={() => setAdminSection('partidos')} className={navClasses('partidos')}>Crear Partido</button>
          <button onClick={() => setAdminSection('equipos')} className={navClasses('equipos')}>Equipos</button>
          <button onClick={() => setAdminSection('jugadores')} className={navClasses('jugadores')}>Jugadores</button>
          <button onClick={() => setAdminSection('torneos')} className={navClasses('torneos')}>Torneos / Zonas</button>
          
          {config.feature_clubs !== false && <button onClick={() => setAdminSection('clubes')} className={navClasses('clubes')}>Sedes y Sponsors</button>}
          {config.feature_news !== false && <button onClick={() => setAdminSection('novedades')} className={navClasses('novedades')}>Novedades</button>}
          
          <button onClick={() => setAdminSection('config')} className={navClasses('config')}><Settings size={14} className="inline mr-1" /> Configuración</button>
          
          {userRole === 'superadmin' && (
             <button onClick={() => setAdminSection('superpanel')} className={navClasses('superpanel')}><Lock size={14} className="inline mr-1" /> Súper Panel</button>
          )}
        </div>
      </div>

      <div className="theme-bg-card backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
        {adminSection === 'jugadores' && <AdminJugadores players={players} matches={matches} userRole={userRole} db={db} getCollectionPath={getCollectionPath} config={config} />}
        {adminSection === 'equipos' && <AdminEquipos players={players} teams={teams} db={db} getCollectionPath={getCollectionPath} />}
        {adminSection === 'partidos' && <AdminPartidos teams={teams} db={db} getCollectionPath={getCollectionPath} />}
        {adminSection === 'resultados' && <AdminResultados matches={matches} teams={teams} db={db} getCollectionPath={getCollectionPath} tournaments={tournaments} />}
        {adminSection === 'torneos' && <AdminTorneos tournaments={tournaments} allTeams={teams} matches={matches} clubs={clubs} db={db} getCollectionPath={getCollectionPath} config={config} handleShareCanvas={handleShareCanvas} onTeamClick={onTeamClick} />}
        
        {adminSection === 'clubes' && config.feature_clubs !== false && <AdminClubes clubs={clubs} db={db} getCollectionPath={getCollectionPath} />}
        {adminSection === 'novedades' && config.feature_news !== false && <AdminNovedades news={news} db={db} getCollectionPath={getCollectionPath} />}
        {adminSection === 'config' && <AdminConfig config={config} db={db} getCollectionPath={getCollectionPath} />}
        
        {adminSection === 'superpanel' && userRole === 'superadmin' && <SuperAdminPanel config={config} db={db} getCollectionPath={getCollectionPath} />}
      </div>
    </div>
  );
}

function AdminJugadores({ players, matches, userRole, db, getCollectionPath, config }) {
  const [name, setName] = useState(''); 
  const [nickname, setNickname] = useState('');
  const [position, setPosition] = useState('');
  const [category, setCategory] = useState('6ta');
  const [gender, setGender] = useState('Masculino');
  const [photoUrl, setPhotoUrl] = useState(''); const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editForm, setEditForm] = useState({ achievements: [] });
  const [confirmReset, setConfirmReset] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setIsLoading(true); resizeImage(file, (compressed) => { setPhotoUrl(compressed); setIsLoading(false); }); }
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { resizeImage(file, (compressed) => { setEditForm({...editForm, photoUrl: compressed}); }); }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault(); if(!name) return;
    await setDoc(doc(collection(db, getCollectionPath('players'))), { name, nickname, position, category, gender, photoUrl, createdAt: Date.now(), achievements: [] });
    setName(''); setNickname(''); setPosition(''); setPhotoUrl('');
  };

  const openEditMode = (p) => {
     setEditingPlayerId(editingPlayerId === p.id ? null : p.id);
     setEditForm({ 
         name: p.name || '', 
         nickname: p.nickname || '',
         position: p.position || '',
         category: p.category || '6ta', 
         gender: p.gender || 'Masculino', 
         photoUrl: p.photoUrl || '', 
         achievements: Array.isArray(p.achievements) ? p.achievements : [] 
     });
  }

  const saveEdit = async (pId) => {
     await updateDoc(doc(db, getCollectionPath('players'), pId), editForm);
     setEditingPlayerId(null);
  }

  const handleResetStats = async () => {
      const completed = matches.filter(m => m.status === 'completed');
      for (const m of completed) {
          await deleteDoc(doc(db, getCollectionPath('matches'), m.id));
      }
      setConfirmReset(false);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleAddPlayer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 bg-black/20 p-6 rounded-2xl border border-white/10">
        
        <input required type="text" placeholder="Nombre Apellido" value={name} onChange={e => setName(e.target.value)} className="lg:col-span-2 bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border" />
        <input type="text" placeholder="Apodo (Opcional)" value={nickname} onChange={e => setNickname(e.target.value)} className="lg:col-span-1 bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border" />
        
        <select value={position} onChange={e => setPosition(e.target.value)} className="lg:col-span-1 bg-black/40 border border-white/10 rounded-xl p-3 outline-none font-bold">
          <option value="">Posición...</option>
          <option value="Drive">Drive</option>
          <option value="Revés">Revés</option>
        </select>
        
        <select value={category} onChange={e => setCategory(e.target.value)} className="lg:col-span-1 bg-black/40 border border-white/10 rounded-xl p-3 outline-none">
          {['7ma','6ta','5ta','4ta','3ra','2da','1ra'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="lg:col-span-1 relative flex items-center justify-center bg-black/40 border border-white/10 rounded-xl p-2 overflow-hidden group cursor-pointer hover:theme-primary-border">
          <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
          {isLoading ? <span className="text-xs theme-primary-text animate-pulse">...</span> : photoUrl ? <img src={photoUrl} alt="Preview" className="h-full w-full object-cover rounded opacity-50 group-hover:opacity-100" /> : <div className="flex flex-col items-center opacity-50"><Camera size={20} /><span className="text-[10px] mt-1 font-bold uppercase">Foto</span></div>}
        </div>

        <button type="submit" disabled={isLoading} className="lg:col-span-6 theme-primary-bg text-black font-black rounded-xl p-4 flex items-center justify-center transition-colors uppercase tracking-widest hover:opacity-80 mt-2"><Plus size={20} className="mr-2" /> Guardar Jugador</button>
      </form>

      <div className="overflow-x-auto bg-black/20 rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 opacity-80 uppercase text-xs tracking-wider font-black">
            <tr><th className="p-4 rounded-tl-2xl">Jugador</th><th className="p-4">Categoría / Pos.</th><th className="p-4 text-right rounded-tr-2xl">Acción</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {players.map(p => (
              <React.Fragment key={p.id}>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold flex items-center gap-3">
                    {p.photoUrl ? <img src={p.photoUrl} className="w-10 h-10 rounded object-cover" alt="img"/> : <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center"><Users size={18} /></div>}
                    <div className="flex flex-col">
                       <span>{p.name}</span>
                       {p.nickname && <span className="text-[10px] theme-primary-text italic opacity-80">"{p.nickname}"</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                       <span className="bg-black/40 border border-white/10 rounded px-2 py-0.5 theme-primary-text text-xs font-bold">{p.category}</span>
                       {p.position && <span className="text-[10px] opacity-60 uppercase font-bold">{p.position}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {confirmDeleteId === p.id ? (
                       <div className="flex items-center justify-end gap-2">
                         <button onClick={() => deleteDoc(doc(db, getCollectionPath('players'), p.id))} className="text-xs bg-red-500 text-white px-2 py-1 rounded font-bold">Seguro?</button>
                         <button onClick={() => setConfirmDeleteId(null)} className="text-xs bg-black/60 text-white px-2 py-1 rounded">Cancelar</button>
                       </div>
                    ) : (
                       <div className="flex items-center justify-end gap-2">
                         <button onClick={() => openEditMode(p)} className="theme-primary-text hover:opacity-80 px-3 py-2 bg-white/5 rounded-lg text-xs font-bold border border-white/5"><Edit3 size={16} className="inline mr-1" /> Editar</button>
                         <button onClick={() => setConfirmDeleteId(p.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg"><Trash2 size={16} /></button>
                       </div>
                    )}
                  </td>
                </tr>
                {editingPlayerId === p.id && (
                  <tr className="bg-black/40 border-b-2 theme-primary-border">
                    <td colSpan="4" className="p-4 md:px-8">
                       <div className="max-w-4xl space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                             <div className="md:col-span-4"><label className="text-[10px] opacity-60 font-bold uppercase block">Datos Personales</label></div>
                             
                             <div className="flex items-center gap-3 md:col-span-4 mb-2">
                                <div className="w-12 h-12 rounded-lg bg-black/60 overflow-hidden relative flex-shrink-0 cursor-pointer group border border-white/10">
                                   {editForm.photoUrl ? <img src={editForm.photoUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" alt="edit" /> : <div className="w-full h-full flex items-center justify-center opacity-50"><Camera size={16} /></div>}
                                   <input type="file" accept="image/*" onChange={handleEditFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                                <input value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} placeholder="Nombre completo" className="flex-1 bg-black/60 border border-white/10 rounded-lg p-2 text-sm font-bold outline-none focus:theme-primary-border" />
                             </div>
                             
                             <input value={editForm.nickname} onChange={e=>setEditForm({...editForm, nickname: e.target.value})} placeholder="Apodo (Opcional)" className="bg-black/60 border border-white/10 rounded-lg p-2 text-sm outline-none focus:theme-primary-border md:col-span-2" />
                             
                             <select value={editForm.position} onChange={e=>setEditForm({...editForm, position: e.target.value})} className="bg-black/60 border border-white/10 rounded-lg p-2 text-sm outline-none focus:theme-primary-border md:col-span-2 font-bold">
                                <option value="">Sin Posición</option>
                                <option value="Drive">Drive</option>
                                <option value="Revés">Revés</option>
                             </select>

                             <select value={editForm.category} onChange={e=>setEditForm({...editForm, category: e.target.value})} className="bg-black/60 border border-white/10 rounded-lg p-2 text-sm outline-none focus:theme-primary-border md:col-span-2">
                                {['7ma','6ta','5ta','4ta','3ra','2da','1ra'].map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                             
                             <select value={editForm.gender} onChange={e=>setEditForm({...editForm, gender: e.target.value})} className="bg-black/60 border border-white/10 rounded-lg p-2 text-sm outline-none focus:theme-primary-border md:col-span-2">
                                <option value="Masculino">Masculino</option><option value="Femenino">Femenino</option>
                             </select>
                          </div>

                          {config.feature_medals !== false && (
                             <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                                <label className="text-[10px] opacity-60 font-bold uppercase block mb-3">Logros Destacados (Máximo 3)</label>
                                {editForm.achievements.map((ach, idx) => (
                                   <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-3 items-center bg-black/20 p-2 rounded-lg border border-white/5">
                                      <Medal size={24} className={ach.type === 'oro' ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : ach.type === 'plata' ? 'text-slate-300' : 'text-amber-700'} />
                                      <select value={ach.type} onChange={e => { const newA = [...editForm.achievements]; newA[idx].type = e.target.value; setEditForm({...editForm, achievements: newA}); }} className="bg-black/40 border border-white/10 rounded-lg p-3 text-sm outline-none font-bold">
                                        <option value="oro">Oro (1ero)</option>
                                        <option value="plata">Plata (2do)</option>
                                        <option value="bronce">Bronce (3ero)</option>
                                      </select>
                                      <input value={ach.text} onChange={e => { const newA = [...editForm.achievements]; newA[idx].text = e.target.value; setEditForm({...editForm, achievements: newA}); }} placeholder="Ej: Campeón Super Liga 2025" className="flex-1 w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm outline-none" />
                                      <button onClick={() => { const newA = [...editForm.achievements]; newA.splice(idx,1); setEditForm({...editForm, achievements: newA}); }} className="text-red-400 hover:text-red-300 bg-red-500/10 p-3 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                   </div>
                                ))}
                                {editForm.achievements.length < 3 && (
                                   <button onClick={() => setEditForm({...editForm, achievements: [...editForm.achievements, {type: 'oro', text: ''}]})} className="text-xs theme-primary-text hover:opacity-80 bg-white/5 px-4 py-2 rounded-lg font-bold transition-colors border border-white/10 mt-2">+ Agregar Medalla</button>
                                )}
                             </div>
                          )}
                          
                          <div className="flex justify-end pt-2">
                             <button onClick={() => saveEdit(p.id)} className="theme-primary-bg text-black font-black px-6 py-3 rounded-xl tracking-widest uppercase transition-colors hover:opacity-80">Guardar Perfil</button>
                          </div>
                       </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* NUEVA SECCIÓN DE MANTENIMIENTO DISCRETA AL FINAL */}
      {userRole === 'superadmin' && config.feature_stats !== false && (
        <div className="pt-12 mt-8 border-t border-white/5">
           <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/5 gap-4">
              <div className="text-center md:text-left">
                 <h4 className="text-white/40 font-bold text-sm uppercase tracking-widest">Mantenimiento de Temporada</h4>
                 <p className="text-[10px] text-white/20 mt-1">Limpieza de resultados históricos para inicio de nuevo ciclo.</p>
              </div>
              
              {confirmReset ? (
                 <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10">
                    <span className="text-[10px] opacity-60 font-bold px-2 uppercase">¿Confirmar reinicio global?</span>
                    <button onClick={handleResetStats} className="bg-white/10 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-black transition-colors">Confirmar</button>
                    <button onClick={()=>setConfirmReset(false)} className="bg-black/20 text-white px-4 py-2 rounded-lg text-xs font-bold">Cancelar</button>
                 </div>
              ) : (
                 <button onClick={()=>setConfirmReset(true)} className="text-[10px] font-black opacity-20 hover:opacity-100 hover:text-red-400 transition-all uppercase tracking-widest py-2 px-4 border border-transparent hover:border-red-500/20 rounded-lg">
                    Reiniciar Estadísticas
                 </button>
              )}
           </div>
        </div>
      )}
    </div>
  )
}

function AdminClubes({ clubs, db, getCollectionPath }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [type, setType] = useState('club'); 
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setIsLoading(true); resizeImage(file, (compressed) => { setPhotoUrl(compressed); setIsLoading(false); }, 400, 400, 0.9); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if(!name) return;
    await setDoc(doc(collection(db, getCollectionPath('clubs'))), { 
       name, 
       address: type === 'club' ? address : '', 
       phone: type === 'club' ? phone : '', 
       photoUrl, 
       type,
       createdAt: Date.now() 
    });
    setName(''); setAddress(''); setPhone(''); setPhotoUrl('');
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-black/20 p-6 rounded-2xl border border-white/10">
         <div className="lg:col-span-4 mb-2">
            <h3 className="text-xl font-black uppercase tracking-wider flex items-center theme-font-secondary"><MapPin className="mr-2 theme-primary-text" /> Registrar Entidad</h3>
            <p className="text-xs opacity-60">Los sponsors aparecerán solo en la portada. Las sedes/clubes aparecerán además en la pestaña de Clubes con botón de reserva.</p>
         </div>

         <div className="lg:col-span-4 flex gap-6 mb-2 bg-black/40 p-4 rounded-xl border border-white/5">
             <label className="flex items-center gap-2 cursor-pointer">
                 <input type="radio" name="entityType" checked={type === 'club'} onChange={() => setType('club')} className="w-5 h-5 accent-lime-500" />
                 <span className="text-sm font-bold opacity-90">Sede Deportiva (Club)</span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
                 <input type="radio" name="entityType" checked={type === 'sponsor'} onChange={() => setType('sponsor')} className="w-5 h-5 accent-lime-500" />
                 <span className="text-sm font-bold opacity-90">Sponsor Oficial</span>
             </label>
         </div>
         
         <div className="lg:col-span-1 relative flex flex-col items-center justify-center bg-black/40 border border-white/10 rounded-xl p-4 overflow-hidden group cursor-pointer hover:theme-primary-border h-32">
            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            {isLoading ? <span className="text-xs theme-primary-text animate-pulse">Cargando...</span> : photoUrl ? <img src={photoUrl} alt="Preview" className="h-full w-full object-contain drop-shadow-md group-hover:scale-105 transition-transform" /> : <div className="flex flex-col items-center opacity-50"><Camera size={24} /><span className="text-[10px] mt-2 font-bold uppercase">Logo</span></div>}
         </div>

         <div className="lg:col-span-3 space-y-4 flex flex-col justify-center">
            <input required type="text" placeholder={`Nombre ${type === 'club' ? 'del Club' : 'del Sponsor'}`} value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border font-bold text-lg" />
            
            {type === 'club' && (
                <div className="flex flex-col md:flex-row gap-4 animate-in fade-in slide-in-from-top-2">
                   <input type="text" placeholder="Dirección (Opcional)" value={address} onChange={e => setAddress(e.target.value)} className="w-full md:w-1/2 bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border text-sm" />
                   <input type="text" placeholder="WhatsApp para Reservas" value={phone} onChange={e => setPhone(e.target.value)} className="w-full md:w-1/2 bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border text-sm" />
                </div>
            )}
         </div>

         <button type="submit" disabled={isLoading} className="lg:col-span-4 theme-primary-bg text-black font-black rounded-xl p-4 flex items-center justify-center transition-colors uppercase tracking-widest hover:opacity-80 mt-2"><Plus size={20} className="mr-2" /> Guardar {type === 'club' ? 'Club' : 'Sponsor'}</button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map(c => (
           <div key={c.id} className="p-5 rounded-2xl border border-white/10 bg-black/40 relative group flex gap-4 items-center">
              <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center p-2 shrink-0 border border-white/10">
                 {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-contain" /> : <MapPin className="opacity-30" />}
              </div>
              <div className="flex-1 min-w-0">
                 <h4 className="font-black text-lg truncate theme-font-secondary flex items-center">
                    {c.name}
                 </h4>
                 <span className={`text-[10px] px-2 py-0.5 rounded font-bold mt-1 inline-block ${c.type === 'sponsor' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/10 opacity-80'}`}>
                    {c.type === 'sponsor' ? 'Sponsor' : 'Sede / Club'}
                 </span>
                 
                 {c.type !== 'sponsor' && (
                    <div className="text-xs opacity-60 space-y-1 mt-2">
                       {c.address && <p className="truncate flex items-center"><MapPin size={10} className="mr-1 shrink-0" /> {c.address}</p>}
                       {c.phone && <p className="truncate flex items-center"><Phone size={10} className="mr-1 shrink-0" /> {c.phone}</p>}
                    </div>
                 )}
              </div>
              <button onClick={() => deleteDoc(doc(db, getCollectionPath('clubs'), c.id))} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 p-2 bg-red-500/10 rounded-lg hover:text-red-300"><Trash2 size={16} /></button>
           </div>
        ))}
      </div>
    </div>
  )
}


function AdminEquipos({ players, teams, db, getCollectionPath }) {
  const [name, setName] = useState(''); const [p1, setP1] = useState(''); const [p2, setP2] = useState(''); const [p3, setP3] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState(''); const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setIsLoading(true); resizeImage(file, (compressed) => { setPhotoUrl(compressed); setIsLoading(false); }); }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if(p1 === p2 || (p3 && (p3 === p1 || p3 === p2))) return setErrorMsg("Selecciona jugadores diferentes.");
    await setDoc(doc(collection(db, getCollectionPath('teams'))), { name, player1Id: p1, player2Id: p2, player3Id: p3, photoUrl, phone, createdAt: Date.now() });
    setName(''); setP1(''); setP2(''); setP3(''); setPhotoUrl(''); setPhone(''); setErrorMsg('');
  };
  const getPlayerName = (id) => players.find(p => p.id === id)?.name || '';

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreateTeam} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-black/20 p-6 rounded-2xl border border-white/10">
        <input required type="text" placeholder="Nombre del Equipo" value={name} onChange={e => setName(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border lg:col-span-2" />
        <input type="text" placeholder="Teléfono del Delegado (WhatsApp)" value={phone} onChange={e => setPhone(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border lg:col-span-2" />
        
        <div className="lg:col-span-1 relative flex items-center justify-center bg-black/40 border border-white/10 rounded-xl p-2 overflow-hidden group cursor-pointer hover:theme-primary-border">
          <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
          {isLoading ? <span className="text-xs theme-primary-text animate-pulse">...</span> : photoUrl ? <img src={photoUrl} alt="Preview" className="h-full w-full object-contain rounded opacity-80 group-hover:opacity-100" /> : <div className="flex flex-col items-center opacity-50"><Shield size={20} /><span className="text-[10px] mt-1 font-bold uppercase text-center">Escudo / Logo</span></div>}
        </div>

        <select required value={p1} onChange={e => setP1(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl p-3 outline-none lg:col-span-1">
          <option value="">Jugador 1...</option>{players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
        </select>
        <select required value={p2} onChange={e => setP2(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl p-3 outline-none lg:col-span-2">
          <option value="">Jugador 2...</option>{players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
        </select>
        <select value={p3} onChange={e => setP3(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl p-3 outline-none lg:col-span-2">
          <option value="">Jugador 3 (Suplente - Opcional)</option>{players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
        </select>
        <button type="submit" disabled={isLoading} className="theme-primary-bg text-black font-black rounded-xl p-3 uppercase tracking-wider transition-colors hover:opacity-80 lg:col-span-5">Crear Equipo</button>
        {errorMsg && <p className="text-red-400 text-sm col-span-full font-bold">{errorMsg}</p>}
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(t => (
          <div key={t.id} className="bg-black/20 p-5 rounded-2xl border border-white/10 flex flex-col group relative">
            <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-2">
              {t.photoUrl ? <img src={t.photoUrl} className="w-10 h-10 rounded-full object-cover bg-black/40" alt="logo"/> : <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"><Shield size={18} className="opacity-50" /></div>}
              <h4 className="font-black text-lg">{t.name}</h4>
            </div>
            <div className="text-sm opacity-80 space-y-1">
              <p>• {getPlayerName(t.player1Id)}</p>
              <p>• {getPlayerName(t.player2Id)}</p>
              {t.player3Id && <p className="theme-primary-text">• {getPlayerName(t.player3Id)} <span className="text-xs opacity-50">(Sup)</span></p>}
            </div>
            
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                <Phone size={14} className="opacity-50" />
                <input type="text" value={t.phone || ''} onChange={e => updateDoc(doc(db, getCollectionPath('teams'), t.id), {phone: e.target.value})} className="bg-transparent border-none outline-none text-xs font-bold opacity-60 hover:opacity-100 focus:opacity-100 w-full focus:theme-primary-text transition-colors" placeholder="Añadir teléfono delegado..." />
            </div>

            {confirmDeleteId === t.id ? (
              <div className="absolute top-2 right-2 bg-black/80 p-2 rounded-lg border border-red-500 flex items-center gap-2">
                 <button onClick={() => deleteDoc(doc(db, getCollectionPath('teams'), t.id))} className="text-xs bg-red-500 text-white px-2 py-1 rounded font-bold">Borrar</button>
                 <button onClick={() => setConfirmDeleteId(null)} className="text-xs bg-black/60 text-white px-2 py-1 rounded">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeleteId(t.id)} className="absolute top-4 right-4 text-red-400 p-2 bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminPartidos({ teams, db, getCollectionPath }) {
  const [round, setRound] = useState(''); const [t1, setT1] = useState(''); const [t2, setT2] = useState('');
  const [msg, setMsg] = useState('');

  const handleCreateMatch = async (e) => {
    e.preventDefault(); 
    if(t1 === t2) { setMsg("Error: Selecciona equipos distintos."); return; }
    await setDoc(doc(collection(db, getCollectionPath('matches'))), { round, team1Id: t1, team2Id: t2, status: 'pending', s1: '', s2: '', s3: '', winnerId: null, createdAt: Date.now() });
    setT1(''); setT2(''); setMsg("¡Partido publicado en la grilla con éxito!");
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-black/20 p-8 rounded-3xl border border-white/10 shadow-xl relative">
      <h3 className="text-2xl font-black mb-6 uppercase text-center tracking-wider">Publicar Partido</h3>
      <form onSubmit={handleCreateMatch} className="space-y-5">
        <input required type="text" placeholder="Instancia (Ej: Fecha 5, Semifinal)" value={round} onChange={e => setRound(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-lg font-bold text-center outline-none focus:theme-primary-border" />
        <div className="flex flex-col md:flex-row items-center gap-4">
          <SearchableTeamSelect value={t1} options={teams} onChange={setT1} placeholder="Buscar Equipo 1..." className="w-full bg-black/40 border border-white/10 rounded-xl p-4 font-bold outline-none" />
          <span className="font-black opacity-50 italic text-2xl">VS</span>
          <SearchableTeamSelect value={t2} options={teams} onChange={setT2} placeholder="Buscar Equipo 2..." className="w-full bg-black/40 border border-white/10 rounded-xl p-4 font-bold outline-none" />
        </div>
        <button type="submit" className="w-full theme-primary-bg text-black font-black rounded-xl p-4 text-lg uppercase tracking-widest transition-colors hover:opacity-80 mt-4">Añadir a la Grilla</button>
        {msg && <div className={`text-center font-bold text-sm mt-4 ${msg.includes('Error') ? 'text-red-400' : 'theme-primary-text'}`}>{msg}</div>}
      </form>
    </div>
  )
}

function AdminResultados({ matches, teams, db, getCollectionPath, tournaments }) {
  const pending = matches.filter(m => m.status === 'pending');
  const [localSuccessMsg, setLocalSuccessMsg] = useState('');
  const [confirmClearPending, setConfirmClearPending] = useState(false);

  const sortedPending = [...pending].sort((a, b) => {
     if (a.tournamentName !== b.tournamentName) return (a.tournamentName || '').localeCompare(b.tournamentName || '');
     if (a.roundNumber !== b.roundNumber) return (a.roundNumber || 0) - (b.roundNumber || 0);
     return a.createdAt - b.createdAt;
  });

  const groupedPending = sortedPending.reduce((groups, m) => {
     const key = m.tournamentName ? `${m.tournamentName} - ${m.round}` : (m.round || 'Partidos Amistosos / Manuales');
     if (!groups[key]) groups[key] = [];
     groups[key].push(m);
     return groups;
  }, {});

  const handleSaveResult = async (m, s1, s2, s3, wId) => {
    await updateDoc(doc(db, getCollectionPath('matches'), m.id), { status: 'completed', s1, s2, s3, winnerId: wId });

    if (m.tournamentId && m.zoneIndex !== undefined) {
       const tDoc = tournaments.find(t => t.id === m.tournamentId);
       if (tDoc) {
           const validSetsCount = [s1, s2, s3].filter(Boolean).length;
           const winSets = 2;
           const loseSets = validSetsCount === 3 ? 1 : 0; 

           const newZones = [...tDoc.zones];
           const z = newZones[m.zoneIndex];
           if(z) {
               const t1Stats = z.teams.find(x => x.teamId === m.team1Id);
               const t2Stats = z.teams.find(x => x.teamId === m.team2Id);
               if(t1Stats && t2Stats) {
                   t1Stats.pj = (t1Stats.pj || 0) + 1; t2Stats.pj = (t2Stats.pj || 0) + 1;
                   if(wId === m.team1Id) {
                       t1Stats.pg = (t1Stats.pg || 0) + 1; t1Stats.pts = (t1Stats.pts || 0) + 3;
                       t1Stats.sf = (t1Stats.sf || 0) + winSets; t1Stats.sc = (t1Stats.sc || 0) + loseSets;
                       t2Stats.sf = (t2Stats.sf || 0) + loseSets; t2Stats.sc = (t2Stats.sc || 0) + winSets;
                   } else {
                       t2Stats.pg = (t2Stats.pg || 0) + 1; t2Stats.pts = (t2Stats.pts || 0) + 3;
                       t2Stats.sf = (t2Stats.sf || 0) + winSets; t2Stats.sc = (t2Stats.sc || 0) + loseSets;
                       t1Stats.sf = (t1Stats.sf || 0) + loseSets; t1Stats.sc = (t1Stats.sc || 0) + winSets;
                   }
                   await updateDoc(doc(db, getCollectionPath('tournaments'), tDoc.id), { zones: newZones });
               }
           }
       }
    }
  };

  const handleClearAllPending = async () => {
    const pendingToClear = matches.filter(m => m.status === 'pending');
    for (const m of pendingToClear) {
      await deleteDoc(doc(db, getCollectionPath('matches'), m.id));
    }
    setConfirmClearPending(false);
    setLocalSuccessMsg("Se han eliminado todos los partidos pendientes.");
    setTimeout(() => setLocalSuccessMsg(''), 4000);
  };

  const handleDeletePendingMatch = async (matchId) => {
    await deleteDoc(doc(db, getCollectionPath('matches'), matchId));
    setLocalSuccessMsg("Partido anulado de la grilla.");
    setTimeout(() => setLocalSuccessMsg(''), 4000);
  };
  
  const getTeamObj = (id) => teams.find(t => t.id === id) || { name: 'Desconocido', photoUrl: '' };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
         <h3 className="text-xl font-black uppercase tracking-wider theme-font-secondary">Partidos Pendientes</h3>
         
         {pending.length > 0 && (
           confirmClearPending ? (
             <div className="flex items-center gap-2 bg-red-500/10 p-2 rounded-xl border border-red-500/30 animate-in fade-in zoom-in-95">
               <span className="text-[10px] text-red-400 font-bold px-2 uppercase">¿Borrar toda la grilla?</span>
               <button onClick={handleClearAllPending} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-lg">Sí, Limpiar</button>
               <button onClick={() => setConfirmClearPending(false)} className="bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-bold">No</button>
             </div>
           ) : (
             <button onClick={() => setConfirmClearPending(true)} className="flex items-center gap-2 text-xs font-bold text-red-400/60 hover:text-red-400 transition-colors px-3 py-2 rounded-lg border border-red-500/10 hover:bg-red-500/5">
               <Trash2 size={14} /> Vaciar Grilla de Pendientes
             </button>
           )
         )}
      </div>

      {localSuccessMsg && (
         <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-full font-black shadow-2xl z-[9999] flex items-center animate-in fade-in slide-in-from-top-8 text-sm md:text-base w-max max-w-[90vw]">
            <CheckCircle2 className="mr-2 md:mr-3 shrink-0" size={24} /> 
            <span className="truncate">{localSuccessMsg}</span>
         </div>
      )}

      {Object.keys(groupedPending).length === 0 && <p className="opacity-60">Todo al día.</p>}
      
      <div className="space-y-10">
        {Object.entries(groupedPending).map(([groupName, groupMatches]) => (
          <div key={groupName}>
             <h4 className="font-black text-lg theme-accent-text mb-4 border-b border-white/10 pb-2 uppercase tracking-widest">{groupName}</h4>
             
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
               {groupMatches.map(m => {
                 const t1 = getTeamObj(m.team1Id);
                 const t2 = getTeamObj(m.team2Id);
                 return <AdminPendingMatchCard key={m.id} m={m} t1={t1} t2={t2} onSave={handleSaveResult} onDelete={() => handleDeletePendingMatch(m.id)} />
               })}
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminPendingMatchCard({ m, t1, t2, onSave, onDelete }) {
  const [s1, setS1] = useState(''); const [s2, setS2] = useState(''); const [s3, setS3] = useState('');
  const [winnerId, setWinnerId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localError, setLocalError] = useState('');
  
  // NUEVOS ESTADOS PARA CONTROLAR EL BOTÓN
  const [isSaving, setIsSaving] = useState(false); 
  const [isSuccess, setIsSuccess] = useState(false);

  const handleScoreChange = (e, val, setVal, nextId) => {
    const inputVal = e.target.value;
    if (inputVal.length < val.length) { setVal(inputVal); return; } 
    
    const raw = inputVal.replace(new RegExp('[^0-9WwOo.-]', 'g'), '');
    if (raw.length === 2 && !raw.toLowerCase().includes('w') && !raw.toLowerCase().includes('o')) {
        setVal(`${raw[0]}-${raw[1]}`);
        if (nextId) { const nextInput = document.getElementById(nextId); if (nextInput) nextInput.focus(); }
    } else if (raw.length > 2 && !raw.toLowerCase().includes('w') && !raw.toLowerCase().includes('o')) {
        setVal(`${raw[0]}-${raw[1]}`);
    } else { setVal(raw); }
  };

  const handleConfirm = async () => {
    if (!winnerId) {
        setLocalError('⚠️ Toca el nombre del equipo que ganó.');
        setTimeout(() => setLocalError(''), 3000);
        return;
    }
    if (!s1 && !s2 && !s3) {
        setLocalError('⚠️ Ingresa al menos el resultado de un set.');
        setTimeout(() => setLocalError(''), 3000);
        return;
    }
    
    setIsSaving(true);
    setIsSuccess(true); // Cambiamos a verde instantáneamente
    
    // Retrasamos la ejecución en la base de datos 1.5 segundos 
    // para que el usuario pueda ver el botón en verde antes de que desaparezca
    setTimeout(async () => {
        try {
           await onSave(m, s1, s2, s3, winnerId);
        } catch (e) {
           console.error("Error al guardar", e);
           setIsSaving(false);
           setIsSuccess(false);
        }
    }, 1500);
  };

  return (
    <div className="bg-black/20 p-4 md:p-5 rounded-2xl border border-white/10 flex flex-col items-center gap-4 relative">
       {m.zoneName && <div className="absolute -top-3 left-4 bg-white/10 px-3 py-1 rounded-lg uppercase tracking-widest font-black text-[10px] backdrop-blur-md border border-white/10">{m.zoneName}</div>}
       
       <div className="absolute top-2 right-2 z-20">
          {confirmDelete ? (
             <div className="flex gap-2 items-center bg-red-500/90 backdrop-blur-md p-1.5 rounded-lg border border-red-400 shadow-xl">
                <span className="text-[10px] text-white font-bold ml-1">¿Anular?</span>
                <button onClick={onDelete} className="bg-white text-red-600 px-2 py-0.5 rounded text-xs font-black">Sí</button>
                <button onClick={() => setConfirmDelete(false)} className="bg-black/40 text-white px-2 py-0.5 rounded text-xs font-bold">No</button>
             </div>
          ) : (
             <button onClick={() => setConfirmDelete(true)} className="p-1.5 bg-black/40 hover:bg-red-500 hover:text-white text-white/50 rounded-lg transition-colors border border-white/5" title="Anular Partido">
                <X size={14} />
             </button>
          )}
       </div>

       <span className="text-xs font-bold opacity-60 w-full text-center mb-1 mt-2">Toca el equipo ganador para seleccionarlo:</span>
       
       <div className="flex w-full items-center justify-center gap-2 md:gap-3">
          <div 
            onClick={() => setWinnerId(m.team1Id)} 
            className={`flex-1 flex items-center justify-end p-2.5 md:p-3 rounded-xl cursor-pointer transition-all border ${winnerId === m.team1Id ? 'theme-primary-bg text-black border-transparent shadow-lg scale-[1.02]' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
          >
             <span className={`font-black text-xs md:text-sm text-right mr-3 truncate max-w-[100px] md:max-w-[120px] ${winnerId === m.team1Id ? 'text-black' : ''}`}>{t1.name}</span>
             {t1.photoUrl ? <img src={t1.photoUrl} className="w-8 h-8 rounded-full object-cover shrink-0 border border-black/20" alt="logo"/> : <Shield size={24} className={`shrink-0 ${winnerId === m.team1Id ? 'opacity-80' : 'opacity-40'}`} />}
          </div>

          <span className="opacity-30 text-[10px] md:text-xs italic font-black shrink-0">VS</span>

          <div 
            onClick={() => setWinnerId(m.team2Id)} 
            className={`flex-1 flex items-center justify-start p-2.5 md:p-3 rounded-xl cursor-pointer transition-all border ${winnerId === m.team2Id ? 'theme-primary-bg text-black border-transparent shadow-lg scale-[1.02]' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
          >
             {t2.photoUrl ? <img src={t2.photoUrl} className="w-8 h-8 rounded-full object-cover shrink-0 border border-black/20" alt="logo"/> : <Shield size={24} className={`shrink-0 ${winnerId === m.team2Id ? 'opacity-80' : 'opacity-40'}`} />}
             <span className={`font-black text-xs md:text-sm text-left ml-3 truncate max-w-[100px] md:max-w-[120px] ${winnerId === m.team2Id ? 'text-black' : ''}`}>{t2.name}</span>
          </div>
       </div>

       {localError && (
          <div className="bg-red-500 text-white w-full text-center px-4 py-2 rounded-xl text-xs font-black shadow-xl animate-in slide-in-from-bottom-2">
             {localError}
          </div>
       )}

       <div className="flex gap-2 items-center w-full justify-center bg-black/40 p-3 rounded-xl border border-white/5 mt-1 relative">
          <span className="text-[10px] font-bold opacity-50 uppercase mr-1 hidden sm:inline">Sets:</span>
          <input id={`s1-${m.id}`} type="text" placeholder="1er" value={s1} onChange={e => handleScoreChange(e, s1, setS1, `s2-${m.id}`)} className="w-12 md:w-16 bg-black/60 border border-white/10 rounded-lg p-2.5 font-black text-center outline-none focus:theme-primary-border" />
          <input id={`s2-${m.id}`} type="text" placeholder="2do" value={s2} onChange={e => handleScoreChange(e, s2, setS2, `s3-${m.id}`)} className="w-12 md:w-16 bg-black/60 border border-white/10 rounded-lg p-2.5 font-black text-center outline-none focus:theme-primary-border" />
          <input id={`s3-${m.id}`} type="text" placeholder="3er" value={s3} onChange={e => handleScoreChange(e, s3, setS3, null)} className="w-12 md:w-16 bg-black/60 border border-white/10 rounded-lg p-2.5 font-black text-center outline-none focus:theme-primary-border" />
          
          <button 
            onClick={handleConfirm} 
            disabled={isSaving || isSuccess}
            className={`${isSuccess ? 'bg-lime-400 text-slate-900 border-lime-400 scale-[1.02]' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'} font-black px-3 py-2.5 md:px-4 rounded-lg transition-all ml-auto shadow-md flex items-center justify-center shrink-0 border`}
          >
             {isSuccess ? (
                <><CheckCircle2 size={18} className="md:mr-2" /> <span className="hidden md:inline text-black">¡Guardado!</span></>
             ) : (
                <><CheckCircle2 size={18} className="md:mr-2" /> <span className="hidden md:inline">Confirmar</span></>
             )}
          </button>
       </div>
    </div>
  )
}

function AutoTournamentWizard({ allTeams, db, getCollectionPath, onCancel }) {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [selectedTeams, setSelectedTeams] = useState([]);
    const [numZones, setNumZones] = useState(1);
    const [doubleRound, setDoubleRound] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const toggleTeam = (id) => {
        if (selectedTeams.includes(id)) setSelectedTeams(selectedTeams.filter(t => t !== id));
        else setSelectedTeams([...selectedTeams, id]);
    };
    const selectAll = () => {
        if (selectedTeams.length === allTeams.length) setSelectedTeams([]);
        else setSelectedTeams(allTeams.map(t => t.id));
    };

    const generateRoundRobin = (teamsArr, tName, zName, tId, zIdx, doubleRnd) => {
        let t = [...teamsArr];
        if (t.length % 2 !== 0) t.push(null);
        const n = t.length;
        const rounds = n - 1;
        const matches = [];

        for (let r = 0; r < rounds; r++) {
            for (let i = 0; i < n / 2; i++) {
                const t1 = t[i];
                const t2 = t[n - 1 - i];
                if (t1 !== null && t2 !== null) {
                    matches.push({
                        round: `Fecha ${r + 1}`,
                        roundNumber: r + 1,
                        tournamentId: tId,
                        tournamentName: tName,
                        zoneName: zName,
                        zoneIndex: zIdx,
                        team1Id: t1.id,
                        team2Id: t2.id,
                        status: 'pending',
                        s1: '', s2: '', s3: '', winnerId: null,
                        createdAt: Date.now() + matches.length
                    });
                }
            }
            t.splice(1, 0, t.pop());
        }

        if (doubleRnd) {
            const idaMatches = [...matches];
            idaMatches.forEach(m => {
                matches.push({
                    ...m,
                    round: `Fecha ${m.roundNumber + rounds} (V)`,
                    roundNumber: m.roundNumber + rounds,
                    team1Id: m.team2Id,
                    team2Id: m.team1Id,
                    createdAt: Date.now() + matches.length
                });
            });
        }
        return matches;
    };

    const handleGenerate = async () => {
        if (!name || selectedTeams.length < 2) return;
        setIsLoading(true);
        
        let shuffled = [...allTeams.filter(t => selectedTeams.includes(t.id))];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const zones = Array.from({length: numZones}).map((_, i) => ({
            name: `Zona ${String.fromCharCode(65 + i)}`,
            teams: []
        }));

        shuffled.forEach((team, idx) => {
            const zIdx = idx % numZones;
            zones[zIdx].teams.push({ teamId: team.id, name: team.name, pts: 0, pj: 0, pg: 0, sf: 0, sc: 0 });
        });

        const newTournamentRef = doc(collection(db, getCollectionPath('tournaments')));
        await setDoc(newTournamentRef, { name, status: 'Fase de Grupos', isArchived: false, championId: '', zones, brackets: [], rulesText: '', rulesPdfUrl: '' });
        const tId = newTournamentRef.id;

        let allMatches = [];
        zones.forEach((z, zIdx) => {
            const zoneTeams = shuffled.filter((_, idx) => (idx % numZones) === zIdx);
            const zoneMatches = generateRoundRobin(zoneTeams, name, z.name, tId, zIdx, doubleRound);
            allMatches = [...allMatches, ...zoneMatches];
        });

        for (const matchData of allMatches) {
            await setDoc(doc(collection(db, getCollectionPath('matches'))), matchData);
        }

        setIsLoading(false);
        onCancel();
    };
    
    const avgTeams = Math.ceil(selectedTeams.length / numZones) || 0;
    const roundsIda = avgTeams % 2 === 0 ? avgTeams - 1 : avgTeams;
    const totalRoundsCalculated = doubleRound ? roundsIda * 2 : roundsIda;

    return (
        <div className="bg-black/40 border border-white/10 p-6 rounded-2xl relative mb-10 shadow-2xl">
           {isLoading && <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center rounded-2xl backdrop-blur-sm"><span className="text-xl font-black theme-primary-text animate-pulse">Generando Torneo y Partidos...</span></div>}
           <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
              <h3 className="text-xl font-black uppercase tracking-wider theme-primary-text flex items-center"><LayoutList className="mr-2" /> Asistente de Torneo</h3>
              <button onClick={onCancel} className="opacity-50 hover:opacity-100 bg-black/40 p-2 rounded-full"><X size={20} /></button>
           </div>
           
           {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <p className="opacity-80 font-bold mb-4">Paso 1: Nombre del Torneo</p>
                 <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Super Liga 2026 - Apertura" className="w-full bg-black/60 border border-white/10 rounded-xl p-4 font-bold outline-none focus:theme-primary-border text-lg" />
                 <div className="flex justify-end pt-4"><button disabled={!name} onClick={()=>setStep(2)} className="theme-primary-bg text-black px-6 py-3 rounded-xl font-black disabled:opacity-50 transition-all shadow-lg">Siguiente Paso</button></div>
              </div>
           )}

           {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <div className="flex justify-between items-center mb-4">
                    <p className="opacity-80 font-bold">Paso 2: Seleccionar Equipos ({selectedTeams.length} seleccionados)</p>
                    <button onClick={selectAll} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 font-bold">{selectedTeams.length === allTeams.length ? 'Desmarcar Todos' : 'Seleccionar Todos'}</button>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar border border-white/5 p-3 rounded-xl bg-black/20">
                    {allTeams.map(t => (
                       <div key={t.id} onClick={()=>toggleTeam(t.id)} className={`p-3 rounded-lg border cursor-pointer flex items-center transition-all ${selectedTeams.includes(t.id) ? 'theme-primary-border bg-white/10' : 'border-white/5 hover:border-white/20 bg-black/40'}`}>
                          <div className={`w-4 h-4 rounded-full mr-3 flex items-center justify-center border ${selectedTeams.includes(t.id) ? 'theme-primary-bg border-transparent' : 'border-white/20'}`}>{selectedTeams.includes(t.id) && <CheckCircle2 size={12} className="text-black" />}</div>
                          <span className="text-sm font-bold truncate">{t.name}</span>
                       </div>
                    ))}
                 </div>
                 <div className="flex justify-between pt-4">
                    <button onClick={()=>setStep(1)} className="px-6 py-3 rounded-xl font-bold opacity-60 hover:opacity-100 bg-white/5 border border-white/10">Atrás</button>
                    <button disabled={selectedTeams.length < 2} onClick={()=>setStep(3)} className="theme-primary-bg text-black px-6 py-3 rounded-xl font-black disabled:opacity-50 transition-all shadow-lg">Siguiente Paso</button>
                 </div>
              </div>
           )}

           {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <p className="opacity-80 font-bold mb-2">Paso 3: Formato y Generación</p>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 p-5 rounded-xl border border-white/5">
                    <div className="space-y-2">
                       <label className="text-sm font-bold opacity-80 block">Cantidad de Zonas</label>
                       <select value={numZones} onChange={e=>setNumZones(Number(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 outline-none font-bold focus:theme-primary-border">
                          {[1,2,3,4,6,8].map(n => <option key={n} value={n}>{n} {n===1?'Zona (Todos en una)':'Zonas'}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-bold opacity-80 block">Modalidad de Enfrentamientos</label>
                       <select value={doubleRound ? 'ida_vuelta' : 'ida'} onChange={e=>setDoubleRound(e.target.value === 'ida_vuelta')} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 outline-none font-bold focus:theme-primary-border">
                          <option value="ida">Solo Ida (1 partido vs cada uno)</option>
                          <option value="ida_vuelta">Ida y Vuelta (2 partidos vs cada uno)</option>
                       </select>
                    </div>
                 </div>

                 <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-emerald-400 text-sm font-bold flex flex-col gap-3">
                    <span>• Torneo: {name}</span>
                    <span>• Equipos Seleccionados: {selectedTeams.length} (se dividirán aleatoriamente en {numZones} zonas)</span>
                    <span>• Promedio por zona: {Math.floor(selectedTeams.length / numZones)} a {Math.ceil(selectedTeams.length / numZones)} equipos.</span>
                    <div className="bg-black/40 p-3 rounded-lg border border-emerald-500/20 text-white opacity-90 text-xs font-normal leading-relaxed mt-2">
                       El sistema <strong>Round-Robin</strong> garantiza que todos jueguen contra todos exactamente 1 vez (o 2 si es ida y vuelta). 
                       <br/>Se calcularon aproximadamente <strong>{totalRoundsCalculated} Fechas en total</strong>. 
                       <br/><em>(Nota: Si una zona queda con un número impar de equipos, el sistema generará automáticamente una "fecha libre" en cada ronda para el equipo que sobra).</em>
                    </div>
                 </div>

                 <div className="flex justify-between pt-4">
                    <button onClick={()=>setStep(2)} className="px-6 py-3 rounded-xl font-bold opacity-60 hover:opacity-100 bg-white/5 border border-white/10">Atrás</button>
                    <button onClick={handleGenerate} className="theme-accent-bg text-black px-8 py-3 rounded-xl font-black hover:opacity-80 transition-all shadow-lg text-lg">¡Generar Todo!</button>
                 </div>
              </div>
           )}
        </div>
    )
}

function AdminTorneos({ tournaments, allTeams, matches, clubs, db, getCollectionPath, config, handleShareCanvas, onTeamClick }) {
  const [showWizard, setShowWizard] = useState(false);
  const [adminTorneosTab, setAdminTorneosTab] = useState('activos');

  return (
    <div className="space-y-10">
      
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 items-start md:items-center">
         <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 w-full md:w-auto">
            <button onClick={() => setAdminTorneosTab('activos')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${adminTorneosTab === 'activos' ? 'theme-primary-bg text-black shadow-lg' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}>Activos</button>
            <button onClick={() => setAdminTorneosTab('archivados')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${adminTorneosTab === 'archivados' ? 'theme-primary-bg text-black shadow-lg' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}>Archivados</button>
         </div>
         
         {!showWizard && adminTorneosTab === 'activos' && (
           <button onClick={() => setShowWizard(true)} className="theme-primary-bg text-black font-black px-6 py-3 rounded-xl uppercase tracking-widest hover:opacity-80 transition-colors w-full md:w-auto shadow-lg text-sm">+ Asistente Automático</button>
         )}
      </div>

      {showWizard && adminTorneosTab === 'activos' && (
        <AutoTournamentWizard allTeams={allTeams} db={db} getCollectionPath={getCollectionPath} onCancel={() => setShowWizard(false)} />
      )}

      {tournaments.filter(t => adminTorneosTab === 'activos' ? !t.isArchived : t.isArchived).length === 0 && (
         <div className="text-center p-12 bg-black/20 rounded-3xl border border-white/5">
             <p className="opacity-60 text-lg">No hay torneos {adminTorneosTab === 'activos' ? 'activos' : 'archivados'} en este panel.</p>
         </div>
      )}

      {tournaments.filter(t => adminTorneosTab === 'activos' ? !t.isArchived : t.isArchived).map(t => (
         <AdminTournamentCard key={t.id} t={t} allTeams={allTeams} matches={matches} clubs={clubs} db={db} getCollectionPath={getCollectionPath} config={config} handleShareCanvas={handleShareCanvas} onTeamClick={onTeamClick} /> 
      ))}
    </div>
  )
}

function AdminTournamentCard({ t, allTeams, matches, clubs, db, getCollectionPath, config, handleShareCanvas, onTeamClick }) {
  const [showAddZone, setShowAddZone] = useState(false); const [newZoneName, setNewZoneName] = useState('');
  const [showAddBracket, setShowAddBracket] = useState(false); const [numBracketTeams, setNumBracketTeams] = useState('8');
  const [showRulesEdit, setShowRulesEdit] = useState(false);
  const [rulesText, setRulesText] = useState(t.rulesText || ''); const [rulesPdfUrl, setRulesPdfUrl] = useState(t.rulesPdfUrl || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  
  const [isExpanded, setIsExpanded] = useState(!t.isArchived);
  const [editingMatch, setEditingMatch] = useState(null); 

  // MODAL PARA ARCHIVAR Y ELEGIR CAMPEÓN
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [modalChampionId, setModalChampionId] = useState(t.championId || '');

  const champion = t.championId ? allTeams.find(tm => tm.id === t.championId) : null;

  const saveRules = async () => { await updateDoc(doc(db, getCollectionPath('tournaments'), t.id), { rulesText, rulesPdfUrl }); setShowRulesEdit(false); }

  const handleDeleteTournament = async () => {
     await deleteDoc(doc(db, getCollectionPath('tournaments'), t.id));
     if (matches) {
         const tMatches = matches.filter(m => m.tournamentId === t.id);
         for (const m of tMatches) {
             await deleteDoc(doc(db, getCollectionPath('matches'), m.id));
         }
     }
     setConfirmDelete(false);
  };

  const handleArchive = async () => {
     if (!modalChampionId) { alert("Por favor, selecciona un campeón antes de archivar."); return; }
     await updateDoc(doc(db, getCollectionPath('tournaments'), t.id), { 
        isArchived: true, 
        championId: modalChampionId 
     });
     setShowArchiveModal(false);
     setIsExpanded(false);
  };

  const handlePdfUpload = async (e) => {
     const file = e.target.files[0];
     if (!file) return;
     if (file.type !== 'application/pdf') { alert("Solo se permiten archivos PDF"); return; }
     
     if (file.size > 800 * 1024) {
         alert("El PDF es demasiado grande. Por favor sube un archivo menor a 800 KB o pega un enlace externo en la caja de abajo.");
         return;
     }

     setUploadingPdf(true);
     const reader = new FileReader();
     reader.onload = (event) => {
         setRulesPdfUrl(event.target.result);
         setUploadingPdf(false);
     };
     reader.onerror = () => {
         alert("Ocurrió un error al procesar el PDF.");
         setUploadingPdf(false);
     };
     reader.readAsDataURL(file);
  };

  const addZone = async () => {
    if(!newZoneName) return;
    const newZones = [...(t.zones||[]), { name: newZoneName, teams: [] }];
    await updateDoc(doc(db, getCollectionPath('tournaments'), t.id), { zones: newZones });
    setNewZoneName(''); setShowAddZone(false);
  };

  const generateBracket = async () => {
    const num = parseInt(numBracketTeams);
    let rounds = [];
    let currentMatches = num / 2;
    const roundNames = { 8: 'Octavos de Final', 4: 'Cuartos de Final', 2: 'Semifinal', 1: 'Final' };

    while (currentMatches >= 1) {
       const matches = Array.from({length: currentMatches}).map(() => ({ team1Id: '', team2Id: '', s1: '', s2: '', s3: '', score: '', winnerId: '' }));
       rounds.push({
          round: roundNames[currentMatches] || `Ronda de ${currentMatches * 2}`,
          matches: matches
       });
       currentMatches = currentMatches / 2;
    }
    
    await updateDoc(doc(db, getCollectionPath('tournaments'), t.id), { brackets: rounds });
    setShowAddBracket(false);
  };

  const handleEditMatchOpen = (bIdx, mIdx, match) => { setEditingMatch({ bIdx, mIdx, match }); }

  return (
    <div className={`bg-black/20 border rounded-2xl p-4 md:p-6 relative transition-all ${t.isArchived ? 'border-amber-500/30' : 'border-white/10'}`}>
      
      {/* MODAL PARA ARCHIVAR Y ELEGIR CAMPEON */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowArchiveModal(false)}></div>
           <div className="bg-slate-900 border border-amber-500/50 w-full max-w-md rounded-3xl shadow-2xl relative z-10 p-6 animate-in zoom-in-95">
              <h3 className="text-xl font-black mb-2 text-amber-400 flex items-center"><Trophy className="mr-2" /> Archivar Torneo</h3>
              <p className="text-sm opacity-80 mb-6">¿Estás seguro de finalizar este torneo? Quedará guardado en el historial. <br/><strong>Selecciona al equipo campeón</strong> para mostrarlo en la portada.</p>
              
              <div className="mb-6 relative z-50">
                 <label className="block text-xs font-bold opacity-60 mb-2 uppercase">Equipo Campeón</label>
                 <SearchableTeamSelect 
                    value={modalChampionId} 
                    options={allTeams} 
                    onChange={setModalChampionId} 
                    placeholder="Buscar equipo ganador..." 
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-4 font-bold outline-none focus:border-amber-500 text-white" 
                 />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                 <button onClick={() => setShowArchiveModal(false)} className="px-4 py-2 opacity-60 hover:opacity-100 font-bold text-sm text-white">Cancelar</button>
                 <button onClick={handleArchive} disabled={!modalChampionId} className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-2 rounded-xl font-black text-sm disabled:opacity-50 transition-colors shadow-lg">Confirmar y Archivar</button>
              </div>
           </div>
        </div>
      )}

      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isExpanded ? 'mb-6 border-b border-white/10 pb-4' : ''}`}>
        
        <div className="flex-1 flex flex-col items-start cursor-pointer w-full group" onClick={() => setIsExpanded(!isExpanded)}>
           <div className="flex items-center w-full">
               <div className="bg-black/40 p-1.5 rounded-full theme-primary-text border border-white/10 mr-3 shrink-0 transition-transform">
                   {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
               </div>
               <h3 className="text-2xl font-black flex items-center group-hover:theme-primary-text transition-colors">
                  {t.name}
                  {t.isArchived && <span className="ml-3 text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg uppercase tracking-widest hidden sm:inline">Archivado</span>}
               </h3>
           </div>
           
           <div className="ml-11"> 
               <ChampionBadge champion={champion} onClick={onTeamClick} />
           </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto mt-4 md:mt-0 pl-11 md:pl-0">
          {isExpanded && (
             <>
               <button onClick={(e) => { e.stopPropagation(); setShowRulesEdit(!showRulesEdit); }} className="bg-black/40 theme-primary-text font-bold px-4 py-2 rounded-lg text-sm border theme-primary-border">Reglas</button>
               <button onClick={(e) => { e.stopPropagation(); setShowAddZone(!showAddZone); }} className="bg-white/10 font-bold px-4 py-2 rounded-lg text-sm hover:bg-white/20">+ Zona</button>
               <button onClick={(e) => { e.stopPropagation(); setShowAddBracket(!showAddBracket); }} className="bg-white/10 theme-accent-text font-bold px-4 py-2 rounded-lg text-sm hover:bg-white/20">+ Eliminación</button>
             </>
          )}

          {!t.isArchived ? (
              <button onClick={(e) => { e.stopPropagation(); setShowArchiveModal(true); }} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-md">
                 Finalizar y Archivar
              </button>
          ) : (
              <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="bg-white/10 text-slate-300 border border-white/20 hover:bg-white/20 font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-md">
                 {isExpanded ? 'Cerrar Edición' : 'Editar'}
              </button>
          )}

          {confirmDelete ? (
            <div className="flex gap-2 items-center bg-red-500/20 px-2 rounded-lg border border-red-500/50">
               <span className="text-xs text-red-300 font-bold">¿Borrar todo?</span>
               <button onClick={handleDeleteTournament} className="bg-red-500 text-white font-bold px-2 py-1 rounded text-xs hover:bg-red-600">Sí</button>
               <button onClick={() => setConfirmDelete(false)} className="bg-black/60 font-bold px-2 py-1 rounded text-xs hover:bg-black/80">No</button>
            </div>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} className="bg-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/30 font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-md"><Trash2 size={16} /></button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
           
           {/* CAJA PARA EDITAR AL CAMPEÓN SI YA ESTÁ ARCHIVADO */}
           {t.isArchived && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-inner relative z-50">
                  <div>
                     <span className="text-amber-400 font-black text-sm uppercase flex items-center tracking-wider"><Trophy size={16} className="mr-2" /> Editar Campeón</span>
                     <p className="text-xs opacity-80 mt-1">Si te equivocaste, puedes modificar el equipo ganador que se muestra en la portada.</p>
                  </div>
                  <div className="w-full md:w-64 shrink-0">
                      <SearchableTeamSelect 
                         value={t.championId || ''} 
                         options={allTeams} 
                         onChange={async (val) => await updateDoc(doc(db, getCollectionPath('tournaments'), t.id), { championId: val })} 
                         placeholder="Seleccionar Campeón..." 
                         className="w-full bg-black/60 border border-amber-500/50 rounded-lg p-3 font-bold text-sm outline-none text-white focus:border-amber-400" 
                      />
                  </div>
              </div>
           )}

           {t.zones && t.zones.length > 0 && (
              <div className="flex flex-col md:flex-row justify-end items-end mb-6 gap-2 bg-black/40 p-3 rounded-xl border border-white/5 relative z-10">
                 <span className="text-xs font-bold opacity-60 mr-2 md:self-center">Exportar tablas (Zonas):</span>
                 <div className="flex gap-2">
                    <button onClick={async () => { const canvas = await exportZonesAsImage(t, allTeams, config, clubs); if(canvas) await handleShareCanvas(canvas, `Zonas-${t.name}.png`, 'download'); }} className="bg-white/10 hover:bg-white/20 font-bold px-3 py-2 rounded-lg text-xs flex items-center shadow-lg transition-colors"><Download size={14} className="mr-1" /> Zonas</button>
                    <button onClick={async () => { const canvas = await exportZonesAsImage(t, allTeams, config, clubs); if(canvas) await handleShareCanvas(canvas, `Zonas-${t.name}.png`, 'whatsapp'); }} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-3 py-2 rounded-lg text-xs flex items-center shadow-lg transition-colors"><MessageCircle size={14} className="mr-1" /> Enviar WhatsApp</button>
                 </div>
              </div>
           )}

           {showRulesEdit && (
             <div className="bg-black/40 p-4 rounded-xl border theme-primary-border mb-6 space-y-4">
               <h4 className="font-bold theme-primary-text text-sm uppercase">Editar Reglamento</h4>
               <textarea value={rulesText} onChange={e=>setRulesText(e.target.value)} placeholder="Escribe el reglamento aquí (Opcional)..." className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm outline-none h-24" />
               
               <div className="space-y-2 p-3 bg-black/40 rounded-lg border border-white/5">
                  <label className="text-xs opacity-60 font-bold block">Subir archivo PDF</label>
                  <div className="flex items-center gap-2">
                     <input type="file" accept=".pdf" onChange={handlePdfUpload} className="text-xs" disabled={uploadingPdf} />
                     {uploadingPdf && <span className="text-xs theme-primary-text animate-pulse font-bold">Cargando PDF...</span>}
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5">
                     <label className="text-xs opacity-60 font-bold block mb-1">O pega un enlace externo directamente (Drive, Dropbox, etc.)</label>
                     <input type="text" value={rulesPdfUrl} onChange={e=>setRulesPdfUrl(e.target.value)} placeholder="URL del PDF (Ej: https://...)" className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-sm outline-none" />
                  </div>
               </div>

               <div className="flex justify-end gap-2">
                  <button onClick={()=>setShowRulesEdit(false)} className="px-4 py-2 text-sm opacity-60 font-bold">Cancelar</button>
                  <button onClick={saveRules} className="px-4 py-2 text-sm theme-primary-bg text-black font-black rounded-lg">Guardar</button>
               </div>
             </div>
           )}

           {showAddZone && (
             <div className="flex gap-2 mb-6 bg-black/40 p-3 rounded-xl border border-white/10">
               <input value={newZoneName} onChange={e=>setNewZoneName(e.target.value)} placeholder="Nombre de Zona (Ej: Zona A)" className="flex-1 bg-transparent px-3 outline-none font-bold" />
               <button onClick={addZone} className="theme-primary-bg text-black font-bold px-4 py-2 rounded-lg text-sm">Añadir</button>
             </div>
           )}

           {showAddBracket && (
             <div className="flex flex-col md:flex-row gap-4 mb-6 bg-black/40 p-4 rounded-xl border theme-accent-border md:items-center" style={{borderColor: config.accentColor}}>
               <div className="flex-1">
                  <span className="text-sm font-bold theme-accent-text block mb-1">Total de Equipos (Fase Eliminación):</span>
                  <p className="text-[10px] opacity-60">Si hay ej. 12 equipos, elige 16 y deja celdas vacías (pasan directo).</p>
               </div>
               <select value={numBracketTeams} onChange={e=>setNumBracketTeams(e.target.value)} className="bg-black/40 font-bold p-3 rounded-lg outline-none border border-white/10">
                 <option value="16">16 Equipos (Inicia en Octavos)</option>
                 <option value="8">8 Equipos (Inicia en Cuartos)</option>
                 <option value="4">4 Equipos (Inicia en Semis)</option>
                 <option value="2">2 Equipos (Final Directa)</option>
               </select>
               <button onClick={generateBracket} className="theme-accent-bg text-black font-black px-6 py-3 rounded-lg text-sm transition-colors hover:opacity-80">Generar Árbol Completo</button>
             </div>
           )}

           <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
             {(t.zones||[]).map((z, zIdx) => (
               <AdminTournamentZone key={zIdx} tId={t.id} tZones={t.zones} zone={z} zIdx={zIdx} allTeams={allTeams} db={db} getCollectionPath={getCollectionPath} />
             ))}
           </div>

           <SymmetricBracket tournament={t} allTeams={allTeams} clubs={clubs} isAdmin={true} onEditMatch={handleEditMatchOpen} config={config} handleShareCanvas={handleShareCanvas} />

           {editingMatch && (
              <AdminMatchEditModal 
                 m={editingMatch.match} mIdx={editingMatch.mIdx} bIdx={editingMatch.bIdx} 
                 t={t} allTeams={allTeams} db={db} getCollectionPath={getCollectionPath} 
                 onClose={() => setEditingMatch(null)} config={config}
              />
           )}
        </div>
      )}
    </div>
  );
}

function AdminMatchEditModal({ m, mIdx, bIdx, t, allTeams, db, getCollectionPath, onClose, config }) {
   const [localM, setLocalM] = useState({ ...m });

   const handleSave = async () => {
      const nb = [...t.brackets];
      nb[bIdx].matches[mIdx] = { ...localM };
      await updateDoc(doc(db, getCollectionPath('tournaments'), t.id), { brackets: nb });
      
      const matchId = `bracket_${t.id}_${bIdx}_${mIdx}`;
      if (localM.winnerId) {
          await setDoc(doc(db, getCollectionPath('matches'), matchId), {
              tournamentId: t.id,
              tournamentName: t.name,
              round: nb[bIdx].round,
              team1Id: localM.team1Id,
              team2Id: localM.team2Id,
              s1: localM.s1, s2: localM.s2, s3: localM.s3, score: localM.score,
              winnerId: localM.winnerId,
              status: 'completed',
              createdAt: Date.now()
          });
      } else {
          await deleteDoc(doc(db, getCollectionPath('matches'), matchId));
      }

      onClose();
   }

   const handleClear = async () => {
      const nb = [...t.brackets];
      nb[bIdx].matches[mIdx] = { team1Id: '', team2Id: '', s1: '', s2: '', s3: '', score: '', winnerId: '' };
      await updateDoc(doc(db, getCollectionPath('tournaments'), t.id), { brackets: nb });
      
      const matchId = `bracket_${t.id}_${bIdx}_${mIdx}`;
      await deleteDoc(doc(db, getCollectionPath('matches'), matchId));

      onClose();
   }

   const handleScoreChange = (e, field, nextId) => {
      const inputVal = e.target.value;
      const currentVal = localM[field] || '';
      if (inputVal.length < currentVal.length) { setLocalM({...localM, [field]: inputVal}); return; }
      
      const raw = inputVal.replace(new RegExp('[^0-9]', 'g'), '');
      if (raw.length === 2) {
         setLocalM({...localM, [field]: `${raw[0]}-${raw[1]}`});
         if (nextId) { const nextInput = document.getElementById(nextId); if (nextInput) nextInput.focus(); }
      } else if (raw.length > 2) {
         setLocalM({...localM, [field]: `${raw[0]}-${raw[1]}`});
      } else {
         setLocalM({...localM, [field]: raw});
      }
   };

   return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
         <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
         <div className="theme-bg-card border theme-primary-border w-full max-w-md rounded-3xl shadow-2xl relative z-10 p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black mb-6 uppercase flex items-center"><Edit3 className="mr-2 theme-primary-text" /> Editar Partido</h3>
            
            <div className="space-y-4 mb-6 relative z-50">
               <div className="p-4 bg-black/40 rounded-xl border border-white/5 relative">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2">
                     <input type="radio" name="modalWinner" checked={localM.winnerId === localM.team1Id && localM.team1Id !== ''} onChange={() => setLocalM({...localM, winnerId: localM.team1Id})} className="w-5 h-5 accent-lime-500 cursor-pointer" />
                  </div>
                  <SearchableTeamSelect value={localM.team1Id || ''} options={allTeams} onChange={(val) => setLocalM({...localM, team1Id: val})} placeholder="Buscar Equipo 1..." className={`w-full bg-transparent text-sm outline-none font-bold cursor-pointer ${localM.winnerId === localM.team1Id ? 'theme-primary-text' : ''}`} />
               </div>
               
               <div className="text-center text-xs font-black opacity-50 italic">VS</div>
               
               <div className="p-4 bg-black/40 rounded-xl border border-white/5 relative">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2">
                     <input type="radio" name="modalWinner" checked={localM.winnerId === localM.team2Id && localM.team2Id !== ''} onChange={() => setLocalM({...localM, winnerId: localM.team2Id})} className="w-5 h-5 accent-lime-500 cursor-pointer" />
                  </div>
                  <SearchableTeamSelect value={localM.team2Id || ''} options={allTeams} onChange={(val) => setLocalM({...localM, team2Id: val})} placeholder="Buscar Equipo 2..." className={`w-full bg-transparent text-sm outline-none font-bold cursor-pointer ${localM.winnerId === localM.team2Id ? 'theme-primary-text' : ''}`} />
               </div>
            </div>

            <div className="flex gap-2 items-center justify-center bg-black/40 p-4 rounded-xl border border-white/5 mb-8">
               <span className="text-xs font-bold opacity-50 uppercase mr-2">Sets:</span>
               <input id="modal-s1" value={localM.s1 || ''} onChange={e=>handleScoreChange(e, 's1', 'modal-s2')} className="w-14 bg-black/60 font-black text-center text-sm p-2.5 rounded-lg outline-none focus:theme-primary-border theme-primary-text" placeholder="1er" />
               <input id="modal-s2" value={localM.s2 || ''} onChange={e=>handleScoreChange(e, 's2', 'modal-s3')} className="w-14 bg-black/60 font-black text-center text-sm p-2.5 rounded-lg outline-none focus:theme-primary-border theme-primary-text" placeholder="2do" />
               <input id="modal-s3" value={localM.s3 || ''} onChange={e=>handleScoreChange(e, 's3', null)} className="w-14 bg-black/60 font-black text-center text-sm p-2.5 rounded-lg outline-none focus:theme-primary-border theme-primary-text" placeholder="3er" />
            </div>

            <div className="flex justify-between gap-3">
               <button onClick={handleClear} className="px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-bold transition-colors">Limpiar Datos</button>
               <div className="flex gap-2">
                  <button onClick={onClose} className="px-4 py-3 opacity-60 hover:opacity-100 rounded-xl text-sm font-bold transition-colors">Cancelar</button>
                  <button onClick={handleSave} className="theme-primary-bg text-black px-6 py-3 rounded-xl text-sm font-black transition-colors hover:opacity-80">Guardar Partido</button>
               </div>
            </div>
         </div>
      </div>
   )
}


function AdminTournamentZone({ tId, tZones, zone, zIdx, allTeams, db, getCollectionPath }) {
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const addTeam = async () => {
    if(!selectedTeamId) return;
    const team = allTeams.find(t => t.id === selectedTeamId);
    if(!team) return;
    const updatedZones = [...tZones];
    updatedZones[zIdx].teams.push({ teamId: team.id, name: team.name, pts: 0, pj: 0, pg: 0, sf: 0, sc: 0 });
    await updateDoc(doc(db, getCollectionPath('tournaments'), tId), { zones: updatedZones });
    setSelectedTeamId(''); setShowAddTeam(false);
  };

  const updateTeamStats = async (tIdx, field, val) => {
    const updatedZones = [...tZones];
    updatedZones[zIdx].teams[tIdx][field] = parseInt(val) || 0;
    await updateDoc(doc(db, getCollectionPath('tournaments'), tId), { zones: updatedZones });
  };
  
  const removeTeam = async (tIdx) => {
    const updatedZones = [...tZones];
    updatedZones[zIdx].teams.splice(tIdx, 1);
    await updateDoc(doc(db, getCollectionPath('tournaments'), tId), { zones: updatedZones });
  };

  return (
    <div className="bg-black/20 rounded-xl border border-white/5 p-4 relative overflow-x-auto">
      <button onClick={()=>{const nz=[...tZones]; nz.splice(zIdx,1); updateDoc(doc(db,getCollectionPath('tournaments'),tId),{zones:nz})}} className="absolute top-4 right-4 opacity-50 hover:text-red-400"><Trash2 size={16} /></button>
      <div className="flex items-center mb-4 gap-3">
        <h4 className="font-bold theme-primary-text text-lg">{zone.name}</h4> 
        <button onClick={()=>setShowAddTeam(!showAddTeam)} className="text-xs border theme-primary-border theme-primary-text px-2 py-1 rounded hover:opacity-80">+ Fila</button>
      </div>

      {showAddTeam && (
        <div className="flex gap-2 mb-4 bg-black/40 p-2 rounded border border-white/10 min-w-max items-center relative z-50">
          <SearchableTeamSelect value={selectedTeamId} options={allTeams} onChange={setSelectedTeamId} placeholder="Buscar Equipo..." className="flex-1 bg-black/60 text-xs outline-none border border-white/10 rounded p-2 font-bold text-white" />
          <button onClick={addTeam} className="theme-primary-bg text-black font-bold px-3 py-2 rounded text-xs ml-2 hover:opacity-80">OK</button>
        </div>
      )}

      <div className="min-w-[450px]">
        <div className="flex gap-1 text-[10px] font-black opacity-50 px-2 mb-1">
           <div className="w-1/3 min-w-[120px]">EQUIPO</div>
           <div className="flex-1 flex justify-end gap-1">
             <div className="w-10 text-center theme-primary-text">PTS</div>
             <div className="w-10 text-center">PJ</div>
             <div className="w-10 text-center">PG</div>
             <div className="w-10 text-center">SF</div>
             <div className="w-10 text-center">SC</div>
             <div className="w-4"></div>
           </div>
        </div>

        <div className="space-y-1">
          {zone.teams.map((team, tIdx) => (
            <div key={tIdx} className="flex gap-1 text-xs items-center bg-white/5 p-2 rounded group">
              <span className="font-bold w-1/3 min-w-[120px] truncate text-[11px]">{team.name}</span>
              <div className="flex-1 flex justify-end gap-1">
                <input type="number" value={team.pts} onChange={e=>updateTeamStats(tIdx, 'pts', e.target.value)} className="w-10 bg-black/60 text-center theme-primary-text font-bold rounded p-1 outline-none"/>
                <input type="number" value={team.pj} onChange={e=>updateTeamStats(tIdx, 'pj', e.target.value)} className="w-10 bg-black/60 text-center rounded p-1 outline-none"/>
                <input type="number" value={team.pg} onChange={e=>updateTeamStats(tIdx, 'pg', e.target.value)} className="w-10 bg-black/60 text-center rounded p-1 outline-none"/>
                <input type="number" value={team.sf || 0} onChange={e=>updateTeamStats(tIdx, 'sf', e.target.value)} className="w-10 bg-black/60 text-center rounded p-1 outline-none"/>
                <input type="number" value={team.sc || 0} onChange={e=>updateTeamStats(tIdx, 'sc', e.target.value)} className="w-10 bg-black/60 text-center rounded p-1 outline-none"/>
                <div className="w-4 flex justify-center items-center">
                  <button onClick={()=>removeTeam(tIdx)} className="opacity-50 hover:text-red-400 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AdminNovedades({ news, db, getCollectionPath }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('info');

  const handleCreate = async (e) => {
    e.preventDefault();
    if(!title || !content) return;
    await setDoc(doc(collection(db, getCollectionPath('news'))), { title, content, type, createdAt: Date.now() });
    setTitle(''); setContent(''); setType('info');
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="bg-black/20 p-6 rounded-2xl border border-white/10 space-y-4">
        <h3 className="text-xl font-black uppercase tracking-wider mb-4 flex items-center theme-font-secondary"><Bell className="mr-2 theme-primary-text" /> Publicar Novedad</h3>
        <input required type="text" placeholder="Título (Ej: Nuevo Reglamento)" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 font-bold outline-none focus:theme-primary-border" />
        <textarea required placeholder="Contenido de la publicación..." value={content} onChange={e => setContent(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border h-24" />
        <div className="flex gap-4">
          <select value={type} onChange={e => setType(e.target.value)} className="w-1/3 bg-black/40 border border-white/10 rounded-xl p-3 outline-none font-bold">
            <option value="info">General / Informativo</option>
            <option value="alert">Alerta / Importante</option>
          </select>
          <button type="submit" className="flex-1 theme-primary-bg text-black font-black rounded-xl p-3 uppercase tracking-widest transition-colors hover:opacity-80">Publicar en Inicio</button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {news.map(n => (
           <div key={n.id} className="p-4 rounded-xl border border-white/10 bg-black/40 relative group">
              <div className="flex items-center gap-2 mb-2">
                 {n.type === 'alert' ? <AlertTriangle size={16} className="text-red-400" /> : <Bell size={16} className="theme-primary-text" />}
                 <h4 className="font-bold text-sm">{n.title}</h4>
              </div>
              <p className="opacity-60 text-xs line-clamp-2">{n.content}</p>
              <button onClick={() => deleteDoc(doc(db, getCollectionPath('news'), n.id))} className="absolute top-2 right-2 opacity-50 hover:text-red-400 p-1 group-hover:opacity-100"><Trash2 size={16} /></button>
           </div>
        ))}
      </div>
    </div>
  )
}

function SuperAdminPanel({ config, db, getCollectionPath }) {
   const [form, setForm] = useState(config);
   const [msg, setMsg] = useState('');
 
   const handleSave = async () => {
     await setDoc(doc(db, getCollectionPath('settings'), 'main'), form);
     setMsg("Permisos de Super Admin guardados correctamente."); setTimeout(()=>setMsg(''), 3000);
   };
 
   const ToggleFeature = ({ label, field, desc }) => (
      <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5 hover:theme-primary-border transition-colors">
         <div>
            <span className="font-bold text-sm block">{label}</span>
            {desc && <span className="text-[10px] opacity-60 block">{desc}</span>}
         </div>
         <button onClick={() => setForm({...form, [field]: form[field] === false ? true : false})} className={`${form[field] !== false ? 'text-lime-400' : 'text-slate-500'} transition-colors`}>
            {form[field] !== false ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
         </button>
      </div>
   );
 
   return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4">
         
         <div className="bg-black/20 p-8 rounded-3xl border theme-primary-border relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Lock size={200} /></div>
            <h3 className="text-2xl font-black mb-2 uppercase tracking-wider flex items-center theme-font-secondary"><Lock className="mr-3 theme-primary-text" /> Súper Panel Maestro</h3>
            <p className="opacity-60 text-sm mb-8 relative z-10">Activa o desactiva qué secciones puede ver y editar el "Admin" en su propio panel de Configuración, y controla funciones públicas clave.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
               <ToggleFeature label="Agregar Fondo de Pantalla" desc="Habilita edición de fondo al Admin" field="feature_background" />
               <ToggleFeature label="Mensaje de Bienvenida Editable" desc="Habilita edición de textos de inicio" field="feature_welcome" />
               <ToggleFeature label="Identidad de la Página" desc="Logo y Nombre visible" field="feature_identity" />
               <ToggleFeature label="Personalización de Colores" desc="Habilita selector de colores al Admin" field="feature_colors" />
               <ToggleFeature label="Estadísticas y WinRate Público" desc="Muestra datos históricos a los usuarios" field="feature_stats" />
               <ToggleFeature label="Gestión de Logros y Medallas" desc="Permite dar medallas a jugadores" field="feature_medals" />
               <ToggleFeature label="Módulo de Novedades" desc="Habilita publicación de noticias" field="feature_news" />
               <ToggleFeature label="Gestión de Clubes y Sponsors" desc="Módulo de sedes para reservar turnos y sponsors en portada" field="feature_clubs" />
               <ToggleFeature label="Tamaño de Tarjetas de Resultado" desc="Habilita selector de tamaño al Admin" field="feature_cardSize" />
               <ToggleFeature label="Tipografía / Fuentes Web" desc="Habilita selección de fuentes" field="feature_fonts" />
            </div>

            <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
               <h4 className="text-sm font-black opacity-60 uppercase mb-4">Gestión de Accesos (PINs)</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-xs font-bold opacity-60 mb-2">PIN Administrador Normal</label>
                     <input type="text" value={form.adminPin} onChange={e=>setForm({...form, adminPin: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border font-bold" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold opacity-60 mb-2">PIN Súper Admin (Maestro)</label>
                     <input type="text" value={form.superAdminPin} onChange={e=>setForm({...form, superAdminPin: e.target.value})} className="w-full bg-black/60 border theme-accent-border rounded-xl p-3 outline-none font-bold theme-accent-text" />
                  </div>
               </div>
            </div>
         </div>
         
         <button onClick={handleSave} className="w-full theme-primary-bg text-black font-black rounded-xl p-4 uppercase tracking-widest transition-colors shadow-lg hover:opacity-80">Guardar Cambios Maestros</button>
         {msg && <p className="theme-primary-text text-center font-bold text-sm bg-black/20 py-3 rounded-lg border theme-primary-border">{msg}</p>}
      </div>
   )
}

function AdminConfig({ config, db, getCollectionPath }) {
  const [form, setForm] = useState(config);
  const [msg, setMsg] = useState('');
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [loadingBg, setLoadingBg] = useState(false);
  const [loadingExportBg, setLoadingExportBg] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, getCollectionPath('settings'), 'main'), form);
    setMsg("Configuración guardada exitosamente."); setTimeout(()=>setMsg(''), 3000);
  };

  const handleLogoUpload = (e) => {
     const file = e.target.files[0];
     if (file) { setLoadingLogo(true); resizeImage(file, (data) => { setForm({...form, logoUrl: data}); setLoadingLogo(false); }, 300, 300, 0.9); }
  };

  const handleBgUpload = (e) => {
     const file = e.target.files[0];
     if (file) { setLoadingBg(true); resizeImage(file, (data) => { setForm({...form, bgUrl: data}); setLoadingBg(false); }, 1920, 1080, 0.8); }
  };

  const handleExportBgUpload = (e) => {
     const file = e.target.files[0];
     if (file) { setLoadingExportBg(true); resizeImage(file, (data) => { setForm({...form, exportBgUrl: data}); setLoadingExportBg(false); }, 1920, 1080, 0.9); }
  };

  const fontOptions = [
    { value: 'system-ui, sans-serif', label: 'Predeterminada (Sistema)' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'Tahoma, sans-serif', label: 'Tahoma' },
    { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet MS' },
    { value: 'Impact, sans-serif', label: 'Impact (Gruesa)' },
    { value: 'Georgia, serif', label: 'Georgia (Elegante)' },
    { value: '"Times New Roman", serif', label: 'Times New Roman' },
    { value: '"Courier New", monospace', label: 'Courier New (Digital)' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4">
      
      {/* SECCIÓN BIENVENIDA */}
      {config.feature_welcome !== false && (
      <div className="bg-black/20 p-8 rounded-3xl border border-white/10">
         <h3 className="text-xl font-black mb-6 uppercase tracking-wider flex items-center theme-font-secondary"><MessageCircle className="mr-2 theme-primary-text" /> Mensaje de Bienvenida</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="md:col-span-2 flex items-center gap-3 mb-2 pb-4 border-b border-white/10">
              <input type="checkbox" checked={form.showWelcomeMessage !== false} onChange={e=>setForm({...form, showWelcomeMessage: e.target.checked})} className="w-5 h-5 accent-lime-500 cursor-pointer" />
              <span className="text-sm font-bold block">Habilitar Mensaje de Bienvenida en la pestaña Inicio</span>
            </div>

            {form.showWelcomeMessage !== false && (
              <>
                <div className="space-y-3 md:col-span-2">
                  <label className="block text-sm font-bold opacity-60">Título Principal</label>
                  <input type="text" value={form.welcomeTitle || ''} onChange={e=>setForm({...form, welcomeTitle: e.target.value})} placeholder="Ej: ¡Bienvenido a La Super Liga!" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border font-bold text-lg theme-font-secondary" />
                  <div className="flex flex-col sm:flex-row gap-4">
                     <div className="flex items-center gap-3 sm:w-1/2">
                        <input type="color" value={form.welcomeTitleColor || '#ffffff'} onChange={e=>setForm({...form, welcomeTitleColor: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl shrink-0" />
                        <span className="text-xs font-bold opacity-60">Color del Título</span>
                     </div>
                     <select value={form.welcomeTitleSize || 'text-4xl md:text-5xl'} onChange={e=>setForm({...form, welcomeTitleSize: e.target.value})} className="sm:w-1/2 bg-black/40 border border-white/10 rounded-lg p-2 text-xs outline-none font-bold focus:theme-primary-border">
                        <option value="text-2xl md:text-3xl">Tamaño: Pequeño</option>
                        <option value="text-3xl md:text-4xl">Tamaño: Mediano</option>
                        <option value="text-4xl md:text-5xl">Tamaño: Grande</option>
                        <option value="text-5xl md:text-6xl">Tamaño: Extra Grande</option>
                     </select>
                  </div>
                </div>

                <div className="space-y-3 md:col-span-2 mt-4 pt-4 border-t border-white/10">
                  <label className="block text-sm font-bold opacity-60">Subtítulo</label>
                  <input type="text" value={form.welcomeSubtitle || ''} onChange={e=>setForm({...form, welcomeSubtitle: e.target.value})} placeholder="Ej: La mejor liga de General Roca" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border font-bold" />
                  <div className="flex flex-col sm:flex-row gap-4">
                     <div className="flex items-center gap-3 sm:w-1/2">
                        <input type="color" value={form.welcomeSubtitleColor || '#a3e635'} onChange={e=>setForm({...form, welcomeSubtitleColor: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl shrink-0" />
                        <span className="text-xs font-bold opacity-60">Color del Subtítulo</span>
                     </div>
                     <select value={form.welcomeSubtitleSize || 'text-lg md:text-xl'} onChange={e=>setForm({...form, welcomeSubtitleSize: e.target.value})} className="sm:w-1/2 bg-black/40 border border-white/10 rounded-lg p-2 text-xs outline-none font-bold focus:theme-primary-border">
                        <option value="text-base md:text-lg">Tamaño: Pequeño</option>
                        <option value="text-lg md:text-xl">Tamaño: Mediano</option>
                        <option value="text-xl md:text-2xl">Tamaño: Grande</option>
                     </select>
                  </div>
                </div>
              </>
            )}
         </div>
      </div>
      )}

      {/* SECCIÓN IDENTIDAD */}
      {config.feature_identity !== false && (
      <div className="bg-black/20 p-8 rounded-3xl border border-white/10">
         <h3 className="text-xl font-black mb-6 uppercase tracking-wider flex items-center theme-font-secondary"><ImageIcon className="mr-2 theme-primary-text" /> Identidad de la Página</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            
            <div className="space-y-3">
               <label className="block text-sm font-bold opacity-60">Logo de la Página (Soporta PNG sin fondo)</label>
               <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-black/40 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden relative">
                     {loadingLogo ? <span className="text-[10px] theme-primary-text animate-pulse">Cargando...</span> : form.logoUrl ? <img src={form.logoUrl} alt="Logo" className="w-full h-full object-contain"/> : <Camera className="opacity-50" />}
                     <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                  </div>
                  <div className="flex-1">
                     <p className="text-xs opacity-60 mb-2">Toca el recuadro para subir tu logo, o pega la URL.</p>
                     <input type="text" value={form.logoUrl} onChange={e=>setForm({...form, logoUrl: e.target.value})} placeholder="https://..." className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs outline-none focus:theme-primary-border mb-2" />
                     <select value={form.logoSize} onChange={e=>setForm({...form, logoSize: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs outline-none font-bold focus:theme-primary-border">
                        <option value="h-8 w-8 md:h-10 md:w-10">Tamaño: Pequeño</option>
                        <option value="h-12 w-12 md:h-14 md:w-14">Tamaño: Mediano</option>
                        <option value="h-16 w-16 md:h-20 md:w-20">Tamaño: Grande</option>
                        <option value="h-20 w-20 md:h-28 md:w-28">Tamaño: Extra Grande</option>
                     </select>
                  </div>
               </div>
            </div>

            <div className="space-y-3">
               <label className="block text-sm font-bold opacity-60">Nombre visible de la Página</label>
               <input type="text" value={form.pageName} onChange={e=>setForm({...form, pageName: e.target.value})} placeholder="Ej: Padel World, La Super Liga..." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border font-bold theme-font-secondary" />
               <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                     <input type="checkbox" checked={form.showPageName} onChange={e=>setForm({...form, showPageName: e.target.checked})} className="w-4 h-4 accent-lime-500" />
                     <span className="text-xs font-bold opacity-80">Mostrar Nombre</span>
                  </div>
                  <select value={form.pageNameSize} onChange={e=>setForm({...form, pageNameSize: e.target.value})} className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-xs outline-none font-bold">
                     <option value="text-xl">Tamaño: Pequeño</option>
                     <option value="text-2xl">Tamaño: Mediano</option>
                     <option value="text-3xl">Tamaño: Grande</option>
                     <option value="text-4xl">Tamaño: Extra Grande</option>
                  </select>
               </div>
            </div>
         </div>
      </div>
      )}

      {/* SECCIÓN CARACTERISTICAS DE UI (FUENTES Y TAMAÑOS) */}
      {(config.feature_fonts !== false || config.feature_cardSize !== false) && (
      <div className="bg-black/20 p-8 rounded-3xl border border-white/10">
         <h3 className="text-xl font-black mb-6 uppercase tracking-wider flex items-center theme-font-secondary"><LayoutList className="mr-2 theme-primary-text" /> Tipografía y Estructura</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {config.feature_fonts !== false && (
              <>
                <div className="space-y-3">
                   <label className="block text-sm font-bold opacity-60">Tipografía Primaria (Textos Generales)</label>
                   <select value={form.fontPrimary || 'system-ui, sans-serif'} onChange={e=>setForm({...form, fontPrimary: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none font-bold">
                      {fontOptions.map(o => <option key={`p-${o.value}`} value={o.value}>{o.label}</option>)}
                   </select>
                </div>
                <div className="space-y-3">
                   <label className="block text-sm font-bold opacity-60">Tipografía Secundaria (Títulos y Números)</label>
                   <select value={form.fontSecondary || 'system-ui, sans-serif'} onChange={e=>setForm({...form, fontSecondary: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none font-bold">
                      {fontOptions.map(o => <option key={`s-${o.value}`} value={o.value}>{o.label}</option>)}
                   </select>
                </div>
              </>
            )}

            {config.feature_cardSize !== false && (
                <div className="space-y-3 md:col-span-2 pt-4 border-t border-white/10">
                   <label className="block text-sm font-bold opacity-60">Tamaño de las Tarjetas de Resultados</label>
                   <select value={form.resultCardSize || 'md'} onChange={e=>setForm({...form, resultCardSize: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none font-bold">
                      <option value="sm">Pequeño (Diseño compacto)</option>
                      <option value="md">Mediano (Recomendado)</option>
                      <option value="lg">Grande (Textos amplios y mayor espaciado)</option>
                   </select>
                </div>
            )}
         </div>
      </div>
      )}

      {/* SECCIÓN COLORES Y FONDO */}
      {(config.feature_colors !== false || config.feature_background !== false) && (
      <div className="bg-black/20 p-8 rounded-3xl border border-white/10">
         <h3 className="text-xl font-black mb-6 uppercase tracking-wider flex items-center theme-font-secondary"><Camera className="mr-2 theme-primary-text" /> Colores y Fondo</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            
            {config.feature_background !== false && (
            <div className="space-y-3 lg:col-span-3">
               <label className="block text-sm font-bold opacity-60">Imagen de Fondo de Pantalla (Sitio Web)</label>
               <div className="flex items-center gap-4">
                  <div className="w-32 h-20 bg-black/40 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden relative">
                     {loadingBg ? <span className="text-[10px] theme-primary-text animate-pulse">Cargando...</span> : form.bgUrl ? <img src={form.bgUrl} alt="Fondo" className="w-full h-full object-cover opacity-80"/> : <ImageIcon className="opacity-50" />}
                     <input type="file" accept="image/*" onChange={handleBgUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                  </div>
                  <div className="flex-1 space-y-2">
                     <p className="text-xs opacity-60 mb-2">Una imagen oscura hará resaltar los colores.</p>
                     <input type="text" value={form.bgUrl || ''} onChange={e=>setForm({...form, bgUrl: e.target.value})} placeholder="https://..." className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs outline-none focus:theme-primary-border" />
                     <div className="flex items-center gap-2 mt-2">
                        <input type="checkbox" checked={form.exportWithBg !== false} onChange={e=>setForm({...form, exportWithBg: e.target.checked})} className="w-4 h-4 accent-lime-500" />
                        <span className="text-xs font-bold opacity-80">Si no se elige un fondo específico para exportables (ver abajo), usar este.</span>
                     </div>
                  </div>
               </div>
            </div>
            )}

            {config.feature_colors !== false && (
            <>
               <div>
                  <label className="block text-sm font-bold opacity-60 mb-2">Color Principal</label>
                  <div className="flex items-center gap-3">
                     <input type="color" value={form.primaryColor || '#a3e635'} onChange={e=>setForm({...form, primaryColor: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl shrink-0" />
                     <input type="text" value={form.primaryColor || '#a3e635'} onChange={e=>setForm({...form, primaryColor: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border" />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-bold opacity-60 mb-2">Color del Título de la Nav</label>
                  <div className="flex items-center gap-3">
                     <input type="color" value={form.titleColor || '#a3e635'} onChange={e=>setForm({...form, titleColor: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl shrink-0" />
                     <input type="text" value={form.titleColor || '#a3e635'} onChange={e=>setForm({...form, titleColor: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border" />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-bold opacity-60 mb-2">Color Secundario (Acento)</label>
                  <div className="flex items-center gap-3">
                     <input type="color" value={form.accentColor || '#fbbf24'} onChange={e=>setForm({...form, accentColor: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl shrink-0" />
                     <input type="text" value={form.accentColor || '#fbbf24'} onChange={e=>setForm({...form, accentColor: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border" />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-bold opacity-60 mb-2">Color de Texto Base</label>
                  <div className="flex items-center gap-3">
                     <input type="color" value={form.textColor || '#f8fafc'} onChange={e=>setForm({...form, textColor: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl shrink-0" />
                     <input type="text" value={form.textColor || '#f8fafc'} onChange={e=>setForm({...form, textColor: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border" />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-bold opacity-60 mb-2">Color de Fondo General (Fallback)</label>
                  <div className="flex flex-col gap-2">
                     <div className="flex items-center gap-3">
                        <input type="color" value={form.bgColor?.startsWith('#') ? form.bgColor : '#0f172a'} onChange={e=>setForm({...form, bgColor: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl shrink-0" />
                        <input type="text" value={form.bgColor || '#0f172a'} onChange={e=>setForm({...form, bgColor: e.target.value})} placeholder="Ej: rgba(2,6,23,0.9) o #020617" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border text-sm" />
                     </div>
                     <p className="text-[10px] opacity-60 mt-1 leading-tight">Puedes usar formato <strong>rgba(r,g,b,a)</strong> en la caja de texto para añadir opacidad. Ejemplo: <code>rgba(0, 0, 0, 0.8)</code></p>
                  </div>
               </div>

               <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-bold opacity-60 mb-2">Color de Tarjetas</label>
                  <input type="text" value={form.cardColor || ''} onChange={e=>setForm({...form, cardColor: e.target.value})} placeholder="Ej: rgba(15, 23, 42, 0.7) o #0f172a" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:theme-primary-border text-sm" />
                  <p className="text-[10px] opacity-60 mt-1">Usa formato rgba(...) si deseas transparencia en los contenedores.</p>
               </div>
            </>
            )}

            {/* NUEVA SECCIÓN DE EXPORTABLES */}
            <div className="lg:col-span-3 mt-6 pt-6 border-t border-white/10 space-y-6">
                <div>
                   <h4 className="font-black text-lg theme-accent-text mb-2 flex items-center"><Download size={20} className="mr-2" /> Personalización de Carteles (Descargas / WhatsApp)</h4>
                   <p className="text-xs opacity-60">Estos ajustes solo aplicarán para las imágenes que se exporten (Resultados, Llaves y Zonas).</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 p-6 rounded-2xl border border-white/5">
                   
                   <div className="space-y-3 md:col-span-2 lg:col-span-1">
                      <label className="block text-sm font-bold opacity-80">Fondo Específico para Carteles (Opcional)</label>
                      <div className="flex items-center gap-4">
                         <div className="w-32 h-20 bg-black/60 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden relative">
                            {loadingExportBg ? <span className="text-[10px] theme-primary-text animate-pulse">Cargando...</span> : form.exportBgUrl ? <img src={form.exportBgUrl} alt="ExportBg" className="w-full h-full object-cover opacity-80"/> : <ImageIcon className="opacity-50" />}
                            <input type="file" accept="image/*" onChange={handleExportBgUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                         </div>
                         <div className="flex-1 space-y-2">
                            <input type="text" value={form.exportBgUrl || ''} onChange={e=>setForm({...form, exportBgUrl: e.target.value})} placeholder="URL o subir imagen..." className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs outline-none focus:theme-primary-border" />
                            {form.exportBgUrl && <button onClick={()=>setForm({...form, exportBgUrl: ''})} className="text-xs text-red-400 font-bold hover:text-red-300">Borrar imagen específica</button>}
                         </div>
                      </div>
                      <p className="text-[10px] opacity-60 mt-1">Si subes una imagen aquí, tendrá prioridad sobre el fondo del sitio al exportar.</p>
                   </div>

                   <div className="space-y-3">
                      <label className="block text-sm font-bold opacity-80">Color Sólido / Overlay para Carteles</label>
                      <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-3">
                            <input type="color" value={form.exportBgColor?.startsWith('#') ? form.exportBgColor : '#0f172a'} onChange={e=>setForm({...form, exportBgColor: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl shrink-0" />
                            <input type="text" value={form.exportBgColor || ''} onChange={e=>setForm({...form, exportBgColor: e.target.value})} placeholder="Dejar vacío para usar el general..." className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs outline-none focus:theme-primary-border" />
                         </div>
                         <p className="text-[10px] opacity-60 mt-1 leading-tight">Se usará como color base en caso de no haber imagen, o como "tinte" sobre la imagen de fondo para que el texto sea legible.</p>
                      </div>
                   </div>

                   <div className="md:col-span-2 pt-4 border-t border-white/10">
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                         <input type="checkbox" checked={form.exportShowSponsors} onChange={e=>setForm({...form, exportShowSponsors: e.target.checked})} className="w-6 h-6 accent-lime-500 cursor-pointer" />
                         <span className="font-bold text-sm">Añadir Logos de Sponsors Oficiales al pie de las imágenes generadas.</span>
                      </label>
                   </div>
                </div>
            </div>

         </div>
      </div>
      )}

      <button onClick={handleSave} className="w-full theme-primary-bg text-black font-black rounded-xl p-4 uppercase tracking-widest transition-colors shadow-lg hover:opacity-80">Guardar Opciones de Configuración</button>
      {msg && <p className="theme-primary-text text-center font-bold text-sm bg-black/20 py-3 rounded-lg border theme-primary-border">{msg}</p>}
    </div>
  )
}

function NavButton({ icon, label, active, onClick, config, className="" }) {
  return (
    <button onClick={onClick} className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold transition-all border-b-2 ${active ? 'bg-white/10 theme-primary-text' : 'border-transparent opacity-60 hover:opacity-100 hover:bg-white/5'} ${className}`} style={{ borderBottomColor: active ? (config.primaryColor || '#a3e635') : 'transparent' }}>
      {React.cloneElement(icon, { size: 18 })} <span className="theme-font-secondary tracking-wide">{label}</span>
    </button>
  );
}