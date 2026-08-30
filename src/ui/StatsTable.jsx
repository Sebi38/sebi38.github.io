import { C, RESULT } from './theme.js';
import { hasValue } from '../lib/numbers.js';
import { matchStats } from '../lib/stats.js';

const COLUMNS = ["Date","Opponent","Result","Score","Pos","St","Min","G","A","Sh","SOT","Pass","Tkl","Cor","FK","T+","T−",""];

const Taka = ({ value, color }) => (
  <td style={{padding:"12px 8px"}}>
    {hasValue(value)
      ? <span style={{color,fontWeight:700,background:color+"22",padding:"2px 8px",borderRadius:5,fontSize:12}}>{value}</span>
      : <span style={{color:C.faint}}>—</span>}
  </td>
);

// The season as a table. Same rows as the cards, for when you want to scan
// numbers down a column rather than read one match at a time.
export default function StatsTable({ rows, onEdit, onDelete }) {
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{borderBottom:`2px solid ${C.line2}`}}>
          {COLUMNS.map((h,i)=>(
            <th key={i} style={{color:h==="T+"?RESULT.W.fg:h==="T−"?RESULT.L.fg:C.muted,fontWeight:700,
                                padding:"10px 8px",textAlign:"left",whiteSpace:"nowrap",fontSize:11,letterSpacing:1}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>{rows.map(s=>{
          const r = RESULT[s.result] || RESULT["—"];
          // Derived, not raw: shots on goal tapped during the match count here
          // too, and every value is coerced to a number.
          const m = matchStats(s);
          return (
          <tr key={s.id} style={{borderBottom:`1px solid ${C.line}`}}>
            <td style={{color:C.ink3,padding:"12px 8px",whiteSpace:"nowrap"}}>{s.date}</td>
            <td style={{color:C.ink,padding:"12px 8px",fontWeight:600}}>{s.opponent}</td>
            <td style={{padding:"12px 8px"}}>
              <span style={{color:r.fg,fontWeight:700,background:r.bg,padding:"2px 10px",borderRadius:6,fontSize:12}}>{s.result}</span>
            </td>
            <td style={{color:C.ink2,padding:"12px 8px",fontWeight:700,whiteSpace:"nowrap"}}>
              {hasValue(s.scoreFor)&&hasValue(s.scoreAgainst)?`${s.scoreFor}–${s.scoreAgainst}`:<span style={{color:C.faint}}>—</span>}
            </td>
            <td style={{color:C.blue,padding:"12px 8px",fontWeight:600,whiteSpace:"nowrap"}}>
              {Array.isArray(s.positions)&&s.positions.length>1?s.positions.join(" → "):(s.position||"—")}
            </td>
            <td style={{padding:"12px 8px"}}>
              {s.started===true?<span title="Started" style={{color:RESULT.W.fg,fontWeight:800,fontSize:11.5}}>XI</span>
                : s.started===false?<span title="Off the bench" style={{color:C.gold,fontWeight:700,fontSize:11}}>sub</span>
                : <span style={{color:C.faint}}>—</span>}
            </td>
            <td style={{color:C.ink3,padding:"12px 8px"}}>{m.minutes}'</td>
            <td style={{color:m.goals>0?C.red:C.faint,padding:"12px 8px",fontWeight:m.goals>0?700:400}}>{m.goals}</td>
            <td style={{color:m.assists>0?RESULT.W.fg:C.faint,padding:"12px 8px",fontWeight:m.assists>0?700:400}}>{m.assists}</td>
            <td style={{color:C.ink3,padding:"12px 8px"}}>{m.shots}</td>
            <td style={{color:m.sot>0?C.blue:C.ink3,padding:"12px 8px",fontWeight:m.sot>0?700:400}}>{m.sot}</td>
            <td style={{color:C.ink3,padding:"12px 8px"}}>{m.passes}</td>
            <td style={{color:C.ink3,padding:"12px 8px"}}>{m.tackles}</td>
            <td style={{color:C.ink3,padding:"12px 8px"}}>{m.corners}</td>
            <td style={{color:C.ink3,padding:"12px 8px"}}>{m.freeKicks}</td>
            <Taka value={s.takaPos} color={RESULT.W.fg}/>
            <Taka value={s.takaNeg} color={RESULT.L.fg}/>
            <td style={{padding:"12px 4px",whiteSpace:"nowrap"}}>
              <button onClick={()=>onEdit(s)} style={{background:"none",border:"none",color:C.blue,cursor:"pointer",fontSize:13,padding:2}}>✏️</button>
              <button onClick={()=>onDelete(s.id)} style={{background:"none",border:"none",color:C.faint,cursor:"pointer",fontSize:13,padding:2}}>🗑</button>
            </td>
          </tr>);
        })}</tbody>
      </table>
    </div>
  );
}
