import { useState, useMemo } from 'react';
import { SEASONS, inSeason, filterBySeason } from '../data/seasons.js';
import SectionTitle from '../ui/SectionTitle.jsx';
import { C, CardS, GlassS, DISPLAY, BODY, PAGE, RESULT, rise } from '../ui/theme.js';
import Pill from '../ui/Pill.jsx';
import Empty from '../ui/Empty.jsx';
import FixtureCard from '../ui/FixtureCard.jsx';
import FormGuide from '../ui/FormGuide.jsx';
import { upcoming, played, nextFixture, record, monthLabel, countdownLabel,
         prettyDate, splitVenue, form } from '../lib/season.js';

// Big countdown for the next match.
function NextUp({ game }) {
  if (!game) return null;
  const cd = countdownLabel(game.date);
  const { venue, time } = splitVenue(game.notes || "");
  const today = cd === "Today";
  return (
    <div style={{...GlassS,padding:"22px 24px",marginBottom:28,
                 borderColor: today ? `${C.red}66` : "rgba(255,255,255,.07)",
                 background: today ? "rgba(230,57,70,.10)" : GlassS.background,
                 display:"flex",gap:20,alignItems:"center",flexWrap:"wrap",...rise(0)}}>
      <div style={{flex:1,minWidth:220}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {today && <span style={{width:7,height:7,borderRadius:"50%",background:C.red,
                                  animation:"pulseDot 2.2s ease-in-out infinite"}}/>}
          <span style={{color:today?C.red:C.blue,fontSize:10,fontWeight:800,letterSpacing:2,textTransform:"uppercase"}}>
            {today ? "Match day" : "Next up"}
          </span>
        </div>
        <div style={{fontFamily:DISPLAY,fontSize:40,color:C.ink,lineHeight:1.05,marginTop:6}}>{game.opponent}</div>
        <div style={{color:C.ink3,fontSize:13.5,marginTop:6}}>
          {prettyDate(game.date)}{time && ` · ${time}`}
        </div>
        {venue && <div style={{color:C.muted,fontSize:12.5,marginTop:2}}>{venue}</div>}
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontFamily:DISPLAY,fontSize:52,color:today?C.red:C.ink,lineHeight:1}}>{cd || "TBD"}</div>
      </div>
    </div>
  );
}

function MonthGroup({ label, games, startIndex }) {
  return (
    <div style={{marginBottom:26}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
        <span style={{color:C.ink3,fontSize:11.5,fontWeight:800,letterSpacing:2,textTransform:"uppercase"}}>{label}</span>
        <div style={{flex:1,height:1,background:C.line}}/>
        <span style={{color:C.faint,fontSize:11}}>{games.length} {games.length===1?"match":"matches"}</span>
      </div>
      <div style={{display:"grid",gap:10}}>
        {games.map((g,i)=><FixtureCard key={g.id} game={g} i={startIndex+i}/>)}
      </div>
    </div>
  );
}

function groupByMonth(games) {
  const out = [];
  for (const g of games) {
    const l = monthLabel(g.date);
    if (!out.length || out[out.length-1].label !== l) out.push({ label: l, games: [] });
    out[out.length-1].games.push(g);
  }
  return out;
}

export default function Schedule({ stats }) {
  // Default to the newest season that actually has fixtures.
  const seasonsWithData = SEASONS.filter(s => stats.some(g => inSeason(s, g.id || "")));
  const newest = seasonsWithData[seasonsWithData.length-1];
  const [season, setSeason] = useState(newest ? newest.id : "all");
  const [view, setView] = useState("upcoming");

  const scoped = useMemo(() => filterBySeason(stats, season), [stats, season]);

  const next = nextFixture(scoped);
  const rec = record(scoped);
  const ups = upcoming(scoped);
  const res = played(scoped);
  const list = view === "upcoming" ? ups : res;
  const groups = groupByMonth(list);

  const current = SEASONS.find(s=>s.id===season) || null;
  const seasonLabel = current ? current.label : "All seasons";
  const seasonTeam = current ? current.team : "";

  return (
    <div style={PAGE}>
      <SectionTitle right={
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {SEASONS.map(s=>(
            <Pill key={s.id} label={s.label} active={season===s.id} onClick={()=>setSeason(s.id)}/>
          ))}
          <Pill label="All" active={season==="all"} onClick={()=>setSeason("all")}/>
        </div>
      }>SCHEDULE</SectionTitle>

      <NextUp game={next}/>

      {/* season summary strip */}
      <div style={{...CardS, padding:"16px 18px 14px", marginBottom:22, ...rise(1)}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                     gap:16, flexWrap:"wrap", marginBottom:14}}>
          <div style={{color:C.ink3, fontSize:11, fontWeight:800, letterSpacing:1.8,
                       textTransform:"uppercase"}}>
            {seasonLabel}
            {seasonTeam && <span style={{color:C.faint, fontWeight:600}}> · {seasonTeam}</span>}
          </div>
          {form(scoped,5).length > 0 && (
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <span style={{color:C.muted, fontSize:10, fontWeight:800, letterSpacing:1.6,
                            textTransform:"uppercase"}}>Form</span>
              <FormGuide games={form(scoped,5)} size={26}/>
            </div>
          )}
        </div>

        <div className="record">
          {[
            {v: rec.played, l: "Played",  c: C.ink},
            {v: rec.w,      l: "Won",     c: RESULT.W.fg},
            {v: rec.d,      l: "Drawn",   c: RESULT.D.fg},
            {v: rec.l,      l: "Lost",    c: RESULT.L.fg},
            {v: rec.gf,     l: "For",     c: C.blue},
            {v: rec.ga,     l: "Against", c: C.muted},
          ].map(cell => (
            <div key={cell.l} style={{textAlign:"center", padding:"10px 4px"}}>
              <div style={{fontFamily:DISPLAY, fontSize:30, lineHeight:1, color:cell.c}}>{cell.v}</div>
              <div style={{color:C.muted, fontSize:9.5, fontWeight:800, letterSpacing:1.4,
                           textTransform:"uppercase", marginTop:6}}>{cell.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* upcoming / results toggle */}
      <div style={{display:"flex",gap:0,marginBottom:20,background:C.surface,borderRadius:12,
                   border:`1px solid ${C.line}`,overflow:"hidden",width:"fit-content"}}>
        {[{v:"upcoming",l:`Upcoming (${ups.length})`},{v:"results",l:`Results (${res.length})`}].map(t=>(
          <button key={t.v} onClick={()=>setView(t.v)}
            style={{padding:"10px 20px",background:view===t.v?"#1a2f5a":"none",border:"none",
                    color:view===t.v?C.ink:C.muted,fontSize:13,fontWeight:view===t.v?700:500,
                    cursor:"pointer",fontFamily:BODY,transition:"all .2s"}}>{t.l}</button>
        ))}
      </div>

      {list.length===0
        ? <Empty icon={view==="upcoming"?"🗓":"📊"}
                 text={view==="upcoming"?"No upcoming fixtures in this season.":"No results logged yet."}/>
        : groups.map((g,gi)=>(
            <MonthGroup key={g.label} label={g.label} games={g.games}
              startIndex={groups.slice(0,gi).reduce((n,x)=>n+x.games.length,0)}/>
          ))}
    </div>
  );
}
