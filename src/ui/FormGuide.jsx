import { C, RESULT, BODY } from './theme.js';

// Recent results as W/D/L chips. The letter carries the meaning; colour only
// reinforces it, so this stays readable without colour vision.
export default function FormGuide({ games, size = 30 }) {
  if (!games.length) return null;
  return (
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      {games.map(g => {
        const r = RESULT[g.result] || RESULT["—"];
        return (
          <div key={g.id}
            title={`${g.date} vs ${g.opponent} — ${r.label}`}
            style={{width:size,height:size,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",
                    background:r.bg,color:r.fg,fontWeight:800,fontSize:size*0.44,
                    border:`1px solid ${r.fg}44`,fontFamily:BODY,flexShrink:0}}>
            {g.result}
          </div>
        );
      })}
    </div>
  );
}
