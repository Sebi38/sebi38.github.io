import { useState, useMemo } from 'react';
import { ld, sv, gid } from '../lib/storage.js';
import { IS, LS, BP, BS, CardS } from '../ui/theme.js';
import Empty from '../ui/Empty.jsx';
import Modal from '../ui/Modal.jsx';
import Pill from '../ui/Pill.jsx';
import SearchBar from '../ui/SearchBar.jsx';

// Shared "list of links with categories" widget, used by the Training tab for
// its Resources view.
export default function ResourceList({ storageKey, categories, emptyIcon, placeholder, addLabel, modalTitle }) {
  const [items, setItems] = useState(() => ld(storageKey) || []);
  const [showAdd, setShowAdd] = useState(false);
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");

  const emptyForm = {title:"",link:"",category:categories[0],notes:""};
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const persist = u => { setItems(u); sv(storageKey, u); };

  const doSave = () => {
    if (!form.title) return;
    persist(editId
      ? items.map(r => r.id === editId ? {...form, id: editId} : r)
      : [{...form, id: gid()}, ...items]);
    setForm(emptyForm); setShowAdd(false); setEditId(null);
  };

  const edit = r => {
    setForm({title:r.title,link:r.link||"",category:r.category,notes:r.notes||""});
    setEditId(r.id); setShowAdd(true);
  };

  const del = id => persist(items.filter(r => r.id !== id));

  const filtered = useMemo(() => {
    let f = items;
    if (cat !== "All") f = f.filter(r => r.category === cat);
    if (search.trim()) {
      const s = search.toLowerCase();
      f = f.filter(r => r.title.toLowerCase().includes(s) || (r.notes||"").toLowerCase().includes(s));
    }
    return f;
  }, [items, cat, search]);

  const label = (modalTitle || "RESOURCE").toUpperCase();

  return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <SearchBar value={search} onChange={setSearch} placeholder={placeholder||"Search resources..."}/>
        <button onClick={()=>{setForm(emptyForm);setEditId(null);setShowAdd(true)}} style={BP}>+ {addLabel||"Add Resource"}</button>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:24}}>
        {["All",...categories].map(c=><Pill key={c} label={c} active={cat===c} onClick={()=>setCat(c)}/>)}
      </div>

      {filtered.length===0
        ? <Empty icon={emptyIcon||"🔗"} text={search||cat!=="All"?"No matching resources.":"No resources yet. Add your first!"}/>
        : <div style={{display:"grid",gap:12}}>{filtered.map(r=>
            <div key={r.id} style={{...CardS,padding:"18px 22px",display:"flex",alignItems:"center",gap:16}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:"#fff",fontWeight:700,fontSize:15}}>{r.title}</div>
                <div style={{color:"#5a6a8a",fontSize:13,marginTop:2}}><span style={{color:"#4a7ccc"}}>{r.category}</span>{r.notes&&<span> · {r.notes}</span>}</div>
              </div>
              {r.link&&<a href={r.link} target="_blank" rel="noopener noreferrer" style={{padding:"8px 16px",background:"#1d3557",color:"#4a7ccc",borderRadius:8,fontSize:13,fontWeight:600,textDecoration:"none",flexShrink:0}}>Open →</a>}
              <button onClick={()=>edit(r)} style={{background:"none",border:"none",color:"#4a7ccc",cursor:"pointer",fontSize:14,padding:4}}>✏️</button>
              <button onClick={()=>del(r.id)} style={{background:"none",border:"none",color:"#3a4560",cursor:"pointer",fontSize:14,padding:4}}>🗑</button>
            </div>)}</div>}

      {showAdd&&<Modal title={editId?`EDIT ${label}`:`ADD ${label}`} onClose={()=>{setShowAdd(false);setEditId(null)}}>
        <div style={{display:"grid",gap:16}}>
          <div><label style={LS}>Title</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Best Passing Drills" style={IS}/></div>
          <div><label style={LS}>Link (optional)</label><input value={form.link} onChange={e=>setForm({...form,link:e.target.value})} placeholder="URL" style={IS}/></div>
          <div><label style={LS}>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={IS}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={LS}>Notes (optional)</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any notes" style={IS}/></div>
          <div style={{display:"flex",gap:12,marginTop:8}}>
            <button onClick={doSave} style={BP}>{editId?"Update":"Save"}</button>
            <button onClick={()=>{setShowAdd(false);setEditId(null)}} style={BS}>Cancel</button>
          </div>
        </div></Modal>}
    </div>
  );
}
