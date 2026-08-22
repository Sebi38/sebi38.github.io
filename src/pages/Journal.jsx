import { useState, useMemo } from 'react';
import { SK, POS } from '../config.js';
import { ld, sv, gid } from '../lib/storage.js';
import { normalizeStatForm, hasValue, scoreLine } from '../lib/numbers.js';
import { IS, LS, BP, BS, CardS, H2, PAGE, rC, RESULT_COLORS } from '../ui/theme.js';
import Empty from '../ui/Empty.jsx';
import Modal from '../ui/Modal.jsx';
import SearchBar from '../ui/SearchBar.jsx';

const EMPTY_FORM = {date:"",opponent:"",location:"",surface:"grass",position:"CM",result:"—",scoreFor:"",scoreAgainst:"",minutes:0,goals:0,assists:0,shots:0,sot:0,passes:0,tackles:0,takaPos:"",takaNeg:"",statId:null,wentWell:"",toImprove:"",rating:5,freeform:"",takaLink:"",veoLink:""};

const SectionLabel = ({ children, first }) => (
  <div style={{color:"#4a7ccc",fontSize:11,fontWeight:700,letterSpacing:2,paddingBottom:6,borderBottom:"1px solid #1a2540",marginTop:first?0:4}}>{children}</div>
);

export default function Journal() {
  const [entries, setEntries] = useState(() => ld(SK.journal) || []);
  const [showAdd, setShowAdd] = useState(false);
  const [expId, setExp] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  const persist = u => { setEntries(u); sv(SK.journal, u); };

  // Saving a journal entry also writes a matching row into Stats, linked by
  // statId, so the two tabs stay in step.
  const doSave = () => {
    if (!form.date || !form.opponent) return;
    const p = normalizeStatForm(form);

    const allStats = ld(SK.stats) || [];
    let sid = p.statId;
    const statEntry = {
      date:p.date, opponent:p.opponent, position:p.position, minutes:p.minutes,
      goals:p.goals, assists:p.assists, shots:p.shots, sot:p.sot, passes:p.passes,
      tackles:p.tackles, result:p.result, scoreFor:p.scoreFor, scoreAgainst:p.scoreAgainst,
      notes:p.location||"", takaPos:p.takaPos, takaNeg:p.takaNeg,
    };

    if (sid) {
      sv(SK.stats, allStats.map(s => s.id === sid ? {...s, ...statEntry} : s));
    } else {
      sid = gid();
      p.statId = sid;
      sv(SK.stats, [{...statEntry, id: sid}, ...allStats]);
    }

    persist(editId
      ? entries.map(e => e.id === editId ? {...p, id: editId} : e)
      : [{...p, id: gid()}, ...entries]);
    setForm(EMPTY_FORM); setShowAdd(false); setEditId(null);
  };

  const edit = e => {
    setForm({
      date:e.date, opponent:e.opponent, location:e.location||"", surface:e.surface||"grass",
      position:e.position||"CM", result:e.result||"—",
      scoreFor:e.scoreFor!=null?e.scoreFor:"", scoreAgainst:e.scoreAgainst!=null?e.scoreAgainst:"",
      minutes:e.minutes||0, goals:e.goals||0, assists:e.assists||0, shots:e.shots||0,
      sot:e.sot||0, passes:e.passes||0, tackles:e.tackles||0,
      takaPos:e.takaPos!=null?e.takaPos:"", takaNeg:e.takaNeg!=null?e.takaNeg:"",
      statId:e.statId||null, wentWell:e.wentWell||"", toImprove:e.toImprove||"",
      rating:e.rating||5, freeform:e.freeform||"",
      takaLink:e.takaLink||e.filmLink||"", veoLink:e.veoLink||"",
    });
    setEditId(e.id); setShowAdd(true);
  };

  // Deleting a journal entry also removes the stat row it created.
  const del = id => {
    const e = entries.find(x => x.id === id);
    if (e?.statId) sv(SK.stats, (ld(SK.stats)||[]).filter(s => s.id !== e.statId));
    persist(entries.filter(x => x.id !== id));
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const s = search.toLowerCase();
    return entries.filter(e =>
      e.opponent.toLowerCase().includes(s) ||
      (e.location||"").toLowerCase().includes(s) ||
      e.date.includes(s) ||
      (e.position||"").toLowerCase().includes(s));
  }, [entries, search]);

  const num = (label, key, extra = {}) => (
    <div>
      <label style={LS}>{label}</label>
      <input type="number" min="0" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} style={IS} {...extra}/>
    </div>
  );

  return (
    <div style={PAGE}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <h2 style={H2}>📝 GAME JOURNAL</h2>
        <button onClick={()=>{setForm(EMPTY_FORM);setEditId(null);setShowAdd(true)}} style={BP}>+ New Entry</button>
      </div>
      <div style={{marginBottom:24}}><SearchBar value={search} onChange={setSearch} placeholder="Search opponent, location, position..."/></div>

      {filtered.length===0
        ? <Empty icon="✍️" text={search?"No matching entries.":"No journal entries yet."}/>
        : <div style={{display:"grid",gap:12}}>{filtered.map(e=>{
            const score = scoreLine(e.scoreFor, e.scoreAgainst);
            const showStats = e.minutes>0||e.goals>0||e.assists>0||e.shots>0||e.passes>0||e.tackles>0||hasValue(e.takaPos)||hasValue(e.takaNeg);
            return (
            <div key={e.id} style={{...CardS,overflow:"hidden"}}>
              <div onClick={()=>setExp(expId===e.id?null:e.id)} style={{padding:"18px 22px",display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
                <div style={{width:44,height:44,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${rC(e.rating)}33,${rC(e.rating)}11)`,color:rC(e.rating),fontWeight:900,fontSize:18,flexShrink:0,border:`1px solid ${rC(e.rating)}44`}}>{e.rating}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{color:"#fff",fontWeight:700,fontSize:15}}>vs {e.opponent}</span>
                    {e.result&&e.result!=="—"&&<span style={{color:RESULT_COLORS[e.result],fontWeight:700,background:RESULT_COLORS[e.result]+"22",padding:"1px 8px",borderRadius:5,fontSize:12}}>{e.result}{score?" "+score:""}</span>}
                  </div>
                  <div style={{color:"#5a6a8a",fontSize:13,marginTop:2}}>{e.date} · {e.location} · {e.surface==="turf"?"🏟 Turf":"🌱 Grass"}{e.position&&<span> · <span style={{color:"#4a7ccc"}}>{e.position}</span></span>}{(e.goals>0||e.assists>0)&&<span style={{color:"#e63946"}}> · {e.goals}G {e.assists}A</span>}</div>
                </div>
                <span style={{color:"#3a4560",fontSize:18,transition:"transform 0.2s",transform:expId===e.id?"rotate(180deg)":"rotate(0)"}}>▼</span>
              </div>

              {expId===e.id&&<div style={{padding:"0 22px 18px",borderTop:"1px solid #1a2540",paddingTop:16}}>
                {showStats&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(64px,1fr))",gap:8,marginBottom:16,background:"#0a0f1e",borderRadius:10,padding:"12px 10px"}}>
                  {[
                    {v:e.minutes+"'",l:"MIN",c:"#f39c12"},
                    {v:e.goals,l:"GOALS",c:"#e63946"},
                    {v:e.assists,l:"AST",c:"#2ecc71"},
                    {v:e.shots||0,l:"SHOTS",c:"#9b59b6"},
                    {v:e.sot||0,l:"SOT",c:"#4a7ccc"},
                    {v:e.passes||0,l:"PASS",c:"#5a6a8a"},
                    {v:e.tackles||0,l:"TKL",c:"#5a6a8a"},
                    ...(hasValue(e.takaPos)?[{v:e.takaPos,l:"T+POS",c:"#2ecc71"}]:[]),
                    ...(hasValue(e.takaNeg)?[{v:e.takaNeg,l:"T-NEG",c:"#e63946"}]:[]),
                  ].map((s,i)=>
                    <div key={i} style={{textAlign:"center"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:s.c}}>{s.v}</div>
                      <div style={{color:"#3a4560",fontSize:10,fontWeight:700,letterSpacing:0.5}}>{s.l}</div>
                    </div>)}
                </div>}

                {e.wentWell&&<div style={{marginBottom:12}}><div style={{color:"#2ecc71",fontSize:12,fontWeight:700,letterSpacing:1,marginBottom:4}}>✅ WHAT WENT WELL</div><div style={{color:"#c8d0e0",fontSize:14,lineHeight:1.6}}>{e.wentWell}</div></div>}
                {e.toImprove&&<div style={{marginBottom:12}}><div style={{color:"#f39c12",fontSize:12,fontWeight:700,letterSpacing:1,marginBottom:4}}>🔧 TO IMPROVE</div><div style={{color:"#c8d0e0",fontSize:14,lineHeight:1.6}}>{e.toImprove}</div></div>}
                {e.freeform&&<div style={{marginBottom:12}}><div style={{color:"#4a7ccc",fontSize:12,fontWeight:700,letterSpacing:1,marginBottom:4}}>💭 ADDITIONAL THOUGHTS</div><div style={{color:"#c8d0e0",fontSize:14,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{e.freeform}</div></div>}

                <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap",alignItems:"center"}}>
                  {e.takaLink&&<a href={e.takaLink} target="_blank" rel="noopener noreferrer" style={{...BS,padding:"6px 14px",fontSize:12,color:"#4a7ccc",borderColor:"#4a7ccc44",textDecoration:"none",display:"inline-block"}}>🎥 Taka Film</a>}
                  {e.veoLink&&<a href={e.veoLink} target="_blank" rel="noopener noreferrer" style={{...BS,padding:"6px 14px",fontSize:12,color:"#9b59b6",borderColor:"#9b59b644",textDecoration:"none",display:"inline-block"}}>🎥 Veo Film</a>}
                  {!e.takaLink&&!e.veoLink&&e.filmLink&&<a href={e.filmLink} target="_blank" rel="noopener noreferrer" style={{...BS,padding:"6px 14px",fontSize:12,color:"#e63946",borderColor:"#e6394633",textDecoration:"none",display:"inline-block"}}>🎥 Watch Film</a>}
                  <button onClick={ev=>{ev.stopPropagation();edit(e)}} style={{...BS,padding:"6px 14px",fontSize:12,color:"#4a7ccc",borderColor:"#4a7ccc44"}}>✏️ Edit</button>
                  <button onClick={ev=>{ev.stopPropagation();del(e.id)}} style={{...BS,padding:"6px 14px",fontSize:12,color:"#e63946",borderColor:"#e6394633"}}>🗑 Delete</button>
                </div>
              </div>}
            </div>);
          })}</div>}

      {showAdd&&<Modal title={editId?"EDIT ENTRY":"NEW ENTRY"} onClose={()=>{setShowAdd(false);setEditId(null)}} wide>
        <div style={{display:"grid",gap:16}}>
          <SectionLabel first>GAME INFO</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={LS}>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={IS}/></div>
            <div><label style={LS}>Opponent</label><input value={form.opponent} onChange={e=>setForm({...form,opponent:e.target.value})} placeholder="e.g. Solar SC" style={IS}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div><label style={LS}>Location</label><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="e.g. Witter Field" style={IS}/></div>
            <div><label style={LS}>Surface</label><select value={form.surface} onChange={e=>setForm({...form,surface:e.target.value})} style={IS}><option value="grass">🌱 Grass</option><option value="turf">🏟 Turf</option></select></div>
            <div><label style={LS}>Position</label><select value={form.position} onChange={e=>setForm({...form,position:e.target.value})} style={IS}>{POS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
          </div>

          <SectionLabel>GAME STATS</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            <div><label style={LS}>Result</label><select value={form.result} onChange={e=>setForm({...form,result:e.target.value})} style={IS}><option value="—">— Upcoming</option><option value="W">W – Win</option><option value="D">D – Draw</option><option value="L">L – Loss</option></select></div>
            {num("Score For","scoreFor",{placeholder:"Our goals"})}
            {num("Score Against","scoreAgainst",{placeholder:"Their goals"})}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            {num("Minutes","minutes",{max:"120"})}
            {num("Goals","goals")}
            {num("Assists","assists")}
            {num("Shots","shots")}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {num("SOT","sot")}
            {num("Passes","passes")}
            {num("Tackles","tackles")}
          </div>

          <SectionLabel>SELF ASSESSMENT</SectionLabel>
          <div>
            <label style={LS}>Self Rating: <span style={{color:rC(form.rating),fontSize:18,fontWeight:900}}>{form.rating}</span>/10</label>
            <input type="range" min="1" max="10" value={form.rating} onChange={e=>setForm({...form,rating:parseInt(e.target.value)})} style={{width:"100%",accentColor:"#e63946"}}/>
          </div>
          <div><label style={LS}>What Went Well</label><textarea value={form.wentWell} onChange={e=>setForm({...form,wentWell:e.target.value})} rows={3} placeholder="What did you do well?" style={{...IS,resize:"vertical"}}/></div>
          <div><label style={LS}>What to Improve</label><textarea value={form.toImprove} onChange={e=>setForm({...form,toImprove:e.target.value})} rows={3} placeholder="What could be better?" style={{...IS,resize:"vertical"}}/></div>
          <div><label style={LS}>Additional Thoughts</label><textarea value={form.freeform} onChange={e=>setForm({...form,freeform:e.target.value})} rows={3} placeholder="Anything else..." style={{...IS,resize:"vertical"}}/></div>

          <SectionLabel>GAME FILM</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={LS}>Game Film — Taka (optional)</label><input value={form.takaLink} onChange={e=>setForm({...form,takaLink:e.target.value})} placeholder="Taka link for this game" style={IS}/></div>
            <div><label style={LS}>Game Film — Veo (optional)</label><input value={form.veoLink} onChange={e=>setForm({...form,veoLink:e.target.value})} placeholder="Veo link for this game" style={IS}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {num("Taka — Pos Highlights","takaPos",{placeholder:"e.g. 8"})}
            {num("Taka — Neg Highlights","takaNeg",{placeholder:"e.g. 3"})}
          </div>

          <div style={{display:"flex",gap:12,marginTop:8}}>
            <button onClick={doSave} style={BP}>{editId?"Update":"Save"}</button>
            <button onClick={()=>{setShowAdd(false);setEditId(null)}} style={BS}>Cancel</button>
          </div>
        </div></Modal>}
    </div>
  );
}
