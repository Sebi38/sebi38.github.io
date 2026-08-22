import { useState, useMemo } from 'react';
import { SK, POS } from '../config.js';
import { SEASONS, filterBySeason } from '../data/seasons.js';
import { ld, sv, gid } from '../lib/storage.js';
import { normalizeStatForm, hasValue } from '../lib/numbers.js';
import { C, IS, LS, BP, BS, CardS, H2, PAGE, RESULT_COLORS, RESULT } from '../ui/theme.js';
import Empty from '../ui/Empty.jsx';
import Modal from '../ui/Modal.jsx';
import Pill from '../ui/Pill.jsx';
import SearchBar from '../ui/SearchBar.jsx';

const EMPTY_FORM = {date:"",opponent:"",position:"CM",minutes:0,goals:0,assists:0,shots:0,sot:0,passes:0,tackles:0,takaPos:"",takaNeg:"",result:"W",scoreFor:"",scoreAgainst:"",notes:""};

const COLUMNS = ["Date","Opponent","Result","Score","Pos","St","Min","G","A","Sh","SOT","Pass","Tkl","T+","T−",""];

const TakaCell = ({ value, color }) => (
  <td style={{padding:"12px 8px"}}>
    {hasValue(value)
      ? <span style={{color,fontWeight:700,background:color+"22",padding:"2px 8px",borderRadius:5,fontSize:12}}>{value}</span>
      : <span style={{color:"#3a4560"}}>—</span>}
  </td>
);

