import { useState, useMemo } from 'react';
import { SK, CATS, TRAIN_RES_CATS } from '../config.js';
import { ld, sv, gid } from '../lib/storage.js';
import { IS, LS, BP, BS, CardS, H2, PAGE } from '../ui/theme.js';
import Empty from '../ui/Empty.jsx';
import Modal from '../ui/Modal.jsx';
import Pill from '../ui/Pill.jsx';
import SearchBar from '../ui/SearchBar.jsx';
import ViewToggle from '../ui/ViewToggle.jsx';
import ResourceList from './ResourceList.jsx';
import CoachingSessions from './CoachingSessions.jsx';

const EMPTY_FORM = {title:"",link:"",category:CATS[0],notes:""};

export default function Training() {
  const [res, setRes] = useState(() => ld(SK.training) || []);
  const [showAdd, setShowAdd] = useState(false);
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("coaching");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  const persist = u => { setRes(u); sv(SK.training, u); };

  const doSave = () => {
    if (!form.title || !form.link) return;
    persist(editId
      ? res.map(r => r.id === editId ? {...form, id: editId} : r)
      : [{...form, id: gid()}, ...res]);
    setForm(EMPTY_FORM); setShowAdd(false); setEditId(null);
  };

  const edit = r => {
    setForm({title:r.title,link:r.link,category:r.category,notes:r.notes||""});
    setEditId(r.id); setShowAdd(true);
  };

  const del = id => persist(res.filter(r => r.id !== id));

  const filtered = useMemo(() => {
    let f = res;
    if (cat !== "All") f = f.filter(r => r.category === cat);
    if (search.trim()) {
      const s = search.toLowerCase();
      f = f.filter(r => r.title.toLowerCase().includes(s) || (r.notes||"").toLowerCase().includes(s));
    }
    return f;
  }, [res, cat, search]);

  return (
    <div style={PAGE}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <h2 style={H2}>📚 TRAINING</h2>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <ViewToggle view={view} setView={setView} options={[{v:"coaching",l:"Coaching"},{v:"drills",l:"My Drills"},{v:"resources",l:"Resources"}]}/>
          {view==="drills"&&<button onClick={()=>{setForm(EMPTY_FORM);setEditId(null);setShowAdd(true)}} style={BP}>+ Add Drill</button>}
        </div>
      </div>

      {view==="drills"&&<>
        <div style={{marginBottom:16}}><SearchBar value={search} onChange={setSearch} placeholder="Search drills..."/></div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:24}}>
          {["All",...CATS].map(c=><Pill key={c} label={c} active={cat===c} onClick={()=>setCat(c)}/>)}
        </div>

        {filtered.length===0
          ? <Empty icon="📖" text={search||cat!=="All"?"No matching drills.":"No drills yet. Add your first!"}/>
          : <div style={{display:"grid",gap:12}}>{filtered.map(r=>
              <div key={r.id} style={{...CardS,padding:"18px 22px",display:"flex",alignItems:"center",gap:16}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:"#fff",fontWeight:700,fontSize:15}}>{r.title}</div>
                  <div style={{color:"#5a6a8a",fontSize:13,marginTop:2}}><span style={{color:"#4a7ccc"}}>{r.category}</span>{r.notes&&<span> · {r.notes}</span>}</div>
                </div>
                <a href={r.link} target="_blank" rel="noopener noreferrer" style={{padding:"8px 16px",background:"#1d3557",color:"#4a7ccc",borderRadius:8,fontSize:13,fontWeight:600,textDecoration:"none",flexShrink:0}}>Open →</a>
                <button onClick={()=>edit(r)} style={{background:"none",border:"none",color:"#4a7ccc",cursor:"pointer",fontSize:14,padding:4}}>✏️</button>
                <button onClick={()=>del(r.id)} style={{background:"none",border:"none",color:"#3a4560",cursor:"pointer",fontSize:14,padding:4}}>🗑</button>
              </div>)}</div>}

        {showAdd&&<Modal title={editId?"EDIT DRILL":"ADD DRILL"} onClose={()=>{setShowAdd(false);setEditId(null)}}>
          <div style={{display:"grid",gap:16}}>
            <div><label style={LS}>Title</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Inside Foot Passing Drill" style={IS}/></div>
            <div><label style={LS}>Link</label><input value={form.link} onChange={e=>setForm({...form,link:e.target.value})} placeholder="YouTube, Instagram, etc." style={IS}/></div>
            <div><label style={LS}>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={IS}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={LS}>Notes (optional)</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any additional notes" style={IS}/></div>
            <div style={{display:"flex",gap:12,marginTop:8}}>
              <button onClick={doSave} style={BP}>{editId?"Update":"Save"}</button>
              <button onClick={()=>{setShowAdd(false);setEditId(null)}} style={BS}>Cancel</button>
            </div>
          </div></Modal>}
      </>}

      {view==="coaching"&&<CoachingSessions/>}
      {view==="resources"&&<ResourceList storageKey={SK.trainRes} categories={TRAIN_RES_CATS} emptyIcon="🔗" placeholder="Search training resources..." addLabel="Add Resource" modalTitle="Training Resource"/>}
    </div>
  );
}
