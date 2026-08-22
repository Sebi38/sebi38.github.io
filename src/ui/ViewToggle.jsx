export default function ViewToggle({ view, setView, options }) {
  return (
    <div style={{display:"flex",gap:0,background:"#0d1526",borderRadius:10,border:"1px solid #1a2540",overflow:"hidden",flexShrink:0}}>
      {options.map(t=>
        <button key={t.v} onClick={()=>setView(t.v)} style={{padding:"9px 18px",background:view===t.v?"#1a2f5a":"none",border:"none",color:view===t.v?"#fff":"#5a6a8a",fontSize:13,fontWeight:view===t.v?700:400,cursor:"pointer",fontFamily:"'Outfit',sans-serif",transition:"all 0.2s"}}>{t.l}</button>)}
    </div>
  );
}
