import { useState, useMemo } from 'react';
import { SK, POS } from '../config.js';
import { SEASONS, filterBySeason } from '../data/seasons.js';
import { surfaceForVenue } from '../data/venues.js';
import { ld, sv, gid } from '../lib/storage.js';
import { normalizeStatForm, hasValue } from '../lib/numbers.js';
import { momentsOf, momentId, label as momentLabel } from '../lib/moments.js';
import { questionsOf, openCount } from '../lib/questions.js';
import { EVENT_TYPES, eventsOf, countsOf } from '../lib/events.js';
import { upcoming, played, nextFixture, record, form, monthLabel, countdownLabel,
         prettyDate, venueOf, isPlayed, todayISO } from '../lib/season.js';
import { C, CardS, GlassS, DISPLAY, BODY, PAGE, IS, LS, BP, BS, RESULT, rC, rise } from '../ui/theme.js';
import SectionTitle from '../ui/SectionTitle.jsx';
import Empty from '../ui/Empty.jsx';
import Modal from '../ui/Modal.jsx';
import Pill from '../ui/Pill.jsx';
import SearchBar from '../ui/SearchBar.jsx';
import FormGuide from '../ui/FormGuide.jsx';
import StatsTable from '../ui/StatsTable.jsx';

const EMPTY = {date:"",opponent:"",fieldName:"",address:"",kickoff:"",surface:"grass",positions:["","",""],started:null,
  result:"—",scoreFor:"",scoreAgainst:"",minutes:0,goals:0,assists:0,shots:0,sot:0,passes:0,
  tackles:0,takaPos:"",takaNeg:"",takaLink:"",veoLink:""};

const Section = ({ children }) => (
  <div style={{color:C.blue,fontSize:11,fontWeight:700,letterSpacing:2,paddingBottom:6,
               borderBottom:`1px solid ${C.line}`,marginTop:4}}>{children}</div>
);

