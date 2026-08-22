import { C, DISPLAY, BODY } from './theme.js';

// Big thumb-sized +/- control. Sized for one-handed use while standing at a
// pitch — 56px targets, well above the 44px minimum.
export default function Stepper({ label, value, onChange, accent = C.blue, min = 0, max = 999, step = 1 }) {
  const set = v => onChange(Math.max(min, Math.min(max, v)));
  const btn = {
    width:56, height:56, flexShrink:0, borderRadius:14, border:`1px solid ${C.line2}`,
    background:C.surface, color:C.ink, fontSize:26, fontWeight:700, cursor:"pointer",
    fontFamily:BODY, lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center",
    WebkitTapHighlightColor:"transparent", userSelect:"none",
  };
  return (
    <div>
      <div style={{color:C.muted,fontSize:11,fontWeight:800,letterSpacing:1.6,
                   textTransform:"uppercase",marginBottom:8,textAlign:"center"}}>{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
        <button type="button" style={btn} onClick={()=>set(value-step)} aria-label={`Decrease ${label}`}>−</button>
        <div style={{minWidth:64,textAlign:"center",fontFamily:DISPLAY,fontSize:44,color:accent,lineHeight:1}}>
          {value}
        </div>
        <button type="button" style={{...btn,background:`${accent}1f`,borderColor:`${accent}55`,color:accent}}
                onClick={()=>set(value+step)} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
