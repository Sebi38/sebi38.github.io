import { useState, useEffect } from 'react';
import { SK } from './config.js';
import { ld } from './lib/storage.js';
import { onAuthReady } from './lib/firebase.js';
import { loadFirebaseToLocal } from './lib/sync.js';
import { todayISO } from './lib/season.js';
import Nav from './ui/Nav.jsx';
import SignIn from './pages/SignIn.jsx';
import Home from './pages/Home.jsx';
import Schedule from './pages/Schedule.jsx';
import MatchDay from './pages/MatchDay.jsx';
import Reflect from './pages/Reflect.jsx';
import Highlights from './pages/Highlights.jsx';
import Training from './pages/Training.jsx';
import Journal from './pages/Journal.jsx';
import Stats from './pages/Stats.jsx';

// Tabs are addressable as #matchday, #schedule, … so the back button works,
// a refresh keeps your place, and a home-screen icon can point at one.
const readHash = () => {
  const h = (window.location.hash || '').replace(/^#/, '');
  return h in PAGES ? h : null;
};

const PAGES = {
  home: Home,
  schedule: Schedule,
  matchday: MatchDay,
  reflect: Reflect,
  highlights: Highlights,
  training: Training,
  journal: Journal,
  stats: Stats,
};

// Shown when the database could not be reached. The app keeps working from
// the localStorage cache and mirrors edits up once the connection returns.
function OfflineBar() {
  return (
    <div style={{background:"rgba(244,162,97,.12)",borderBottom:"1px solid rgba(244,162,97,.28)",
                 color:"#f4a261",fontSize:12.5,fontWeight:600,padding:"8px 16px",textAlign:"center",
                 fontFamily:"'Outfit',sans-serif"}}>
      ⚡ Offline — showing saved data. Anything you enter is kept and syncs when you're back online.
    </div>
  );
}

function Splash({ text }) {
  return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:48}}>⚽</div>
      <p style={{color:"#5a6a8a",fontSize:16,fontFamily:"'Outfit',sans-serif"}}>{text}</p>
    </div>
  );
}

// What the URL asked for on arrival. Captured once at module load: the effect
// below keeps the hash in step with the active tab, so by the time any effect
// runs the hash always looks "set" and can no longer be used to tell whether
// the user actually requested a tab.
const INITIAL_HASH = readHash();

export default function App() {
  // null = still checking for a restored session
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState(() => readHash() || "home");
  const [autoRouted, setAutoRouted] = useState(false);
  const [statsData, setStatsData] = useState([]);
  const [journalData, setJournalData] = useState([]);
  const [dbReady, setDbReady] = useState(false);
  const [offline, setOffline] = useState(false);

  // Firebase restores the session asynchronously on load.
  useEffect(() => onAuthReady(u => { setUser(u); setAuthChecked(true); }), []);

  // Reflect the active tab in the URL, and follow back/forward.
  useEffect(() => {
    if (readHash() !== page) window.location.hash = page;
  }, [page]);
  useEffect(() => {
    const onHash = () => { const h = readHash(); if (h && h !== page) setPage(h); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [page]);

  // On a match day, open straight onto Match Day — unless the URL already
  // asked for a specific tab. Runs once, so it never yanks you mid-session.
  useEffect(() => {
    if (!dbReady || autoRouted) return;
    setAutoRouted(true);
    if (INITIAL_HASH) return;
    const t = todayISO();
    if (statsData.some(g => g.date === t)) setPage('matchday');
  }, [dbReady, autoRouted, statsData]);

  // Once signed in, pull the database down into localStorage.
  useEffect(() => {
    if (!user) { setDbReady(false); return; }
    let cancelled = false;
    (async () => {
      try {
        await loadFirebaseToLocal();
        if (!cancelled) setOffline(false);
      } catch (e) {
        // Offline or unreachable: fall through to whatever localStorage holds.
        // Edits still work and are mirrored up when the connection returns.
        console.warn("Working from cached data:", e?.message || e);
        if (!cancelled) setOffline(true);
      }
      if (cancelled) return;
      setStatsData(ld(SK.stats) || []);
      setJournalData(ld(SK.journal) || []);
      setDbReady(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Home's career totals read from localStorage, so refresh on navigation.
  useEffect(() => {
    if (!user || !dbReady) return;
    setStatsData(ld(SK.stats) || []);
    setJournalData(ld(SK.journal) || []);
  }, [user, dbReady, page]);

  if (!authChecked) return <Splash text="Checking sign-in…"/>;
  if (!user) return <SignIn/>;
  if (!dbReady) return <Splash text="Loading data…"/>;

  const Page = PAGES[page] || Home;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#0a0f1e 0%,#0d1526 100%)",fontFamily:"'Outfit',sans-serif"}}>
      <Nav active={page} setActive={setPage}/>
      {offline && <OfflineBar/>}
      <Page stats={statsData} journal={journalData} setPage={setPage}/>
    </div>
  );
}
