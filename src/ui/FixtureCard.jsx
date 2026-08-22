import { C, CardS, RESULT, DISPLAY, BODY, rise } from './theme.js';
import { prettyDate, splitVenue, countdownLabel, isPlayed } from '../lib/season.js';

// One match. Used on both the Schedule timeline and the Home "next up" slot.
export default function FixtureCard({ game, i = 0, onOpen }) {
  const r = RESULT[game.result] || RESULT["—"];
  const { venue, time, tag } = splitVenue(game.notes || game.location || "");
  const [, mm, dd] = game.date.split("-");
  const played = isPlayed(game);
  const countdown = played ? null : countdownLabel(game.date);
  const score = (game.scoreFor !== "" && game.scoreFor != null && game.scoreAgainst !== "" && game.scoreAgainst != null)
    ? `${game.scoreFor}–${game.scoreAgainst}` : null;

  return (
    <div className="lift" onClick={onOpen}
      style={{...CardS,padding:"16px 18px",display:"flex",alignItems:"center",gap:16,
              cursor:onOpen?"pointer":"default",borderLeft:`3px solid ${r.fg}`,...rise(i)}}>

      {/* date block */}
      <div style={{textAlign:"center",minWidth:52,flexShrink:0}}>
        <div style={{fontFamily:DISPLAY,fontSize:30,color:C.ink,lineHeight:1}}>{dd}</div>
        <div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>
          {new Date(Date.UTC(2026, Number(mm)-1, 1)).toLocaleDateString("en-GB",{month:"short",timeZone:"UTC"})}
        </div>
      </div>

      <div style={{width:1,alignSelf:"stretch",background:C.line}}/>

      {/* opponent + venue */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{color:C.ink,fontWeight:700,fontSize:16}}>{game.opponent}</span>
          {tag && <span style={{fontSize:10,fontWeight:700,letterSpacing:1,color:C.gold,
                                background:"rgba(244,162,97,.13)",border:`1px solid ${C.gold}33`,
                                padding:"2px 7px",borderRadius:5,textTransform:"uppercase"}}>{tag}</span>}
        </div>
        <div style={{color:C.muted,fontSize:12.5,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {prettyDate(game.date)}{time && ` · ${time}`}{venue && ` · ${venue}`}
        </div>
      </div>

      {/* result or countdown */}
      <div style={{textAlign:"right",flexShrink:0}}>
        {played ? (
          <>
            <div style={{fontFamily:DISPLAY,fontSize:score?26:22,color:r.fg,lineHeight:1}}>{score || game.result}</div>
            {score && <div style={{color:r.fg,fontSize:10,fontWeight:800,letterSpacing:1.5}}>{game.result}</div>}
          </>
        ) : (
          <span style={{fontSize:11.5,fontWeight:700,letterSpacing:.8,color:countdown==="Today"?C.red:C.muted,
                        background:countdown==="Today"?"rgba(230,57,70,.14)":"transparent",
                        border:`1px solid ${countdown==="Today"?C.red+"55":C.line2}`,
                        padding:"5px 10px",borderRadius:20,fontFamily:BODY,whiteSpace:"nowrap"}}>
            {countdown || "TBD"}
          </span>
        )}
      </div>
    </div>
  );
}
