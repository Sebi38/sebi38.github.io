import { useState, useEffect } from 'react';
import { SK } from './config.js';
import { ld } from './lib/storage.js';
import { onAuthReady } from './lib/firebase.js';
import { loadFirebaseToLocal } from './lib/sync.js';
import Nav from './ui/Nav.jsx';
import SignIn from './pages/SignIn.jsx';
import Home from './pages/Home.jsx';
import Highlights from './pages/Highlights.jsx';
import Training from './pages/Training.jsx';
import Journal from './pages/Journal.jsx';
import Stats from './pages/Stats.jsx';

const PAGES = {
  home: Home,
  highlights: Highlights,
  training: Training,
  journal: Journal,
  stats: Stats,
};

function Splash({ text }) {
  return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:48}}>⚽</div>
      <p style={{color:"#5a6a8a",fontSize:16,fontFamily:"'Outfit',sans-serif"}}>{text}</p>
    </div>
  );
}

export default function App() {
  // null = still checking for a restored session
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState("home");
  const [statsData, setStatsData] = useState([]);
  const [journalData, setJournalData] = useState([]);
  const [dbReady, setDbReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Firebase restores the session asynchronously on load.
  useEffect(() => onAuthReady(u => { setUser(u); setAuthChecked(true); }), []);

  // Once signed in, pull the database down into localStorage.
  useEffect(() => {
    if (!user) { setDbReady(false); return; }
    let cancelled = false;
    (async () => {
      try {
        await loadFirebaseToLocal();
      } catch (e) {
        console.error("Firebase load failed:", e);
        if (!cancelled) setLoadError(e?.message || 'Could not load data.');
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
  if (!dbReady) return <Splash text={loadError || "Loading data…"}/>;

  const Page = PAGES[page] || Home;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#0a0f1e 0%,#0d1526 100%)",fontFamily:"'Outfit',sans-serif"}}>
      <Nav active={page} setActive={setPage}/>
      <Page stats={statsData} journal={journalData}/>
    </div>
  );
}
