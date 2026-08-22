import { C, BODY } from './theme.js';

// Two or three big options, one tap. Better than a dropdown on a phone —
// no picker sheet, no scrolling, and the current answer is always visible.
export default function Segmented({ label, value, onChange, options, accent = C.blue }) {
  return (
    <div>
      {label && (
        <div style={{color:C.muted,fontSize:11,fontWeight:800,letterSpacing:1.6,
                     textTransform:"uppercase",marginBottom:8,textAlign:"center"}}>{label}</div>
      )}
      <div style={{display:"grid",gridTemplateColumns:`repeat(${options.length},1fr)`,gap:8}}>
        {options.map(o => {
          const on = value === o.v;
          return (
            <button key={String(o.v)} type="button" onClick={() => onChange(o.v)}
              style={{padding:"14px 8px",borderRadius:12,cursor:"pointer",fontFamily:BODY,
                      fontSize:15,fontWeight:on?800:600,
                      background:on?`${accent}22`:C.surface,
                      color:on?accent:C.muted,
                      border:`1px solid ${on?accent+"77":C.line2}`,
                      WebkitTapHighlightColor:"transparent",transition:"all .16s"}}>
              {o.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
