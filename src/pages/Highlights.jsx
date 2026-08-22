import { useState, useMemo } from 'react';
import { SK } from '../config.js';
import { ld, sv, gid } from '../lib/storage.js';
import { IS, LS, BP, BS, CardS, H2, PAGE } from '../ui/theme.js';
import Empty from '../ui/Empty.jsx';
import Modal from '../ui/Modal.jsx';
import SearchBar from '../ui/SearchBar.jsx';

const EMPTY_FORM = {date:"",opponent:"",link:"",notes:""};

export default function Highlights() {
  const [clips, setClips] = useState(() => ld(SK.highlights) || []);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  const persist = u => { setClips(u); sv(SK.highlights, u); };

  const doSave = () => {
    if (!form.date || !form.opponent || !form.link) return;
    persist(editId
      ? clips.map(g => g.id === editId ? {...form, id: editId} : g)
      : [{...form, id: gid()}, ...clips]);
    setForm(EMPTY_FORM); setShowAdd(false); setEditId(null);
  };

  const edit = g => {
    setForm({date:g.date,opponent:g.opponent,link:g.link,notes:g.notes||""});
    setEditId(g.id); setShowAdd(true);
  };

  const del = id => persist(clips.filter(g => g.id !== id));

  const filtered = useMemo(() => {
    if (!search.trim()) return clips;
    const s = search.toLowerCase();
    return clips.filter(g =>
      g.opponent.toLowerCase().includes(s) ||
      (g.notes||"").toLowerCase().includes(s) ||
      g.date.includes(s));
  }, [clips, search]);

  return (
    <div style={PAGE}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <h2 style={H2}>⭐ HIGHLIGHTS</h2>
        <button onClick={()=>{setForm(EMPTY_FORM);setEditId(null);setShowAdd(true)}} style={BP}>+ Add Clip</button>
      </div>
      <div style={{marginBottom:24}}><SearchBar value={search} onChange={setSearch} placeholder="Search opponent, date, notes..."/></div>

      {filtered.length===0
        ? <Empty icon="⭐" text={search?"No matching clips.":"No highlight clips yet. Add your first!"}/>
        : <div style={{display:"grid",gap:12}}>{filtered.map(g=>
            <div key={g.id} style={{...CardS,padding:"18px 22px",display:"flex",alignItems:"center",gap:16}}>
              <div style={{width:48,height:48,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#e63946,#c1121f)",fontSize:20,flexShrink:0}}>⭐</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:"#fff",fontWeight:700,fontSize:15}}>vs {g.opponent}</div>
                <div style={{color:"#5a6a8a",fontSize:13,marginTop:2}}>{g.date}{g.notes&&<span> · {g.notes}</span>}</div>
              </div>
              <a href={g.link} target="_blank" rel="noopener noreferrer" style={{padding:"8px 16px",background:"#1d3557",color:"#4a7ccc",borderRadius:8,fontSize:13,fontWeight:600,textDecoration:"none",flexShrink:0}}>Watch →</a>
              <button onClick={()=>edit(g)} style={{background:"none",border:"none",color:"#4a7ccc",cursor:"pointer",fontSize:14,padding:4}}>✏️</button>
              <button onClick={()=>del(g.id)} style={{background:"none",border:"none",color:"#3a4560",cursor:"pointer",fontSize:14,padding:4}}>🗑</button>
            </div>)}</div>}

      {showAdd&&<Modal title={editId?"EDIT CLIP":"ADD HIGHLIGHT CLIP"} onClose={()=>{setShowAdd(false);setEditId(null)}}>
        <div style={{display:"grid",gap:16}}>
          <div><label style={LS}>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={IS}/></div>
          <div><label style={LS}>Opponent</label><input value={form.opponent} onChange={e=>setForm({...form,opponent:e.target.value})} placeholder="e.g. FC Dallas" style={IS}/></div>
          <div><label style={LS}>Clip Link</label><input value={form.link} onChange={e=>setForm({...form,link:e.target.value})} placeholder="YouTube, Hudl, or other link" style={IS}/></div>
          <div><label style={LS}>Notes (optional)</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="e.g. Bicycle kick goal" style={IS}/></div>
          <div style={{display:"flex",gap:12,marginTop:8}}>
            <button onClick={doSave} style={BP}>{editId?"Update":"Save"}</button>
            <button onClick={()=>{setShowAdd(false);setEditId(null)}} style={BS}>Cancel</button>
          </div>
        </div></Modal>}
    </div>
  );
}
