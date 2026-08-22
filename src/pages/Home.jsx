import { PLAYER } from '../config.js';
import { CardS } from '../ui/theme.js';
import sebiPhoto from '../assets/sebi.jpg';

const CARDS = [
  {i:"⭐",l:"Highlights",d:"Best clips & moments"},
  {i:"📚",l:"Training",  d:"Drills & resources"},
  {i:"📝",l:"Journal",   d:"Game reflections & film"},
  {i:"📊",l:"Stats",     d:"Goals, assists & more"},
];

export default function Home({ stats, journal }) {
  const games   = stats.length;
  const goals   = stats.reduce((s,g)=>s+(g.goals||0), 0);
  const assists = stats.reduce((s,g)=>s+(g.assists||0), 0);
  const minutes = stats.reduce((s,g)=>s+(g.minutes||0), 0);
  const avgRating = journal.length > 0
    ? (journal.reduce((s,j)=>s+(j.rating||0), 0) / journal.length).toFixed(1)
    : "—";

  const totals = [
    {v:games,     l:"Games",      c:"#4a7ccc"},
    {v:goals,     l:"Goals",      c:"#e63946"},
    {v:assists,   l:"Assists",    c:"#2ecc71"},
    {v:minutes,   l:"Minutes",    c:"#f39c12"},
    {v:avgRating, l:"Avg Rating", c:"#9b59b6"},
  ];

  return (
    <div style={{textAlign:"center",padding:"60px 24px"}}>
      <img src={sebiPhoto} alt={`${PLAYER.firstName} ${PLAYER.lastName}`} style={{width:120,height:120,borderRadius:"50%",margin:"0 auto 24px",objectFit:"cover",display:"block",boxShadow:"0 8px 32px rgba(230,57,70,0.3)",border:"3px solid #e63946"}}/>
      <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:56,color:"#fff",margin:"0 0 8px",letterSpacing:3}}>
        {PLAYER.firstName} <span style={{color:"#e63946"}}>{PLAYER.lastName}</span>
      </h1>
      <p style={{color:"#4a7ccc",fontSize:18,fontWeight:600,margin:"0 0 4px",letterSpacing:2}}>{PLAYER.team}</p>
      <p style={{color:"#5a6a8a",fontSize:14,letterSpacing:1}}>#{PLAYER.number}</p>

      {games>0&&<div style={{marginTop:40,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,maxWidth:700,margin:"40px auto 0"}}>
        {totals.map((s,i)=>
          <div key={i} style={{...CardS,padding:"20px 12px",textAlign:"center"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,color:s.c}}>{s.v}</div>
            <div style={{color:"#5a6a8a",fontSize:12,fontWeight:600,letterSpacing:1,marginTop:4}}>{s.l}</div>
          </div>)}
      </div>}

      <div style={{marginTop:40,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,maxWidth:700,marginLeft:"auto",marginRight:"auto"}}>
        {CARDS.map((c,idx)=>
          <div key={idx} style={{...CardS,padding:24,textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:8}}>{c.i}</div>
            <div style={{color:"#fff",fontWeight:700,marginBottom:4}}>{c.l}</div>
            <div style={{color:"#5a6a8a",fontSize:13}}>{c.d}</div>
          </div>)}
      </div>
    </div>
  );
}
