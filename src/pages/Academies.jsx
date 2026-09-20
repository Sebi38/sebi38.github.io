import { useState, useEffect, useMemo, useRef } from 'react';
import { SK } from '../config.js';
import { C, CardS, GlassS, DISPLAY, BODY, PAGE, H2, IS, LS, BP, BS, RESULT, rise } from '../ui/theme.js';
import SectionTitle from '../ui/SectionTitle.jsx';
import Modal from '../ui/Modal.jsx';
import Pill from '../ui/Pill.jsx';
import {
  matrix, promotions, globalCallSheet, callSheet, calendar, health, entry, gate, annualCost, todayISO,
  DIMENSIONS, CONFIDENCE, TIERS, STAGES, DEFAULT_WEIGHTS,
} from '../lib/academies.js';
import { GATES, TRAVEL_TIERS } from '../data/academies/meta.js';
import { loadAcademies, cachedAcademies, importBundle, savePipeline } from '../lib/academyStore.js';

// ─────────────────────────────────────────────────────────────────────────────
// The academy search, on the site.
//
// Everything on this page comes from Firebase after sign-in (see
// academyStore.js). Nothing about the search is imported into the bundle:
// the repo is public and the site is static, so the sign-in screen only
// decides what is rendered, not what is served.
// ─────────────────────────────────────────────────────────────────────────────

const CONF_COLOR = {
  confirmed: RESULT.W.fg, reported: C.blue, dated: C.gold, unknown: C.faint, derived: C.violet,
};
const money = n => n == null ? "?" : n === 0 ? "$0" : "$" + n.toLocaleString();
const costBand = k => k.complete
  ? `${money(k.low)}–${money(k.high)}`
  : `${money(k.low)}–${k.high > 0 ? money(k.high) + "+" : "?"}`;
const daysUntil = iso => Math.round((new Date(iso) - new Date(todayISO())) / 86400000);
const fmtDays = n => n < 0 ? `${-n}d overdue` : n === 0 ? "today" : `${n}d`;
const dimLabel = id => DIMENSIONS.find(d => d.id === id)?.label || id;

const loadWeights = () => {
  try { const w = JSON.parse(localStorage.getItem(SK.academyWeights)); if (w && typeof w === "object") return { ...DEFAULT_WEIGHTS, ...w }; } catch {}
  return { ...DEFAULT_WEIGHTS };
};

// ── Small pieces ─────────────────────────────────────────────────────────────

function Bar({ value, max = 5, color = C.blue, width = 72 }) {
  const pct = Math.max(0, Math.min(1, (value ?? 0) / max));
  return (
    <span style={{display:"inline-block",width,height:5,background:C.line,borderRadius:3,verticalAlign:"middle",overflow:"hidden"}}>
      <span style={{display:"block",width:`${pct*100}%`,height:"100%",background:color,borderRadius:3}}/>
    </span>
  );
}

// Confidence as a chip. Never colour alone — the mark carries the meaning.
function Mark({ conf }) {
  const k = CONFIDENCE[conf] || CONFIDENCE.unknown;
  const col = CONF_COLOR[conf] || C.faint;
  return (
    <span title={k.meaning} style={{color:col,background:col+"22",border:`1px solid ${col}44`,borderRadius:5,
      padding:"1px 6px",fontSize:10.5,fontWeight:800,letterSpacing:.6,whiteSpace:"nowrap"}}>
      {k.mark} {k.label.toUpperCase()}
    </span>
  );
}

function Tile({ value, label, accent = C.blue, sub }) {
  return (
    <div style={{...CardS,padding:"14px 10px",textAlign:"center"}}>
      <div style={{fontFamily:DISPLAY,fontSize:30,color:accent,lineHeight:1}}>{value}</div>
      <div style={{color:C.muted,fontSize:10.5,fontWeight:700,letterSpacing:1.2,marginTop:5,textTransform:"uppercase"}}>{label}</div>
      {sub && <div style={{color:C.faint,fontSize:11,marginTop:2}}>{sub}</div>}
    </div>
  );
}

function Note({ children, style }) {
  return <div style={{color:C.ink3,fontSize:12.5,lineHeight:1.5,...style}}>{children}</div>;
}

