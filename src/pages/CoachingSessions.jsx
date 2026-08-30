import { useState, useMemo } from 'react';
import { SK } from '../config.js';
import { ld, sv, gid } from '../lib/storage.js';
import { parseFathomRecap, parseBundle, findStats } from '../lib/fathom.js';
import { prettyDate } from '../lib/season.js';
import { KINDS, kindLabel, kindOf, byDateDesc } from '../lib/coaching.js';
import { C, CardS, DISPLAY, BODY, IS, LS, BP, BS, RESULT, rise } from '../ui/theme.js';
import Empty from '../ui/Empty.jsx';
import Modal from '../ui/Modal.jsx';
import Pill from '../ui/Pill.jsx';

const Block = ({ title, items, color, icon }) => (
  !items?.length ? null : (
    <div style={{marginBottom:14}}>
      <div style={{color,fontSize:11.5,fontWeight:700,letterSpacing:1.2,marginBottom:6}}>{icon} {title}</div>
      <ul style={{margin:0,paddingLeft:18,display:"grid",gap:5}}>
        {items.map((t,i)=>(
          <li key={i} style={{color:C.ink2,fontSize:13.5,lineHeight:1.55}}>{t}</li>
        ))}
      </ul>
    </div>
  )
);

// Every session someone ran with Sebi: the GIKA10 1:1 reviews recorded by
// Fathom, and the First Touch Aid academy Zooms. Both used to be scattered —
// the GIKA10 recaps here, the FTA sessions filed as Training "Resources"
// alongside playlists and PDFs. A session is not a resource, so they are now
// one list.
//
// GIKA10 recaps are imported by pasting the recap email — the content is
// personal, so it is never stored in this repository, only in the database
// behind the login.
export default function CoachingSessions() {
  const [sessions, setSessions] = useState(() => ld(SK.coaching) || []);
  const [importing, setImporting] = useState(false);
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [kind, setKind] = useState("all");

  const persist = u => { setSessions(u); sv(SK.coaching, u); };

  const ordered = useMemo(() => {
    const list = kind === "all" ? sessions : sessions.filter(s => kindOf(s) === kind);
    return [...list].sort(byDateDesc);
  }, [sessions, kind]);

  // Only offer a filter once there is more than one kind to filter.
  const present = useMemo(
    () => Object.keys(KINDS).filter(k => sessions.some(s => kindOf(s) === k)), [sessions]);

  // Accepts either one pasted recap email or a bundle of already-parsed ones.
  const [batch, setBatch] = useState(null);
  const doParse = text => {
    setRaw(text);
    if (!text.trim()) { setPreview(null); setBatch(null); return; }
    const bundle = parseBundle(text);
    if (bundle) { setBatch(bundle); setPreview(null); return; }
    setBatch(null);
    setPreview(parseFathomRecap(text));
  };

  const saveMany = () => {
    if (!batch?.length) return;
    let next = [...sessions];
    for (const row of batch) {
      const dupe = next.find(s =>
        (row.shareUrl && s.shareUrl === row.shareUrl) || (!row.shareUrl && s.date === row.date));
      const withId = { ...row, id: dupe?.id || gid(), importedAt: new Date().toISOString() };
      next = dupe ? next.map(s => s.id === dupe.id ? withId : s) : [withId, ...next];
    }
    persist(next);
    setImporting(false); setRaw(""); setPreview(null); setBatch(null);
  };

  const save = () => {
    if (!preview?.ok) return;
    // Same meeting pasted twice replaces the earlier copy rather than duplicating.
    const dupe = sessions.find(s =>
      (preview.shareUrl && s.shareUrl === preview.shareUrl) ||
      (!preview.shareUrl && s.date === preview.date));
    const row = { ...preview, id: dupe?.id || gid(), importedAt: new Date().toISOString() };
    persist(dupe ? sessions.map(s => s.id === dupe.id ? row : s) : [row, ...sessions]);
    setImporting(false); setRaw(""); setPreview(null);
  };

  const remove = id => persist(sessions.filter(s => s.id !== id));

  return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
        {present.length > 1 && (
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Pill label={`All (${sessions.length})`} active={kind==="all"} onClick={()=>setKind("all")}/>
            {present.map(k => (
              <Pill key={k} active={kind===k} onClick={()=>setKind(k)}
                    label={`${KINDS[k].label} (${sessions.filter(s=>kindOf(s)===k).length})`}/>
            ))}
          </div>
        )}
        {present.length <= 1 && (
          <div style={{color:C.muted,fontSize:13}}>
            {sessions.length} {sessions.length===1?"session":"sessions"}
          </div>
        )}
        <button onClick={()=>{setImporting(true);setRaw("");setPreview(null);}}
                style={{...BP,marginLeft:"auto"}}>+ Import recap</button>
      </div>

      {ordered.length === 0 ? (
        <Empty icon="🧑‍🏫" text={kind==="all"
          ? "No coaching sessions yet. Paste a Fathom recap email to bring one in."
          : `No ${kindLabel(kind)} sessions yet.`}/>
      ) : (
        <div style={{display:"grid",gap:10}}>
          {ordered.map((s,i)=>{
            const open = expanded === s.id;
            const stats = findStats(s);
            const k = kindOf(s);
            const accent = C[KINDS[k]?.color] || C.violet;
            // A GIKA10 recap is identified by when it happened — they are
            // weekly and all called the same thing. An FTA session has a real
            // title ("Scanning & Awareness"), so that leads instead.
            const headline = k === "fta" && s.title
              ? s.title
              : (s.date ? prettyDate(s.date) : "Undated session");
            // Minutes only here for a kind whose headline is the title —
            // otherwise the headline already says it.
            const sub = [k === "fta" && s.date ? prettyDate(s.date) : null,
                         k === "fta" && s.minutes ? `${s.minutes} min` : null,
                         s.purpose || (k === "fta" ? null : s.title)].filter(Boolean).join(" · ");
            return (
              <div key={s.id} style={{...CardS,overflow:"hidden",borderLeft:`3px solid ${accent}`,...rise(i)}}>
                <div onClick={()=>setExpanded(open?null:s.id)}
                     style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{color:accent,fontSize:9.5,fontWeight:800,letterSpacing:1.3,
                                    background:`${accent}1f`,border:`1px solid ${accent}44`,
                                    padding:"2px 7px",borderRadius:5,textTransform:"uppercase"}}>
                        {kindLabel(k)}
                      </span>
                      <span style={{color:C.ink,fontWeight:700,fontSize:15}}>
                        {headline}
                        {k !== "fta" && s.minutes
                          ? <span style={{color:C.muted,fontWeight:500}}> · {s.minutes} min</span> : null}
                      </span>
                    </div>
                    {sub && (
                      <div style={{color:C.muted,fontSize:12.5,marginTop:3,overflow:"hidden",
                                   textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sub}</div>
                    )}
                  </div>
                  {s.takeaways?.length ? (
                    <span style={{color:C.violet,fontSize:11,fontWeight:700,background:"rgba(155,89,182,.14)",
                                  border:`1px solid ${C.violet}44`,padding:"2px 8px",borderRadius:5,flexShrink:0}}>
                      {s.takeaways.length} takeaways
                    </span>
                  ) : null}
                  <span style={{color:C.faint,fontSize:16,transform:open?"rotate(180deg)":"none",
                                transition:"transform .2s"}}>▼</span>
                </div>

                {open && (
                  <div style={{padding:"0 18px 18px",borderTop:`1px solid ${C.line}`,paddingTop:16}}>
                    {s.purpose && (
                      <div style={{marginBottom:14}}>
                        <div style={{color:C.blue,fontSize:11.5,fontWeight:700,letterSpacing:1.2,marginBottom:5}}>🎯 PURPOSE</div>
                        <div style={{color:C.ink2,fontSize:13.5,lineHeight:1.55}}>{s.purpose}</div>
                      </div>
                    )}
                    <Block title="KEY TAKEAWAYS" items={s.takeaways} color={RESULT.W.fg} icon="⭐"/>
                    <Block title="TOPICS" items={s.topics} color={C.blue} icon="💬"/>
                    <Block title="NEXT STEPS" items={s.nextSteps} color={C.gold} icon="➡️"/>
                    <Block title="ACTION ITEMS" items={s.actionItems} color={C.red} icon="✅"/>

                    {stats.length > 0 && (
                      <div style={{marginBottom:14,background:C.bg,borderRadius:10,padding:"12px 14px"}}>
                        <div style={{color:C.teal,fontSize:11.5,fontWeight:700,letterSpacing:1.2,marginBottom:8}}>
                          📊 NUMBERS MENTIONED
                        </div>
                        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                          {stats.map((st,j)=>(
                            <div key={j}>
                              <span style={{fontFamily:DISPLAY,fontSize:22,color:C.teal}}>{st.value}</span>
                              <span style={{color:C.muted,fontSize:12,marginLeft:5}}>{st.label}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{color:C.faint,fontSize:11.5,marginTop:8,lineHeight:1.5}}>
                          Pulled from the discussion. Not written into any match — the notes don't
                          reliably say which game they belong to, so add them yourself if you want them.
                        </div>
                      </div>
                    )}

                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
                      {s.shareUrl && (
                        <a href={s.shareUrl} target="_blank" rel="noopener noreferrer"
                           style={{...BS,padding:"6px 14px",fontSize:12,color:accent,
                                   borderColor:accent+"44",textDecoration:"none"}}>
                          🎥 {s.shareUrl.includes("fathom.video") ? "Watch on Fathom" : "Watch the session"}
                        </a>
                      )}
                      <button onClick={()=>remove(s.id)}
                              style={{...BS,padding:"6px 14px",fontSize:12,color:C.red,borderColor:C.red+"33"}}>🗑 Remove</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {importing && (
        <Modal title="IMPORT A COACHING RECAP" onClose={()=>setImporting(false)} wide>
          <div style={{display:"grid",gap:14}}>
            <p style={{color:C.ink3,fontSize:13.5,lineHeight:1.6,margin:0}}>
              Open the Fathom recap email, select all of it, and paste it below. It is read
              here in your browser and saved to your database — it never goes near the
              public code.
            </p>
            <textarea value={raw} onChange={e=>doParse(e.target.value)} rows={8}
                      placeholder="Paste a recap email — or the whole bundle file — here…"
                      style={{...IS,resize:"vertical",fontSize:13,lineHeight:1.5,fontFamily:"monospace"}}/>

            {preview && !preview.ok && (
              <div style={{color:RESULT.L.fg,fontSize:13}}>{preview.error}</div>
            )}

            {batch?.length > 0 && (
              <div style={{...CardS,padding:"16px 18px"}}>
                <div style={{color:RESULT.W.fg,fontSize:11.5,fontWeight:800,letterSpacing:1.4,marginBottom:10}}>
                  ✓ BUNDLE — {batch.length} SESSIONS
                </div>
                <div style={{display:"grid",gap:5}}>
                  {batch.map((b,i)=>(
                    <div key={i} style={{color:C.ink2,fontSize:13}}>
                      {b.date ? prettyDate(b.date) : "undated"}
                      <span style={{color:C.muted}}> · {b.takeaways.length} takeaways · {b.actionItems.length} actions</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview?.ok && (
              <div style={{...CardS,padding:"16px 18px"}}>
                <div style={{color:RESULT.W.fg,fontSize:11.5,fontWeight:800,letterSpacing:1.4,marginBottom:10}}>
                  ✓ FOUND
                </div>
                <div style={{display:"grid",gap:6,fontSize:13,color:C.ink2}}>
                  <div><span style={{color:C.muted}}>Date:</span> {preview.date ? prettyDate(preview.date) : "not found"}</div>
                  <div><span style={{color:C.muted}}>Length:</span> {preview.minutes ? `${preview.minutes} min` : "not found"}</div>
                  <div><span style={{color:C.muted}}>Recording:</span> {preview.shareUrl ? "linked" : "not found"}</div>
                  <div><span style={{color:C.muted}}>Takeaways:</span> {preview.takeaways.length}</div>
                  <div><span style={{color:C.muted}}>Topics:</span> {preview.topics.length}</div>
                  <div><span style={{color:C.muted}}>Next steps:</span> {preview.nextSteps.length}</div>
                  <div><span style={{color:C.muted}}>Action items:</span> {preview.actionItems.length}</div>
                </div>
                {preview.purpose && (
                  <div style={{marginTop:12,color:C.ink2,fontSize:13,lineHeight:1.55}}>
                    <span style={{color:C.muted}}>Purpose:</span> {preview.purpose}
                  </div>
                )}
              </div>
            )}

            <div style={{display:"flex",gap:12}}>
              <button onClick={batch?.length ? saveMany : save} disabled={!batch?.length && !preview?.ok}
                      style={{...BP,opacity:(batch?.length||preview?.ok)?1:.45,
                              cursor:(batch?.length||preview?.ok)?"pointer":"default"}}>
                {batch?.length ? `Import ${batch.length} sessions` : "Import session"}
              </button>
              <button onClick={()=>setImporting(false)} style={BS}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