export default function Stats() {
  const [stats, setStats] = useState(() => ld(SK.stats) || []);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  const persist = u => { setStats(u); sv(SK.stats, u); };

  const doSave = () => {
    if (!form.date || !form.opponent) return;
    const p = normalizeStatForm(form);
    persist(editId
      ? stats.map(s => s.id === editId ? {...p, id: editId} : s)
      : [{...p, id: gid()}, ...stats]);
    setForm(EMPTY_FORM); setShowAdd(false); setEditId(null);
  };

  const edit = s => {
    setForm({
      date:s.date, opponent:s.opponent, position:s.position||"CM", minutes:s.minutes,
      goals:s.goals, assists:s.assists, shots:s.shots||0, sot:s.sot||0,
      passes:s.passes||0, tackles:s.tackles||0,
      takaPos:s.takaPos!=null?s.takaPos:"", takaNeg:s.takaNeg!=null?s.takaNeg:"",
      result:s.result||"W",
      scoreFor:s.scoreFor!=null?s.scoreFor:"", scoreAgainst:s.scoreAgainst!=null?s.scoreAgainst:"",
      notes:s.notes||"",
    });
    setEditId(s.id); setShowAdd(true);
  };

  const del = id => persist(stats.filter(s => s.id !== id));

  // Season filter pills come straight from the registry in src/data/seasons.js.
  const seasonStats = useMemo(() => filterBySeason(stats, season), [stats, season]);

  const filtered = useMemo(() => {
    if (!search.trim()) return seasonStats;
    const s = search.toLowerCase();
    return seasonStats.filter(st => st.opponent.toLowerCase().includes(s) || st.date.includes(s));
  }, [seasonStats, search]);

  const tot = useMemo(() => ({
    g:  seasonStats.length,
    go: seasonStats.reduce((s,g)=>s+g.goals, 0),
    a:  seasonStats.reduce((s,g)=>s+g.assists, 0),
    m:  seasonStats.reduce((s,g)=>s+g.minutes, 0),
    sh: seasonStats.reduce((s,g)=>s+(g.shots||0), 0),
    so: seasonStats.reduce((s,g)=>s+(g.sot||0), 0),
    w:  seasonStats.filter(g=>g.result==="W").length,
    l:  seasonStats.filter(g=>g.result==="L").length,
    d:  seasonStats.filter(g=>g.result==="D").length,
  }), [seasonStats]);

  const summary = [
    {v:tot.g,l:"Games",c:"#4a7ccc"},
    {v:tot.go,l:"Goals",c:"#e63946"},
    {v:tot.a,l:"Assists",c:"#2ecc71"},
    {v:tot.m,l:"Minutes",c:"#f39c12"},
    {v:`${tot.w}-${tot.d}-${tot.l}`,l:"W-D-L",c:"#9b59b6"},
    {v:tot.sh>0?Math.round((tot.so/tot.sh)*100)+"%":"—",l:"Shot Acc",c:"#e67e22"},
  ];

  const num = (label, key, extra = {}) => (
    <div>
      <label style={LS}>{label}</label>
      <input type="number" min="0" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} style={IS} {...extra}/>
    </div>
  );

  return (
    <div style={PAGE}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <h2 style={H2}>📊 STATS</h2>
        <button onClick={()=>{setForm(EMPTY_FORM);setEditId(null);setShowAdd(true)}} style={BP}>+ Log Game</button>
      </div>

      {stats.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:10,marginBottom:28}}>
        {summary.map((s,i)=>
          <div key={i} style={{...CardS,padding:"16px 10px",textAlign:"center"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:s.c}}>{s.v}</div>
            <div style={{color:"#5a6a8a",fontSize:11,fontWeight:600,letterSpacing:1,marginTop:2}}>{s.l}</div>
          </div>)}
      </div>}

      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <Pill label="All" active={season==="all"} onClick={()=>setSeason("all")}/>
        {SEASONS.map(s=>
          <Pill key={s.id} label={s.label} active={season===s.id} onClick={()=>setSeason(s.id)}/>)}
      </div>
      <div style={{marginBottom:24}}><SearchBar value={search} onChange={setSearch} placeholder="Search opponent or date..."/></div>

      {filtered.length===0
        ? <Empty icon="📊" text={search?"No matching games.":"No stats yet. Log your first game!"}/>
        : <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"2px solid #1e2d50"}}>
              {COLUMNS.map((h,i)=><th key={i} style={{color:h==="T+"?"#2ecc71":h==="T−"?"#e63946":"#5a6a8a",fontWeight:700,padding:"10px 8px",textAlign:"left",whiteSpace:"nowrap",fontSize:11,letterSpacing:1}}>{h}</th>)}
            </tr></thead>
            <tbody>{filtered.map(s=>
              <tr key={s.id} style={{borderBottom:"1px solid #1a2540"}}>
                <td style={{color:"#8892a8",padding:"12px 8px",whiteSpace:"nowrap"}}>{s.date}</td>
                <td style={{color:"#fff",padding:"12px 8px",fontWeight:600}}>{s.opponent}</td>
                <td style={{padding:"12px 8px"}}><span style={{color:RESULT_COLORS[s.result]||"#fff",fontWeight:700,background:(RESULT_COLORS[s.result]||"#fff")+"22",padding:"2px 10px",borderRadius:6,fontSize:12}}>{s.result}</span></td>
                <td style={{color:"#c8d0e0",padding:"12px 8px",fontWeight:700,whiteSpace:"nowrap"}}>{hasValue(s.scoreFor)&&hasValue(s.scoreAgainst)?`${s.scoreFor}-${s.scoreAgainst}`:<span style={{color:"#3a4560"}}>—</span>}</td>
                <td style={{color:C.blue,padding:"12px 8px",fontWeight:600,whiteSpace:"nowrap"}}>
                  {Array.isArray(s.positions) && s.positions.length > 1
                    ? s.positions.join(" → ")
                    : (s.position || "—")}
                </td>
                <td style={{padding:"12px 8px"}}>
                  {s.started === true
                    ? <span title="Started" style={{color:RESULT.W.fg,fontWeight:800,fontSize:11.5}}>XI</span>
                    : s.started === false
                      ? <span title="Came off the bench" style={{color:C.gold,fontWeight:700,fontSize:11}}>sub</span>
                      : <span style={{color:C.faint}}>—</span>}
                </td>
                <td style={{color:"#8892a8",padding:"12px 8px"}}>{s.minutes}'</td>
                <td style={{color:s.goals>0?"#e63946":"#3a4560",padding:"12px 8px",fontWeight:s.goals>0?700:400}}>{s.goals}</td>
                <td style={{color:s.assists>0?"#2ecc71":"#3a4560",padding:"12px 8px",fontWeight:s.assists>0?700:400}}>{s.assists}</td>
                <td style={{color:"#8892a8",padding:"12px 8px"}}>{s.shots||0}</td>
                <td style={{color:"#8892a8",padding:"12px 8px"}}>{s.sot||0}</td>
                <td style={{color:"#8892a8",padding:"12px 8px"}}>{s.passes||0}</td>
                <td style={{color:"#8892a8",padding:"12px 8px"}}>{s.tackles||0}</td>
                <TakaCell value={s.takaPos} color="#2ecc71"/>
                <TakaCell value={s.takaNeg} color="#e63946"/>
                <td style={{padding:"12px 4px",whiteSpace:"nowrap"}}>
                  <button onClick={()=>edit(s)} style={{background:"none",border:"none",color:"#4a7ccc",cursor:"pointer",fontSize:13,padding:2}}>✏️</button>
                  <button onClick={()=>del(s.id)} style={{background:"none",border:"none",color:"#3a4560",cursor:"pointer",fontSize:13,padding:2}}>🗑</button>
                </td>
              </tr>)}</tbody>
          </table></div>}

      {showAdd&&<Modal title={editId?"EDIT STATS":"LOG GAME STATS"} onClose={()=>{setShowAdd(false);setEditId(null)}} wide>
        <div style={{display:"grid",gap:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div><label style={LS}>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={IS}/></div>
            <div><label style={LS}>Opponent</label><input value={form.opponent} onChange={e=>setForm({...form,opponent:e.target.value})} placeholder="e.g. Solar SC" style={IS}/></div>
            <div><label style={LS}>Result</label><select value={form.result} onChange={e=>setForm({...form,result:e.target.value})} style={IS}><option value="W">Win</option><option value="D">Draw</option><option value="L">Loss</option></select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {num("Score For","scoreFor",{placeholder:"Our goals"})}
            {num("Score Against","scoreAgainst",{placeholder:"Their goals"})}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={LS}>Position</label><select value={form.position} onChange={e=>setForm({...form,position:e.target.value})} style={IS}>{POS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
            {num("Minutes","minutes",{max:"120"})}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {num("Goals","goals")}
            {num("Assists","assists")}
            {num("Shots","shots")}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {num("Shots on Target","sot")}
            {num("Passes","passes")}
            {num("Tackles","tackles")}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {num("Taka — Pos Highlights","takaPos",{placeholder:"e.g. 8"})}
            {num("Taka — Neg Highlights","takaNeg",{placeholder:"e.g. 3"})}
          </div>
          <div><label style={LS}>Notes (optional)</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any notes" style={IS}/></div>
          <div style={{display:"flex",gap:12,marginTop:8}}>
            <button onClick={doSave} style={BP}>{editId?"Update":"Save"}</button>
            <button onClick={()=>{setShowAdd(false);setEditId(null)}} style={BS}>Cancel</button>
          </div>
        </div></Modal>}
    </div>
  );
}