// ── Sections ─────────────────────────────────────────────────────────────────

// The family's priorities. These save to this browser only — they are a way of
// looking at the data, not part of it.
function Weights({ weights, setWeights }) {
  const isDefault = DIMENSIONS.every(d => weights[d.id] === DEFAULT_WEIGHTS[d.id]);
  return (
    <div style={{...CardS,padding:"18px 18px 12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:12,marginBottom:4,flexWrap:"wrap"}}>
        <div>
          <div style={{color:C.ink,fontWeight:700,fontSize:14}}>What matters to you</div>
          <div style={{color:C.muted,fontSize:12.5}}>Drag a weight and the whole table reorders. 0 is irrelevant, 5 is decisive.</div>
        </div>
        {!isDefault && <button onClick={()=>setWeights({...DEFAULT_WEIGHTS})} style={{...BS,padding:"7px 14px",fontSize:12}}>Reset</button>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(215px,1fr))",gap:"12px 22px",marginTop:12}}>
        {DIMENSIONS.map(d => (
          <div key={d.id}>
            <label htmlFor={`w-${d.id}`} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,color:C.ink2,fontSize:13,fontWeight:600,marginBottom:4}}>
              {d.label}<span style={{color:C.red,fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{weights[d.id]}</span>
            </label>
            <input id={`w-${d.id}`} type="range" min="0" max="5" step="0.5" value={weights[d.id]}
                   onChange={e=>setWeights({...weights,[d.id]:+e.target.value})} style={{width:"100%"}}/>
            <div style={{color:C.faint,fontSize:11.5,marginTop:3,lineHeight:1.35}}>{d.asks}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Blockers({ blockers }) {
  const list = [...(blockers || [])].sort((a, z) => (a.dueBy || "").localeCompare(z.dueBy || ""));
  if (!list.length) return null;
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
      {list.map((b, i) => {
        const d = b.dueBy ? daysUntil(b.dueBy) : null;
        const col = d == null ? C.muted : d < 0 ? C.red : d <= 30 ? C.gold : C.ink3;
        return (
          <div key={b.id || i} style={{...CardS,padding:"14px 16px",...rise(i)}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"baseline"}}>
              <div style={{color:C.ink,fontWeight:700,fontSize:14,lineHeight:1.3}}>{b.title}</div>
              {d != null && <div style={{fontFamily:DISPLAY,fontSize:22,color:col,whiteSpace:"nowrap",lineHeight:1}}>{fmtDays(d)}</div>}
            </div>
            {b.dueBy && <div style={{color:C.faint,fontSize:11.5,marginTop:2}}>by {b.dueBy}</div>}
            <Note style={{marginTop:8}}><span style={{color:C.muted,fontWeight:700}}>Blocks:</span> {b.blocks}</Note>
          </div>
        );
      })}
    </div>
  );
}

const COLS = [
  { k:"name",          l:"Club",     align:"left"  },
  { k:"adjusted",      l:"Fit",      align:"right", tip:"Weighted score with confidence priced in" },
  { k:"odds",          l:"Odds",     align:"right", tip:"Realistic chance of a place" },
  { k:"expectedValue", l:"EV",       align:"right", tip:"Fit × odds — the default sort" },
  { k:"coverage",      l:"Ev'd",     align:"right", tip:"Share of the weighted decision that is evidenced" },
  { k:"rank",          l:"Rank",     align:"right", tip:"US Soccer Collective, Aug 2026" },
  { k:"travel",        l:"Travel",   align:"left"  },
];

function MatrixTable({ rows, sortBy, dir, onSort, onOpen }) {
  return (
    <div style={{...CardS,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:640}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line2}`}}>
          <th style={{width:26}}/>
          {COLS.map(c => (
            <th key={c.k} title={c.tip} onClick={()=>onSort(c.k)}
                style={{color:sortBy===c.k?C.ink:C.muted,fontWeight:700,padding:"11px 10px",textAlign:c.align,
                        whiteSpace:"nowrap",fontSize:11,letterSpacing:1,cursor:"pointer",userSelect:"none"}}>
              {c.l.toUpperCase()}{sortBy===c.k && <span style={{color:C.red}}> {dir<0?"▾":"▴"}</span>}
            </th>
          ))}
        </tr></thead>
        <tbody>{rows.map(r => {
          const k = r.computed, thin = k.coverage < 60, deep = r.tier === "deep-dive";
          const dim = r.blocked ? C.faint : thin ? C.ink3 : C.ink;
          return (
            <tr key={r.id} onClick={()=>onOpen(r.id)} className="lift"
                style={{borderBottom:`1px solid ${C.line}`,cursor:"pointer",opacity:r.blocked?.55:1}}>
              <td style={{padding:"11px 4px 11px 12px",color:deep?C.red:C.faint,fontWeight:800,fontSize:12}}>{TIERS[r.tier]?.mark}</td>
              <td style={{padding:"11px 10px",whiteSpace:"nowrap"}}>
                <div style={{color:dim,fontWeight:deep?700:500}}>{r.name}</div>
                <div style={{color:C.faint,fontSize:11.5}}>{r.city}{r.blocked && <span style={{color:C.red,fontWeight:700}}> · Article 19</span>}</div>
              </td>
              <td style={{padding:"11px 10px",textAlign:"right",color:dim,fontVariantNumeric:"tabular-nums"}}>{k.adjusted.toFixed(2)}</td>
              <td style={{padding:"11px 10px",textAlign:"right",color:dim,fontVariantNumeric:"tabular-nums"}}>{k.odds.toFixed(1)}</td>
              <td style={{padding:"11px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:800,color:r.blocked?C.faint:C.ink}}>
                {r.blocked ? "0" : k.expectedValue.toFixed(2)}
                <Bar value={r.blocked?0:k.expectedValue} color={C.red} width={44}/>
              </td>
              <td style={{padding:"11px 10px",textAlign:"right",color:thin?C.gold:C.ink3,fontVariantNumeric:"tabular-nums"}}>{k.coverage}%</td>
              <td style={{padding:"11px 10px",textAlign:"right",color:C.ink3,fontVariantNumeric:"tabular-nums"}}>{r.rank?.value ? `#${r.rank.value}` : "—"}</td>
              <td style={{padding:"11px 10px",color:C.ink3,whiteSpace:"nowrap"}}>
                <span style={{color:C.faint,fontSize:11,fontWeight:700}}>T{r.travelTier}</span> {r.travelNote}
              </td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

function Promotions({ list, onOpen }) {
  if (!list.length) return <Note>None. Every club being pursued outscores every club that is not.</Note>;
  return (
    <div>
      <Note style={{marginBottom:12}}>
        Above <b style={{color:C.ink2}}>{list[0].outscores}</b> (EV {list[0].floor.toFixed(2)}), the weakest club being actively pursued.
        Either promote them or write down why not. <b style={{color:C.ink2}}>Odds</b> means the score is carried by national reach or
        the drivable rule, not by anything known about the club.
      </Note>
      <div style={{display:"grid",gap:8}}>
        {list.map((r, i) => (
          <div key={r.id} onClick={()=>onOpen(r.id)} className="lift" style={{...CardS,padding:"12px 16px",cursor:"pointer",...rise(i)}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"baseline",flexWrap:"wrap"}}>
              <div style={{color:C.ink,fontWeight:700}}>{r.name} <span style={{color:C.faint,fontWeight:400,fontSize:12}}>#{r.rank?.value ?? "—"} · T{r.travelTier}</span></div>
              <div style={{fontSize:12.5,color:C.ink3,whiteSpace:"nowrap"}}>
                EV <b style={{color:C.ink}}>{r.computed.expectedValue.toFixed(2)}</b> · fit {r.computed.adjusted.toFixed(2)} · odds {r.computed.odds.toFixed(1)} ·
                <span style={{color:r.carriedBy==="fit"?RESULT.W.fg:C.gold,fontWeight:700}}> {r.carriedBy}</span>
              </div>
            </div>
            <Note style={{marginTop:4}}>{r.screening?.summary}</Note>
          </div>
        ))}
      </div>
    </div>
  );
}

const QMark = ({ q }) => (
  <span style={{color:q.decisive||q.blocking?C.red:C.faint,fontWeight:800,marginRight:6}}>{q.decisive?"★":q.blocking?"●":"○"}</span>
);

function CallSheet({ calls, onOpen }) {
  if (!calls.length) return <Note>No deep-dive clubs are live.</Note>;
  return (
    <div style={{display:"grid",gap:10}}>
      {calls.map((g, i) => (
        <div key={g.clubId} style={{...CardS,padding:"14px 16px",...rise(i)}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
            <div onClick={()=>onOpen(g.clubId)} style={{color:C.ink,fontWeight:700,cursor:"pointer"}}>
              <span style={{color:C.faint,fontFamily:DISPLAY,fontSize:18,marginRight:8}}>{i+1}</span>{g.club}
              {g.posture==="gated" && <span style={{color:C.gold,fontSize:11,fontWeight:800,marginLeft:8,letterSpacing:1}}>GATED</span>}
            </div>
            <div style={{color:C.faint,fontSize:12}}>value {g.weighted}</div>
          </div>
          {g.gatedOn && <Note style={{color:C.gold,marginTop:4}}>{g.gatedOn}</Note>}
          <ul style={{listStyle:"none",padding:0,margin:"8px 0 0",display:"grid",gap:5}}>
            {g.questions.map((q, j) => (
              <li key={j} style={{color:C.ink2,fontSize:13,lineHeight:1.45}}>
                <QMark q={q}/>{q.q} <span style={{color:C.faint,fontSize:11}}>{q.effort}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Note><span style={{color:C.red}}>★</span> decisive — puts the club on the list or takes it off · <span style={{color:C.red}}>●</span> blocking · ○ clarifying</Note>
    </div>
  );
}

function Calendar({ dates }) {
  if (!dates.length) return null;
  return (
    <div style={{display:"grid",gap:6}}>
      {dates.map(d => (
        <div key={d.date} style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:12,alignItems:"baseline",padding:"9px 0",borderBottom:`1px solid ${C.line}`}}>
          <div style={{color:d.hard?C.red:C.faint,fontWeight:800}}>{d.hard?"■":"□"} <span style={{color:C.ink3,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{d.date}</span></div>
          <div><div style={{color:C.ink,fontWeight:700,fontSize:13.5}}>{d.label}</div><Note>{d.detail}</Note></div>
          <div style={{fontFamily:DISPLAY,fontSize:20,color:d.daysAway<=30?C.gold:C.ink3}}>{fmtDays(d.daysAway)}</div>
        </div>
      ))}
    </div>
  );
}

// ── One club ─────────────────────────────────────────────────────────────────

function Pipeline({ club, onSave }) {
  const base = club.pipeline || {};
  const [p, setP] = useState({ stage: base.stage || "not-contacted", owner: base.owner || "", nextAction: base.nextAction || "",
                               dueBy: base.dueBy || "", lastContact: base.lastContact || "", log: base.log || [] });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setP({ ...p, [k]: v });

  const addNote = () => {
    if (!note.trim()) return;
    const t = todayISO();
    setP({ ...p, log: [{ date: t, note: note.trim() }, ...p.log], lastContact: t });
    setNote("");
  };
  const save = async () => {
    setBusy(true); setErr(null);
    try { await onSave(p); } catch (e) { setErr(e?.message || "Could not save."); }
    setBusy(false);
  };

  return (
    <div style={{...GlassS,padding:18,marginTop:18}}>
      <div style={{color:C.red,fontSize:10,fontWeight:800,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Pipeline</div>
      <div className="pair">
        <div>
          <label style={LS}>Stage</label>
          <select value={p.stage} onChange={e=>set("stage",e.target.value)} style={IS}>
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label style={LS}>Owner</label>
          <input value={p.owner} onChange={e=>set("owner",e.target.value)} style={IS} placeholder="Who is on it"/>
        </div>
      </div>
      <div style={{marginTop:12}}>
        <label style={LS}>Next action</label>
        <textarea value={p.nextAction} onChange={e=>set("nextAction",e.target.value)} rows={2} style={{...IS,resize:"vertical"}}/>
      </div>
      <div className="pair" style={{marginTop:12}}>
        <div><label style={LS}>Due by</label><input type="date" value={p.dueBy} onChange={e=>set("dueBy",e.target.value)} style={IS}/></div>
        <div><label style={LS}>Last contact</label><input type="date" value={p.lastContact} onChange={e=>set("lastContact",e.target.value)} style={IS}/></div>
      </div>

      <div style={{marginTop:16}}>
        <label style={LS}>Log</label>
        <div style={{display:"flex",gap:8}}>
          <input value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>{ if (e.key==="Enter") addNote(); }}
                 style={IS} placeholder="Who you spoke to, what they said…"/>
          <button onClick={addNote} style={{...BS,whiteSpace:"nowrap"}}>Add</button>
        </div>
        {p.log.length > 0 && (
          <ul style={{listStyle:"none",padding:0,margin:"10px 0 0",display:"grid",gap:6}}>
            {p.log.map((l, i) => (
              <li key={i} style={{color:C.ink2,fontSize:13,display:"flex",gap:10}}>
                <span style={{color:C.faint,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{l.date}</span>
                <span style={{flex:1}}>{l.note}</span>
                <button onClick={()=>set("log",p.log.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.faint,cursor:"pointer"}}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{display:"flex",gap:10,alignItems:"center",marginTop:16,flexWrap:"wrap"}}>
        <button onClick={save} disabled={busy} style={{...BP,opacity:busy?.6:1}}>{busy ? "Saving…" : "Save pipeline"}</button>
        {err && <span style={{color:RESULT.L.fg,fontSize:13}}>{err}</span>}
        {base.editedAt && !err && <span style={{color:C.faint,fontSize:12}}>last saved {base.editedAt.slice(0,10)}</span>}
      </div>
    </div>
  );
}

function ClubModal({ row, onClose, onSavePipeline }) {
  const k = row.computed, deep = row.tier === "deep-dive";
  const cost = annualCost(row);
  const calls = deep && !row.blocked ? callSheet(row, { limit: 6 }) : [];
  const sc = row.screening || {};
  const Section = ({ title, children }) => (
    <div style={{marginTop:20}}>
      <div style={{color:C.red,fontSize:10,fontWeight:800,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{title}</div>
      {children}
    </div>
  );

  return (
    <Modal title={row.name} onClose={onClose} wide>
      <div style={{color:C.ink3,fontSize:13,marginTop:-16,marginBottom:16}}>
        {row.city} · {row.rank?.value ? `#${row.rank.value} of ${row.rank.of}` : "unranked"} · {TRAVEL_TIERS[row.travelTier]?.label} · {row.travelNote}
        <span style={{marginLeft:8,color:deep?C.red:C.faint,fontWeight:700}}>{TIERS[row.tier]?.mark} {TIERS[row.tier]?.label}</span>
      </div>
      {row.blocked && <div style={{...CardS,padding:"10px 14px",color:C.red,fontSize:13,marginBottom:12,borderColor:C.red+"55"}}>{row.blocked}</div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        <Tile value={k.adjusted.toFixed(2)} label="Fit" accent={C.blue}/>
        <Tile value={k.odds.toFixed(1)} label="Odds" accent={C.gold}/>
        <Tile value={row.blocked?"0":k.expectedValue.toFixed(2)} label="EV" accent={C.red}/>
        <Tile value={`${k.coverage}%`} label="Evidenced" accent={k.coverage<60?C.gold:RESULT.W.fg}
              sub={k.faith>=0.1?`${k.faith.toFixed(2)} on faith`:null}/>
      </div>

      {(row.assessment || sc.summary) && (
        <Section title={deep ? "Assessment" : "Summary"}>
          <div style={{color:C.ink2,fontSize:14,lineHeight:1.6}}>{row.assessment || sc.summary}</div>
        </Section>
      )}

      {row.research?.posture === "gated" && (
        <Section title="Gated on">
          <div style={{color:C.gold,fontSize:13.5,lineHeight:1.5}}>{row.research.gatedOn}</div>
        </Section>
      )}

      {calls.length > 0 && (
        <Section title="Ask first">
          <ul style={{listStyle:"none",padding:0,margin:0,display:"grid",gap:6}}>
            {calls.map((q, i) => <li key={i} style={{color:C.ink2,fontSize:13.5,lineHeight:1.45}}><QMark q={q}/>{q.q} <span style={{color:C.faint,fontSize:11}}>{q.effort} · {q.ask}</span></li>)}
          </ul>
        </Section>
      )}

      <Section title="Dimensions">
        <div style={{display:"grid",gap:8}}>
          {DIMENSIONS.map(d => {
            const e = d.id === "cost" ? { ...entry(row, "cost"), conf: "derived" } : entry(row, d.id);
            const s = e?.score;
            return (
              <div key={d.id} style={{borderBottom:`1px solid ${C.line}`,paddingBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <div style={{color:C.ink,fontWeight:600,fontSize:13,minWidth:180}}>{d.label} <span style={{color:C.faint,fontWeight:400,fontSize:11}}>×{DEFAULT_WEIGHTS[d.id]}</span></div>
                  <Bar value={s} color={s==null?C.faint:C.blue}/>
                  <span style={{color:s==null?C.faint:C.ink2,fontWeight:700,fontVariantNumeric:"tabular-nums",minWidth:28}}>{s==null?"—":s}</span>
                  <Mark conf={e?.conf || "unknown"}/>
                  {d.id === "cost" && <span style={{color:C.ink3,fontSize:12.5}}>{costBand(cost)}/yr{cost.open.length?` · ${cost.open.join(", ")} open`:""}</span>}
                </div>
                {e?.note && <Note style={{marginTop:4}}>{e.note}</Note>}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Gates">
        {GATES.map(g => {
          const e = gate(row, g.id);
          return (
            <div key={g.id} style={{marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={{color:C.ink,fontWeight:600,fontSize:13,minWidth:180}}>{g.label}</div>
                <Bar value={e?.score} color={e?.score==null?C.faint:C.gold}/>
                <span style={{color:e?.score==null?C.faint:C.ink2,fontWeight:700,minWidth:28}}>{e?.score==null?"—":e.score}</span>
                <Mark conf={e?.conf || "unknown"}/>
              </div>
              {e?.note && <Note style={{marginTop:4}}>{e.note}</Note>}
            </div>
          );
        })}
      </Section>

      {k.divergences?.length > 0 && (
        <Section title="Screening vs research">
          <Note>Where a closer look disagreed with the screening score by a point or more — the numbers to argue about.</Note>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
            {k.divergences.map(d => (
              <span key={d.dim} style={{...CardS,padding:"6px 10px",fontSize:12.5,color:C.ink2}}>
                {dimLabel(d.dim)} <span style={{color:C.faint}}>{d.screening}</span> → <b style={{color:d.gap>0?RESULT.W.fg:RESULT.L.fg}}>{d.research}</b>
              </span>
            ))}
          </div>
        </Section>
      )}

      {row.risks?.length > 0 && (
        <Section title="Risks">
          <ul style={{margin:0,paddingLeft:18,color:C.ink2,fontSize:13.5,lineHeight:1.6}}>{row.risks.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </Section>
      )}

      {row.profile?.caseStudy && <Section title="Case study"><div style={{color:C.ink2,fontSize:13.5,lineHeight:1.6}}>{row.profile.caseStudy}</div></Section>}

      {(row.profile?.contact?.interestForm || row.profile?.contact?.email) && (
        <Section title="Contact">
          <Note>{[row.profile.contact.interestForm, row.profile.contact.email].filter(Boolean).join(" · ")}</Note>
        </Section>
      )}

      {deep && !row.blocked && <Pipeline key={row.pipeline?.editedAt || "new"} club={row} onSave={p => onSavePipeline(row.id, p)}/>}
      {!deep && !row.blocked && (
        <Note style={{marginTop:18,color:C.faint}}>Screening only. Promote it by adding a research record in private/academies/research.js and re-importing.</Note>
      )}
    </Modal>
  );
}

// ── The page ─────────────────────────────────────────────────────────────────

const FILTERS = [
  { id:"all",      l:"All" },
  { id:"deep",     l:"Deep dive" },
  { id:"drive",    l:"Drivable" },
  { id:"national", l:"Recruits nationally" },
];

export default function Academies() {
  const [data, setData] = useState(() => cachedAcademies());
  const [state, setState] = useState("loading");     // loading | ready | offline | empty
  const [weights, setWeightsRaw] = useState(loadWeights);
  const [sortBy, setSortBy] = useState("expectedValue");
  const [dir, setDir] = useState(-1);
  const [filter, setFilter] = useState("all");
  const [hideBlocked, setHideBlocked] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef();

  const setWeights = w => { setWeightsRaw(w); try { localStorage.setItem(SK.academyWeights, JSON.stringify(w)); } catch {} };

  useEffect(() => {
    let live = true;
    loadAcademies().then(({ data: d, offline }) => {
      if (!live) return;
      setData(d);
      setState(d ? (offline ? "offline" : "ready") : "empty");
    });
    return () => { live = false; };
  }, []);

  const clubs = data?.clubs || [];
  const scored = useMemo(() => (clubs.length ? matrix(clubs, { weights }) : []), [clubs, weights]);
  const h = useMemo(() => (clubs.length ? health(clubs, weights) : null), [clubs, weights]);
  const promo = useMemo(() => (clubs.length ? promotions(clubs, weights) : []), [clubs, weights]);
  const calls = useMemo(() => (clubs.length ? globalCallSheet(clubs, { limit: 8, perClub: 4 }) : []), [clubs]);
  const dates = useMemo(() => calendar(data?.keyDates || []), [data]);

  const rows = useMemo(() => {
    let r = scored;
    if (filter === "deep") r = r.filter(x => x.tier === "deep-dive");
    if (filter === "drive") r = r.filter(x => x.travelTier <= 2);
    if (filter === "national") r = r.filter(x => x.computed.odds >= 4.5);
    if (hideBlocked) r = r.filter(x => !x.blocked);
    const val = x => sortBy === "name" ? x.name : sortBy === "rank" ? (x.rank?.value ?? 99) : sortBy === "travel" ? x.travelTier : (x.computed[sortBy] ?? 0);
    return [...r].sort((a, b) => {
      const va = val(a), vb = val(b);
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      // Rank and travel read best-first ascending; everything else descending.
      return (sortBy === "rank" || sortBy === "travel" || sortBy === "name") ? cmp * -dir : cmp * dir;
    });
  }, [scored, filter, hideBlocked, sortBy, dir]);

  const onSort = k => { if (k === sortBy) setDir(-dir); else { setSortBy(k); setDir(-1); } };

  const onFile = async e => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setMsg({ ok: true, text: "Importing…" });
    try {
      const bundle = JSON.parse(await f.text());
      const next = await importBundle(bundle, data);
      setData(next); setState("ready");
      setMsg({ ok: true, text: `Imported ${next.clubs.length} clubs from a bundle exported ${bundle.exported}.` });
    } catch (err) {
      setMsg({ ok: false, text: err?.message || "Couldn't import that file." });
    }
  };

  const onSavePipeline = async (clubId, pipeline) => {
    const next = await savePipeline(data, clubId, pipeline);
    setData(next);
  };

  const openRow = openId ? scored.find(r => r.id === openId) : null;

  return (
    <div style={PAGE}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <h2 style={H2}>🎓 ACADEMIES</h2>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} style={{display:"none"}}/>
          <button onClick={()=>fileRef.current?.click()} style={{...BS,color:C.blue,borderColor:C.blue+"44"}}>📂 Import bundle</button>
        </div>
      </div>

      {msg && <div style={{color:msg.ok?RESULT.W.fg:RESULT.L.fg,fontSize:13,marginBottom:14}}>{msg.text}</div>}
      {state === "offline" && <div style={{color:C.gold,fontSize:13,marginBottom:14}}>⚡ Offline — showing the last copy saved on this device.</div>}

      {state === "loading" && !data && <div style={{color:C.muted,padding:40,textAlign:"center"}}>Loading…</div>}

      {state === "empty" && (
        <div style={{...CardS,padding:40,textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:10}}>🎓</div>
          <div style={{color:C.ink,fontWeight:700,fontSize:16}}>No academy data yet</div>
          <div style={{color:C.ink3,fontSize:13.5,marginTop:8,lineHeight:1.6,maxWidth:520,marginInline:"auto"}}>
            On a machine with <code style={{color:C.blue}}>private/academies/</code>, run
            <code style={{color:C.blue,display:"block",margin:"8px 0"}}>npm run academies -- --export</code>
            then choose <code style={{color:C.blue}}>private/academies/bundle.json</code> above. It goes to the database behind sign-in, never into the site.
          </div>
        </div>
      )}

      {data && h && (
        <>
          {/* ── Health ────────────────────────────────────────────────── */}
          <div style={{...GlassS,padding:"14px 18px",marginBottom:28,display:"flex",gap:18,flexWrap:"wrap",alignItems:"baseline"}}>
            <span style={{color:C.ink,fontWeight:700}}>{h.clubs} clubs</span>
            <span style={{color:C.ink3,fontSize:13}}><b style={{color:C.red}}>{h.deepDive}</b> in deep research</span>
            <span style={{color:C.ink3,fontSize:13}}><b style={{color:C.ink}}>{h.avgCoverage}%</b> of the deep-dive decision evidenced</span>
            <span style={{color:C.ink3,fontSize:13}}><b style={{color:C.ink}}>{h.contacted}</b> contacted</span>
            <span style={{color:C.faint,fontSize:12,marginLeft:"auto"}}>bundle {data.exported}{data.imported?` · imported ${data.imported.slice(0,10)}`:""}</span>
            {h.noRoute.length > 0 && <div style={{flexBasis:"100%",color:C.red,fontSize:12.5}}>No way in on file — no form, no email: {h.noRoute.join(", ")}</div>}
            {h.unreliable.length > 0 && <div style={{flexBasis:"100%",color:C.gold,fontSize:12.5}}>Too thin to rank honestly: {h.unreliable.join(", ")}</div>}
          </div>

          {/* ── Ours to decide ────────────────────────────────────────── */}
          {data.blockers?.length > 0 && (
            <>
              <SectionTitle>OURS TO DECIDE</SectionTitle>
              <div style={{marginBottom:36}}><Blockers blockers={data.blockers}/></div>
            </>
          )}

          {/* ── Weights ───────────────────────────────────────────────── */}
          <div style={{marginBottom:28}}><Weights weights={weights} setWeights={setWeights}/></div>

          {/* ── The matrix ────────────────────────────────────────────── */}
          <SectionTitle right={<span style={{color:C.muted,fontSize:12}}>{rows.length} of {scored.length}</span>}>THE MATRIX</SectionTitle>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
            {FILTERS.map(f => <Pill key={f.id} label={f.l} active={filter===f.id} onClick={()=>setFilter(f.id)}/>)}
            <Pill label="Hide blocked" active={hideBlocked} onClick={()=>setHideBlocked(!hideBlocked)}/>
          </div>
          <MatrixTable rows={rows} sortBy={sortBy} dir={dir} onSort={onSort} onOpen={setOpenId}/>
          <Note style={{marginTop:8,marginBottom:36}}>
            <span style={{color:C.red,fontWeight:800}}>●</span> deep dive · <span style={{color:C.faint,fontWeight:800}}>○</span> screening.
            Fit is the weighted score with confidence priced in; odds is the chance of a place; EV is fit × odds.
            A screening club sits near the prior on fit, so its EV is mostly odds. Tap a row for the reasoning.
          </Note>

          {/* ── Promotions ────────────────────────────────────────────── */}
          <SectionTitle>OUTSCORING THE SHORTLIST</SectionTitle>
          <div style={{marginBottom:36}}><Promotions list={promo} onOpen={setOpenId}/></div>

          {/* ── Call sheet ────────────────────────────────────────────── */}
          <SectionTitle>THE CALL SHEET</SectionTitle>
          <Note style={{marginBottom:12}}>Clubs in the order worth phoning. A club is scored on what one conversation settles — a decisive answer is worth the club's whole candidacy, divided by how hard it is to get.</Note>
          <div style={{marginBottom:36}}><CallSheet calls={calls} onOpen={setOpenId}/></div>

          {/* ── Calendar ──────────────────────────────────────────────── */}
          {dates.length > 0 && (
            <>
              <SectionTitle>THE CALENDAR</SectionTitle>
              <div style={{marginBottom:36}}><Calendar dates={dates}/></div>
            </>
          )}
        </>
      )}

      {openRow && <ClubModal row={openRow} onClose={()=>setOpenId(null)} onSavePipeline={onSavePipeline}/>}
    </div>
  );
}
