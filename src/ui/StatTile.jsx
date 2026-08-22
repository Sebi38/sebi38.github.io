import { C, CardS, DISPLAY, rise } from './theme.js';

// A hero number. Not a chart — the data's job here is a single headline value,
// so a tile is the right form and needs no axes or legend.
export default function StatTile({ value, label, accent = C.blue, sub, i = 0, big }) {
  return (
    <div className="lift" style={{...CardS,padding:big?"26px 18px":"18px 12px",textAlign:"center",...rise(i)}}>
      <div style={{fontFamily:DISPLAY,fontSize:big?46:32,color:accent,lineHeight:1}}>{value}</div>
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1.2,marginTop:6,textTransform:"uppercase"}}>{label}</div>
      {sub && <div style={{color:C.faint,fontSize:11,marginTop:3}}>{sub}</div>}
    </div>
  );
}
