import { useState, useEffect } from 'react';
import { SK } from './config.js';
import { ld, flushOutbox, pendingNodes } from './lib/storage.js';
import { onAuthReady } from './lib/firebase.js';
import { loadFirebaseToLocal } from './lib/sync.js';
import { todayISO } from './lib/season.js';
import Nav from './ui/Nav.jsx';
import ErrorBoundary from './ui/ErrorBoundary.jsx';
import SignIn from './pages/SignIn.jsx';
import Home from './pages/Home.jsx';
import Matches from './pages/Matches.jsx';
import MatchDay from './pages/MatchDay.jsx';
import Reflect from './pages/Reflect.jsx';
import Highlights from './pages/Highlights.jsx';
import Training from './pages/Training.jsx';

// Tabs are addressable as #matchday, #schedule, … so the back button works,
// a refresh keeps your place, and a home-screen icon can point at one.
const readHash = () => {
  const h = (window.location.hash || '').replace(/^#/, '');
  return h in PAGES ? h : null;
};

const PAGES = {
  home: Home,
  matches: Matches,
  matchday: MatchDay,
  reflect: Reflect,
  highlights: Highlights,
  training: Training,
};

// Shown when the database could not be reached. The app keeps working from
// the localStorage cache and mirrors edits up once the connection returns.
function OfflineBar({ unsynced }) {
  return (
    <div style={{background:"rgba(244,162,97,.12)",borderBottom:"1px solid rgba(244,162,97,.28)",
                 color:"#f4a261",fontSize:12.5,fontWeight:600,padding:"8px 16px",textAlign:"center",
                 fontFamily:"'Outfit',sans-serif"}}>
      ⚡ Offline — showing saved data. Anything you enter is kept on this device
      {unsynced ? " and will sync when you're back online." : " and syncs when you're back online."}
    </div>
  );
}

// Everything entered while offline is still waiting to reach the database.
// Worth saying out loud: it means "don't clear this browser's data yet".
function UnsyncedBar() {
  return (
    <div style={{background:"rgba(74,124,204,.12)",borderBottom:"1px solid rgba(74,124,204,.28)",
                 color:"#4a7ccc",fontSize:12.5,fontWeight:600,padding:"8px 16px",textAlign:"center",
                 fontFamily:"'Outfit',sans-serif"}}>
      ⏳ Some match data is saved on this device but not yet in the database — it will
      upload on its own.
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
  // Which match the tabs are focused on. Set from Matches so that opening
  // Match Day or Sebi's Review lands on the game you were just looking at,
  // instead of asking you to pick it again.
  const [focusId, setFocusId] = useState(null);

  // Jump to another tab with a match already selected.
  const openMatch = (targetPage, id) => { setFocusId(id); setPage(targetPage); };
  const [statsData, setStatsData] = useState([]);
  const [journalData, setJournalData] = useState([]);
  const [dbReady, setDbReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [unsynced, setUnsynced] = useState(false);

  // Firebase restores the session asynchronously on load.
  useEffect(() => onAuthReady(u => { setUser(u); setAuthChecked(true); }), []);

  // Anything written while offline sits in the outbox until it lands. Retry
  // when the connection comes back — a match logged at a pitch with no signal
  // should not need anyone to remember to reopen the app.
  useEffect(() => {
    const check = () => setUnsynced(pendingNodes().length > 0);
    const retry = () => { flushOutbox().finally(check); };
    window.addEventListener('online', retry);
    const t = setInterval(() => { if (navigator.onLine) retry(); else check(); }, 30000);
    check();
    return () => { window.removeEventListener('online', retry); clearInterval(t); };
  }, [user]);

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
      setUnsynced(pendingNodes().length > 0);
      setDbReady(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Home's career totals read from localStorage, so refresh on navigation.
  useEffect(() => {
    if (!user || !dbReady) return;
    setStatsData(ld(SK.stats) || []);
    setJournalData(ld(SK.journal) || []);
    setUnsynced(pendingNodes().length > 0);
  }, [user, dbReady, page]);

  if (!authChecked) return <Splash text="Checking sign-in…"/>;
  if (!user) return <SignIn/>;
  if (!dbReady) return <Splash text="Loading data…"/>;

  const Page = PAGES[page] || Home;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#0a0f1e 0%,#0d1526 100%)",fontFamily:"'Outfit',sans-serif"}}>
      <Nav active={page} setActive={setPage}/>
      {offline ? <OfflineBar unsynced={unsynced}/> : unsynced && <UnsyncedBar/>}
      {/* Keyed by tab so each one gets a fresh boundary: a page that throws
          no longer takes the nav — and the rest of the site — down with it. */}
      <ErrorBoundary key={page}>
        <Page stats={statsData} journal={journalData} setPage={setPage}
              focusId={focusId} openMatch={openMatch}/>
      </ErrorBoundary>
    </div>
  );
}
