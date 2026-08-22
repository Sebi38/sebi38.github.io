import { PLAYER } from '../config.js';

export const TABS = [
  {id:"home",       label:"Home",       icon:"🏠"},
  {id:"schedule",   label:"Schedule",   icon:"📅"},
  {id:"highlights", label:"Highlights", icon:"⭐"},
  {id:"training",   label:"Training",   icon:"📚"},
  {id:"journal",    label:"Journal",    icon:"📝"},
  {id:"stats",      label:"Stats",      icon:"📊"},
];

export default function Nav({ active, setActive }) {
  return (
    <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(10,15,30,0.92)",backdropFilter:"blur(12px)",borderBottom:"1px solid #1a2540",padding:"0 16px",overflowX:"auto"}}>
      <div style={{maxWidth:960,margin:"0 auto",display:"flex",alignItems:"center",gap:4}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#fff",marginRight:"auto",letterSpacing:1,padding:"14px 0",whiteSpace:"nowrap"}}>
          SEB <span style={{color:"#e63946"}}>{PLAYER.number}</span>
        </div>
        {TABS.map(t=>
          <button key={t.id} onClick={()=>setActive(t.id)} style={{padding:"14px 12px",background:"none",border:"none",cursor:"pointer",color:active===t.id?"#fff":"#5a6a8a",fontSize:13,fontWeight:active===t.id?700:400,borderBottom:active===t.id?"2px solid #e63946":"2px solid transparent",transition:"all 0.2s",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>
            {t.icon} {t.label}
          </button>)}
      </div>
    </nav>
  );
}