// A block of reflection text. Read-only here — it is written in Sebi's Review.
const Reflection = ({ icon, title, color, children }) => (
  <div style={{marginBottom:12}}>
    <div style={{color,fontSize:12,fontWeight:700,letterSpacing:1,marginBottom:4}}>{icon} {title}</div>
    <div style={{color:C.ink2,fontSize:14,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{children}</div>
  </div>
);

export default function Matches({ stats: statsProp, journal: journalProp, openMatch }) {
  const [stats, setStats] = useState(() => ld(SK.stats) || statsProp || []);
  const [journal, setJournal] = useState(() => ld(SK.journal) || journalProp || []);
  const [season, setSeason] = useState("all");
  const [view, setView] = useState("played");
  const [mode, setMode] = useState("cards");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formState, setForm] = useState(EMPTY);

  const saveStats = u => { setStats(u); sv(SK.stats, u); };
  const saveJournal = u => { setJournal(u); sv(SK.journal, u); };

  // Journal entries are linked by statId. Older entries pre-date that link, so
  // fall back to the date — but only when exactly one entry shares it, since
  // some days have two fixtures.
  const entryFor = (id, date) => {
    const direct = journal.find(e => e.statId === id);
    if (direct) return direct;
    if (!date) return null;
    const sameDay = journal.filter(e => !e.statId && e.date === date);
    return sameDay.length === 1 ? sameDay[0] : null;
  };

  // A match = the stat row (facts) plus its journal entry (reflection).
  const rows = useMemo(() => stats.map(s => {
    const e = entryFor(s.id, s.date) || {};
    return { ...s, _entry: e,
      rating: e.rating, wentWell: e.wentWell, toImprove: e.toImprove,
      questionsForCoaches: e.questionsForCoaches,
      surface: e.surface || surfaceForVenue(s.notes || "") || "grass",
      moments: momentsOf(e), questions: questionsOf(e), events: eventsOf(s), takaLink: e.takaLink, veoLink: e.veoLink };
  }), [stats, journal]);

  const scoped = useMemo(() => filterBySeason(rows, season), [rows, season]);
  const counts = useMemo(() => {
    const t = todayISO();
    return { played: scoped.filter(r => isPlayed(r) || r.date <= t).length,
             upcoming: scoped.filter(r => !isPlayed(r) && r.date > t).length };
  }, [scoped]);

  const list = useMemo(() => {
    const t = todayISO();
    let f = scoped;
    if (view === "played")   f = f.filter(r => isPlayed(r) || r.date <= t);
    if (view === "upcoming") f = f.filter(r => !isPlayed(r) && r.date > t);
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(r => r.opponent.toLowerCase().includes(q) || r.date.includes(q) ||
        (r.notes||"").toLowerCase().includes(q) ||
        (r.positions||[]).join(" ").toLowerCase().includes(q));
    }
    return [...f].sort((a,b) => view === "upcoming"
      ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
  }, [scoped, view, search]);

  const groups = useMemo(() => {
    const out = [];
    for (const g of list) {
      const l = monthLabel(g.date);
      if (!out.length || out[out.length-1].label !== l) out.push({ label: l, games: [] });
      out[out.length-1].games.push(g);
    }
    return out;
  }, [list]);

  // Every question across the scoped season, newest match first.
  const allQuestions = useMemo(() => scoped
    .filter(r => r.questions.length)
    .sort((a,b) => b.date.localeCompare(a.date))
    .map(r => ({ match: r, questions: r.questions })), [scoped]);
  const openQ = allQuestions.reduce((n,g) => n + openCount(g.questions), 0);

  const next = nextFixture(scoped);
  const rec = record(scoped);
  const current = SEASONS.find(s => s.id === season);

  // ── editing match facts ──────────────────────────────────────────────────
  const openEdit = r => {
    const src = r.positions?.length ? r.positions : (r.position ? [r.position] : []);
    const v = venueOf(r);
    setForm({ date:r.date, opponent:r.opponent, fieldName:v.fieldName, address:v.address, kickoff:v.kickoff, surface:r.surface||"grass",
      positions:[src[0]||"",src[1]||"",src[2]||""], started:typeof r.started==="boolean"?r.started:null,
      result:r.result||"—", scoreFor:hasValue(r.scoreFor)?r.scoreFor:"", scoreAgainst:hasValue(r.scoreAgainst)?r.scoreAgainst:"",
      minutes:r.minutes||0, goals:r.goals||0, assists:r.assists||0, shots:r.shots||0, sot:r.sot||0,
      passes:r.passes||0, tackles:r.tackles||0, takaPos:hasValue(r.takaPos)?r.takaPos:"",
      takaNeg:hasValue(r.takaNeg)?r.takaNeg:"", takaLink:r._entry?.takaLink||"", veoLink:r._entry?.veoLink||"" });
    setEditing(r.id || "new");
  };

  const saveEdit = () => {
    const p = normalizeStatForm(formState);
    const positions = formState.positions.filter(Boolean);
    const factPatch = { date:p.date, opponent:p.opponent, fieldName:formState.fieldName,
      address:formState.address, kickoff:formState.kickoff, result:p.result,
      scoreFor:p.scoreFor, scoreAgainst:p.scoreAgainst, minutes:p.minutes, goals:p.goals,
      assists:p.assists, shots:p.shots, sot:p.sot, passes:p.passes, tackles:p.tackles,
      takaPos:p.takaPos, takaNeg:p.takaNeg, positions, position:positions[0]||"", started:formState.started };

    let statId = editing;
    if (editing === "new") {
      statId = gid();
      saveStats([{ ...factPatch, id: statId }, ...stats]);
    } else {
      saveStats(stats.map(s => s.id === editing ? { ...s, ...factPatch } : s));
    }

    const e = journal.find(x => x.statId === statId);
    const jPatch = { fieldName:formState.fieldName, address:formState.address, surface:formState.surface,
                     takaLink:formState.takaLink, veoLink:formState.veoLink };
    if (e) saveJournal(journal.map(x => x.id === e.id ? { ...x, ...jPatch } : x));
    else saveJournal([{ id:gid(), statId, date:p.date, opponent:p.opponent, ...jPatch,
                        wentWell:"", toImprove:"", questionsForCoaches:"", rating:5, moments:[] }, ...journal]);
    setEditing(null);
  };

  const remove = id => {
    saveStats(stats.filter(s => s.id !== id));
    const e = journal.find(x => x.statId === id);
    if (e) saveJournal(journal.filter(x => x.id !== e.id));
  };

  // ── ticking a moment off once it's been seen on film ─────────────────────
  const toggleMoment = (row, mId) => {
    const e = row._entry;
    const next = momentsOf(e).map(m => m.id === mId ? { ...m, reviewed: !m.reviewed } : m);
    if (e?.id) saveJournal(journal.map(x => x.id === e.id ? { ...x, moments: next, freeform: "" } : x));
  };

  const toggleQuestion = (row, qId) => {
    const e = row._entry;
    const next = questionsOf(e).map(q => q.id === qId ? { ...q, answered: !q.answered } : q);
    if (e?.id) saveJournal(journal.map(x => x.id === e.id ? { ...x, questionsForCoaches: next } : x));
  };

  const num = (l,k,extra={}) => (
    <div><label style={LS}>{l}</label>
      <input type="number" min="0" value={formState[k]}
             onChange={e=>setForm({...formState,[k]:e.target.value})} style={IS} {...extra}/></div>
  );

  return (
    <div style={PAGE}>
      <SectionTitle right={
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {SEASONS.map(s => <Pill key={s.id} label={s.label} active={season===s.id} onClick={()=>setSeason(s.id)}/>)}
          <Pill label="All" active={season==="all"} onClick={()=>setSeason("all")}/>
        </div>
      }>MATCHES</SectionTitle>

      {next && mode === "cards" && (() => {
        const cd = countdownLabel(next.date);
        const v = venueOf(next);
        const today = cd === "Today";
        return (
          <div style={{...GlassS,padding:"20px 22px",marginBottom:22,
                       borderColor:today?`${C.red}66`:"rgba(255,255,255,.07)",
                       display:"flex",gap:18,alignItems:"center",flexWrap:"wrap",...rise(0)}}>
            <div style={{flex:1,minWidth:200}}>
              <div style={{color:today?C.red:C.blue,fontSize:10,fontWeight:800,letterSpacing:2,textTransform:"uppercase"}}>
                {today ? "Match day" : "Next up"}
              </div>
              <div style={{fontFamily:DISPLAY,fontSize:34,color:C.ink,lineHeight:1.1,marginTop:4}}>{next.opponent}</div>
              <div style={{color:C.ink3,fontSize:13,marginTop:4}}>{prettyDate(next.date)}{v.kickoff&&` · ${v.kickoff}`}</div>
              {v.fieldName && <div style={{color:C.ink2,fontSize:13,marginTop:2}}>{v.fieldName}</div>}
              {v.address && <div style={{color:C.muted,fontSize:12}}>{v.address}</div>}
            </div>
            <div style={{fontFamily:DISPLAY,fontSize:42,color:today?C.red:C.ink,lineHeight:1}}>{cd||"TBC"}</div>
          </div>
        );
      })()}

      <div style={{...CardS,padding:"16px 18px 14px",marginBottom:20,...rise(1)}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:14}}>
          <div style={{color:C.ink3,fontSize:11,fontWeight:800,letterSpacing:1.8,textTransform:"uppercase"}}>
            {current ? current.label : "All seasons"}
            {current && <span style={{color:C.faint,fontWeight:600}}> · {current.team}</span>}
          </div>
          {form(scoped,5).length>0 && (
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{color:C.muted,fontSize:10,fontWeight:800,letterSpacing:1.6,textTransform:"uppercase"}}>Form</span>
              <FormGuide games={form(scoped,5)} size={26}/>
            </div>
          )}
        </div>
        <div className="record">
          {[{v:rec.played,l:"Played",c:C.ink},{v:rec.w,l:"Won",c:RESULT.W.fg},{v:rec.d,l:"Drawn",c:RESULT.D.fg},
            {v:rec.l,l:"Lost",c:RESULT.L.fg},{v:rec.gf,l:"For",c:C.blue},{v:rec.ga,l:"Against",c:C.muted}].map(c=>(
            <div key={c.l} style={{textAlign:"center",padding:"10px 4px"}}>
              <div style={{fontFamily:DISPLAY,fontSize:30,lineHeight:1,color:c.c}}>{c.v}</div>
              <div style={{color:C.muted,fontSize:9.5,fontWeight:800,letterSpacing:1.4,textTransform:"uppercase",marginTop:6}}>{c.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",background:C.surface,borderRadius:12,border:`1px solid ${C.line}`,overflow:"hidden"}}>
          {[{v:"played",l:`Played (${counts.played})`},{v:"upcoming",l:`Upcoming (${counts.upcoming})`},{v:"all",l:"All"}].map(t=>(
            <button key={t.v} onClick={()=>setView(t.v)} style={{padding:"9px 15px",background:view===t.v?"#1a2f5a":"none",
              border:"none",color:view===t.v?C.ink:C.muted,fontSize:12.5,fontWeight:view===t.v?700:500,cursor:"pointer",fontFamily:BODY}}>{t.l}</button>
          ))}
        </div>
        <div style={{display:"flex",background:C.surface,borderRadius:12,border:`1px solid ${C.line}`,overflow:"hidden"}}>
          {[{v:"cards",l:"Cards"},{v:"table",l:"Table"},{v:"questions",l:`Questions${openQ?` (${openQ})`:""}`}].map(t=>(
            <button key={t.v} onClick={()=>setMode(t.v)} style={{padding:"9px 15px",background:mode===t.v?"#1a2f5a":"none",
              border:"none",color:mode===t.v?C.ink:C.muted,fontSize:12.5,fontWeight:mode===t.v?700:500,cursor:"pointer",fontFamily:BODY}}>{t.l}</button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search opponent, venue, position..."/>
        <button onClick={()=>{setForm(EMPTY);setEditing("new");}} style={{...BP,marginLeft:"auto"}}>+ Add Match</button>
      </div>

      {mode === "questions" ? (
        allQuestions.length === 0
          ? <Empty icon="❓" text="No questions yet — Sebi adds them in his review after a match."/>
          : <div style={{display:"grid",gap:14}}>
              <div style={{color:C.muted,fontSize:12.5}}>
                {openQ} open · {allQuestions.reduce((n,g)=>n+g.questions.length,0) - openQ} answered
              </div>
              {allQuestions.map(({match:r, questions}, gi) => (
                <div key={r.id} style={{...CardS,padding:"16px 18px",...rise(gi)}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                    <span style={{color:C.ink,fontWeight:700,fontSize:15}}>{r.opponent}</span>
                    <span style={{color:C.muted,fontSize:12}}>{prettyDate(r.date)}</span>
                    <button onClick={()=>openMatch?.("reflect", r.id)}
                            style={{marginLeft:"auto",background:"none",border:"none",color:C.blue,
                                    fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:BODY}}>Edit in Sebi's Review →</button>
                  </div>
                  <div style={{display:"grid",gap:6}}>
                    {questions.map(q => (
                      <label key={q.id} style={{display:"flex",gap:10,alignItems:"flex-start",background:C.bg,
                        borderRadius:8,padding:"10px 12px",cursor:"pointer"}}>
                        <input type="checkbox" checked={q.answered} onChange={()=>toggleQuestion(r,q.id)}
                               style={{marginTop:2,width:17,height:17,accentColor:RESULT.W.fg,flexShrink:0,cursor:"pointer"}}/>
                        <span style={{color:q.answered?C.muted:C.ink2,fontSize:14,lineHeight:1.5,
                                      textDecoration:q.answered?"line-through":"none"}}>{q.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
      ) : list.length === 0 ? <Empty icon="⚽" text="No matches here yet."/>
        : mode === "table" ? <StatsTable rows={list} onEdit={openEdit} onDelete={remove}/>
        : groups.map(g => (
          <div key={g.label} style={{marginBottom:26}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <span style={{color:C.ink3,fontSize:11.5,fontWeight:800,letterSpacing:2,textTransform:"uppercase"}}>{g.label}</span>
              <div style={{flex:1,height:1,background:C.line}}/>
              <span style={{color:C.faint,fontSize:11}}>{g.games.length} {g.games.length===1?"match":"matches"}</span>
            </div>
            <div style={{display:"grid",gap:10}}>
              {g.games.map((r,i) => {
                const res = RESULT[r.result] || RESULT["—"];
                const v = venueOf(r);
                const score = hasValue(r.scoreFor)&&hasValue(r.scoreAgainst) ? `${r.scoreFor}–${r.scoreAgainst}` : null;
                const open = expanded === r.id;
                const cd = isPlayed(r) ? null : countdownLabel(r.date);
                const hasDetail = r.rating!=null || r.wentWell || r.toImprove || r.questionsForCoaches || r.moments.length || isPlayed(r);
                return (
                  <div key={r.id} style={{...CardS,overflow:"hidden",borderLeft:`3px solid ${res.fg}`,...rise(i)}}>
                    <div onClick={()=>setExpanded(open?null:r.id)}
                         style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
                      <div style={{textAlign:"center",minWidth:48,flexShrink:0}}>
                        <div style={{fontFamily:DISPLAY,fontSize:28,color:C.ink,lineHeight:1}}>{r.date.slice(8)}</div>
                        <div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1.4,textTransform:"uppercase"}}>
                          {monthLabel(r.date).slice(0,3)}
                        </div>
                      </div>
                      <div style={{width:1,alignSelf:"stretch",background:C.line}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <span style={{color:C.ink,fontWeight:700,fontSize:15.5}}>{r.opponent}</span>
                          {v.tag && <span style={{fontSize:10,fontWeight:700,letterSpacing:1,color:C.gold,
                            background:"rgba(244,162,97,.13)",border:`1px solid ${C.gold}33`,padding:"2px 7px",
                            borderRadius:5,textTransform:"uppercase"}}>{v.tag}</span>}
                          {r.rating!=null && isPlayed(r) && (
                            <span style={{fontSize:11,fontWeight:800,color:rC(r.rating),
                              background:`${rC(r.rating)}1f`,border:`1px solid ${rC(r.rating)}44`,
                              padding:"1px 7px",borderRadius:5}}>{r.rating}/10</span>
                          )}
                        </div>
                        <div style={{color:C.muted,fontSize:12.5,marginTop:3}}>
                          {prettyDate(r.date)}{v.kickoff&&` · ${v.kickoff}`}{v.fieldName&&` · ${v.fieldName}`}
                          {" · "}{r.surface==="turf"?"🏟 Turf":"🌱 Grass"}
                          {(r.positions?.length||r.position)&&<span style={{color:C.blue}}> · {r.positions?.length?r.positions.join(" → "):r.position}</span>}
                        </div>
                        {v.address && <div style={{color:C.faint,fontSize:11.5,marginTop:2}}>{v.address}</div>}
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        {isPlayed(r)
                          ? <div style={{fontFamily:DISPLAY,fontSize:score?24:20,color:res.fg,lineHeight:1}}>{score||r.result}</div>
                          : <span style={{fontSize:11.5,fontWeight:700,color:cd==="Today"?C.red:C.muted,
                              border:`1px solid ${cd==="Today"?C.red+"55":C.line2}`,padding:"5px 10px",
                              borderRadius:20,whiteSpace:"nowrap"}}>{cd||"TBC"}</span>}
                      </div>
                      <span style={{color:C.faint,fontSize:16,transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>▼</span>
                    </div>

                    {open && (
                      <div style={{padding:"0 18px 18px",borderTop:`1px solid ${C.line}`,paddingTop:16}}>
                        {isPlayed(r) && (
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(62px,1fr))",gap:8,
                                       marginBottom:16,background:C.bg,borderRadius:10,padding:"12px 10px"}}>
                            {[{v:r.minutes+"'",l:"MIN",c:C.gold},{v:r.goals,l:"GOALS",c:C.red},
                              {v:r.assists,l:"AST",c:RESULT.W.fg},{v:r.shots||0,l:"SHOTS",c:C.violet},
                              {v:r.sot||0,l:"SOT",c:C.blue},{v:r.passes||0,l:"PASS",c:C.muted},
                              {v:r.tackles||0,l:"TKL",c:C.muted},
                              ...EVENT_TYPES.filter(t=>countsOf(r.events)[t.key]>0)
                                  .map(t=>({v:countsOf(r.events)[t.key],l:t.short,c:C.teal})),
                              ...(hasValue(r.takaPos)?[{v:r.takaPos,l:"T+",c:RESULT.W.fg}]:[]),
                              ...(hasValue(r.takaNeg)?[{v:r.takaNeg,l:"T−",c:RESULT.L.fg}]:[])].map((s,j)=>(
                              <div key={j} style={{textAlign:"center"}}>
                                <div style={{fontFamily:DISPLAY,fontSize:21,color:s.c}}>{s.v}</div>
                                <div style={{color:C.faint,fontSize:9.5,fontWeight:700,letterSpacing:.5}}>{s.l}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {r.wentWell && <Reflection icon="✅" title="WHAT WENT WELL" color={RESULT.W.fg}>{r.wentWell}</Reflection>}
                        {r.toImprove && <Reflection icon="🔧" title="TO IMPROVE" color={RESULT.D.fg}>{r.toImprove}</Reflection>}
                        {r.questions.length > 0 && (
                          <div style={{marginBottom:12}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                              <span style={{color:C.violet,fontSize:12,fontWeight:700,letterSpacing:1}}>❓ QUESTIONS FOR COACHES</span>
                              <span style={{color:C.faint,fontSize:11}}>
                                {r.questions.length - openCount(r.questions)}/{r.questions.length} answered
                              </span>
                            </div>
                            <div style={{display:"grid",gap:5}}>
                              {r.questions.map(q=>(
                                <label key={q.id} style={{display:"flex",gap:10,alignItems:"flex-start",background:C.bg,
                                  borderRadius:8,padding:"9px 11px",cursor:"pointer"}}>
                                  <input type="checkbox" checked={q.answered} onChange={()=>toggleQuestion(r,q.id)}
                                         style={{marginTop:2,width:17,height:17,accentColor:RESULT.W.fg,flexShrink:0,cursor:"pointer"}}/>
                                  <span style={{color:q.answered?C.muted:C.ink2,fontSize:13.5,lineHeight:1.5,
                                                textDecoration:q.answered?"line-through":"none"}}>{q.text}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {r.moments.length > 0 && (
                          <div style={{marginBottom:12}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                              <span style={{color:C.blue,fontSize:12,fontWeight:700,letterSpacing:1}}>🎬 MATCH MOMENTS</span>
                              <span style={{color:C.faint,fontSize:11}}>
                                {r.moments.filter(m=>m.reviewed).length}/{r.moments.length} reviewed on film
                              </span>
                            </div>
                            <div style={{display:"grid",gap:5}}>
                              {r.moments.map(m=>(
                                <label key={m.id} style={{display:"flex",gap:10,alignItems:"flex-start",background:C.bg,
                                  borderRadius:8,padding:"9px 11px",cursor:"pointer"}}>
                                  <input type="checkbox" checked={m.reviewed}
                                         onChange={()=>toggleMoment(r,m.id)}
                                         style={{marginTop:2,width:17,height:17,accentColor:RESULT.W.fg,flexShrink:0,cursor:"pointer"}}/>
                                  <span style={{color:m.reviewed?C.muted:C.ink2,fontSize:13.5,lineHeight:1.5,
                                                textDecoration:m.reviewed?"line-through":"none"}}>
                                    {momentLabel(m)}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap",alignItems:"center"}}>
                          {r.takaLink && <a href={r.takaLink} target="_blank" rel="noopener noreferrer"
                            style={{...BS,padding:"6px 14px",fontSize:12,color:C.blue,borderColor:C.blue+"44",textDecoration:"none"}}>🎥 Taka</a>}
                          {r.veoLink && <a href={r.veoLink} target="_blank" rel="noopener noreferrer"
                            style={{...BS,padding:"6px 14px",fontSize:12,color:C.violet,borderColor:C.violet+"44",textDecoration:"none"}}>🎥 Veo</a>}
                          <button onClick={ev=>{ev.stopPropagation();openMatch?.("matchday", r.id);}}
                            style={{...BS,padding:"6px 14px",fontSize:12,color:C.gold,borderColor:C.gold+"44"}}>⏱ Log match day</button>
                          <button onClick={ev=>{ev.stopPropagation();openMatch?.("reflect", r.id);}}
                            style={{...BS,padding:"6px 14px",fontSize:12,color:C.violet,borderColor:C.violet+"44"}}>🧠 Sebi's review</button>
                          <button onClick={ev=>{ev.stopPropagation();openEdit(r);}}
                            style={{...BS,padding:"6px 14px",fontSize:12,color:C.blue,borderColor:C.blue+"44"}}>✏️ Edit match</button>
                          <button onClick={ev=>{ev.stopPropagation();remove(r.id);}}
                            style={{...BS,padding:"6px 14px",fontSize:12,color:C.red,borderColor:C.red+"33"}}>🗑 Delete</button>
                          {!r.wentWell && !r.toImprove && isPlayed(r) && (
                            <span style={{color:C.faint,fontSize:11.5,marginLeft:"auto"}}>
                              No reflection yet — add it in Sebi's Review
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {editing && (
        <Modal title={editing==="new"?"ADD MATCH":"EDIT MATCH"} onClose={()=>setEditing(null)} wide>
          <div style={{display:"grid",gap:16}}>
            <Section>GAME INFO</Section>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={LS}>Date</label><input type="date" value={formState.date} onChange={e=>setForm({...formState,date:e.target.value})} style={IS}/></div>
              <div><label style={LS}>Opponent</label><input value={formState.opponent} onChange={e=>setForm({...formState,opponent:e.target.value})} style={IS}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
              <div><label style={LS}>Field name</label><input value={formState.fieldName} onChange={e=>setForm({...formState,fieldName:e.target.value})} placeholder="e.g. Williamsburg Middle School" style={IS}/></div>
              <div><label style={LS}>Surface</label><select value={formState.surface} onChange={e=>setForm({...formState,surface:e.target.value})} style={IS}>
                <option value="grass">🌱 Grass</option><option value="turf">🏟 Turf</option></select></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
              <div><label style={LS}>Address</label><input value={formState.address} onChange={e=>setForm({...formState,address:e.target.value})} placeholder="e.g. 5241 36th St N, Arlington, VA 22207" style={IS}/></div>
              <div><label style={LS}>Kick-off</label><input value={formState.kickoff} onChange={e=>setForm({...formState,kickoff:e.target.value})} placeholder="e.g. 2:15 PM" style={IS}/></div>
            </div>
            <div>
              <label style={LS}>Positions played <span style={{color:C.faint,fontWeight:400}}>— 2nd and 3rd only if he moved</span></label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                {[0,1,2].map(i=>(
                  <select key={i} value={formState.positions[i]||""} onChange={e=>setForm({...formState,positions:formState.positions.map((v,j)=>j===i?e.target.value:v)})}
                          style={{...IS,padding:"12px 6px",textAlign:"center",textAlignLast:"center"}}>
                    <option value="">—</option>{POS.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                ))}
              </div>
            </div>

            <Section>RESULT</Section>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
              <div><label style={LS}>Started</label>
                <select value={formState.started===null||formState.started===undefined?"":String(formState.started)}
                        onChange={e=>setForm({...formState,started:e.target.value===""?null:e.target.value==="true"})} style={IS}>
                  <option value="">— Not recorded</option><option value="true">Yes — started</option><option value="false">No — off the bench</option>
                </select></div>
              <div><label style={LS}>Result</label>
                <select value={formState.result} onChange={e=>setForm({...formState,result:e.target.value})} style={IS}>
                  <option value="—">— Upcoming</option><option value="W">W – Win</option><option value="D">D – Draw</option><option value="L">L – Loss</option>
                </select></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {num("Score For","scoreFor")}{num("Score Against","scoreAgainst")}{num("Minutes","minutes",{max:"120"})}
            </div>

            <Section>STATS</Section>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              {num("Goals","goals")}{num("Assists","assists")}{num("Shots","shots")}{num("SOT","sot")}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              {num("Passes","passes")}{num("Tackles","tackles")}{num("Taka +","takaPos")}{num("Taka −","takaNeg")}
            </div>

            <Section>FILM</Section>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={LS}>Taka link</label><input value={formState.takaLink} onChange={e=>setForm({...formState,takaLink:e.target.value})} style={IS}/></div>
              <div><label style={LS}>Veo link</label><input value={formState.veoLink} onChange={e=>setForm({...formState,veoLink:e.target.value})} style={IS}/></div>
            </div>

            <p style={{color:C.faint,fontSize:12,lineHeight:1.6,margin:0}}>
              Rating, what went well, what to improve and questions for coaches are written
              in <strong style={{color:C.muted}}>Sebi's Review</strong> — they show here but are his to fill in.
            </p>
            <div style={{display:"flex",gap:12}}>
              <button onClick={saveEdit} style={BP}>Save</button>
              <button onClick={()=>setEditing(null)} style={BS}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
