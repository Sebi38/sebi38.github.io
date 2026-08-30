import { PLAYER } from '../config.js';
import SectionTitle from '../ui/SectionTitle.jsx';
import { C, CardS, GlassS, DISPLAY, BODY, PAGE, rise, RESULT } from '../ui/theme.js';
import StatTile from '../ui/StatTile.jsx';
import FormGuide from '../ui/FormGuide.jsx';
import FixtureCard from '../ui/FixtureCard.jsx';
import { nextFixture, form, played, prettyDate, venueOf, countdownLabel } from '../lib/season.js';
import { totals, averageRating } from '../lib/stats.js';
import { findEntry } from '../lib/journal.js';
import heroPhoto from '../assets/sebi-hero.jpg';
import avatar from '../assets/sebi.jpg';

// Drop more photos into src/assets/gallery/ and they appear automatically.
const gallery = Object.values(
  import.meta.glob('../assets/gallery/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' })
);

function Hero({ next }) {
  const cd = next ? countdownLabel(next.date) : null;
  // venueOf prefers the structured fieldName/address/kickoff and only falls
  // back to parsing `notes`, which a hand-added match does not have at all.
  const v = next ? venueOf(next) : {};
  const venue = v.fieldName || v.address || "";
  const time = v.kickoff || "";
  return (
    <section style={{position:"relative",minHeight:"clamp(440px,66vh,600px)",display:"flex",alignItems:"flex-end",overflow:"hidden"}}>
      <img src={heroPhoto} alt="" aria-hidden="true"
        style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"50% 60%"}}/>
      <div style={{position:"absolute",inset:0,background:
        `linear-gradient(180deg, rgba(7,11,22,.30) 0%, rgba(7,11,22,.55) 45%, rgba(7,11,22,.97) 100%),
         radial-gradient(120% 80% at 80% 10%, rgba(230,57,70,.22), transparent 60%)`}}/>

      <div style={{position:"relative",width:"100%",maxWidth:1040,margin:"0 auto",padding:"0 24px 40px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,...rise(0)}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:C.red,animation:"pulseDot 2.2s ease-in-out infinite"}}/>
          <span style={{color:C.ink2,fontSize:12,fontWeight:700,letterSpacing:2.4,textTransform:"uppercase"}}>{PLAYER.team}</span>
        </div>

        <h1 style={{fontFamily:DISPLAY,fontSize:"clamp(52px,10vw,104px)",lineHeight:.92,letterSpacing:2,margin:0,...rise(1)}}>
          <span style={{display:"block",color:C.ink}}>{PLAYER.firstName}</span>
          <span style={{display:"block",color:C.red}}>{PLAYER.lastName}</span>
        </h1>

        <div style={{display:"flex",alignItems:"center",gap:14,marginTop:14,flexWrap:"wrap",...rise(2)}}>
          <span style={{fontFamily:DISPLAY,fontSize:34,color:C.ink,background:"rgba(230,57,70,.16)",
                        border:`1px solid ${C.red}55`,borderRadius:12,padding:"2px 14px",lineHeight:1.25}}>
            #{PLAYER.number}
          </span>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            {PLAYER.positions.map(p => (
              <span key={p.code} style={{color:C.ink3,fontSize:14,fontWeight:600,letterSpacing:1,
                                         display:"inline-flex",alignItems:"baseline",gap:6,
                                         whiteSpace:"nowrap"}}>
                {p.label}
                <span style={{color:C.blue,fontSize:11,fontWeight:800,letterSpacing:1.4,
                              background:"rgba(74,124,204,.14)",border:`1px solid ${C.blue}44`,
                              borderRadius:5,padding:"1px 6px"}}>{p.code}</span>
              </span>
            ))}
          </div>
        </div>

        {next && (
          <div style={{...GlassS,marginTop:26,padding:"16px 20px",display:"flex",alignItems:"center",
                       gap:18,flexWrap:"wrap",maxWidth:640,...rise(3)}}>
            <div>
              <div style={{color:C.red,fontSize:10,fontWeight:800,letterSpacing:2,textTransform:"uppercase"}}>Next match</div>
              <div style={{color:C.ink,fontWeight:700,fontSize:18,marginTop:3}}>{next.opponent}</div>
              <div style={{color:C.ink3,fontSize:12.5,marginTop:2}}>
                {prettyDate(next.date)}{time && ` · ${time}`}{venue && ` · ${venue}`}
              </div>
            </div>
            <div style={{marginLeft:"auto",textAlign:"right"}}>
              <div style={{fontFamily:DISPLAY,fontSize:30,color:cd==="Today"?C.red:C.ink,lineHeight:1}}>{cd||"TBD"}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Home({ stats, journal, setPage }) {
  const next = nextFixture(stats);
  const recent = form(stats, 5);
  // One source of truth for every number on this page — the same arithmetic the
  // Matches tab uses, so the two can no longer disagree. It folds in the events
  // tapped during a game and only counts matches that have actually happened.
  const t = totals(stats);
  const avg = averageRating(stats, r => findEntry(journal, r.id, r.date));
  const recentGames = played(stats).slice(0,3);

  return (
    <div>
      <Hero next={next}/>

      <div style={PAGE}>
        {/* ── Season snapshot ─────────────────────────────────────────── */}
        <SectionTitle right={
          recent.length>0 && (
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>Form</span>
              <FormGuide games={recent}/>
            </div>
          )
        }>CAREER</SectionTitle>

        <div className="tiles" style={{marginBottom:44}}>
          <StatTile i={0} big value={t.matches} label="Played" accent={C.blue}
                    sub={t.results<t.matches?`${t.matches-t.results} without a result`:null}/>
          <StatTile i={1} big value={t.goals} label="Goals" accent={C.red}
                    sub={t.assists?`${t.goals+t.assists} goal contributions`:null}/>
          <StatTile i={2} big value={t.assists} label="Assists" accent={RESULT.W.fg}/>
          <StatTile i={3} big value={t.minutes.toLocaleString()} label="Minutes" accent={C.gold}/>
          <StatTile i={4} big value={avg} label="Avg rating" accent={C.violet}/>
          <StatTile i={5} big value={`${t.w}-${t.d}-${t.l}`} label="W-D-L" accent={C.teal}
                    sub={t.gf||t.ga?`${t.gf}:${t.ga} goals`:null}/>
        </div>

        {/* ── Recent results ──────────────────────────────────────────── */}
        {recentGames.length>0 && (
          <>
            <SectionTitle right={
              <button onClick={()=>setPage?.("matches")} style={{background:"none",border:"none",color:C.blue,
                fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:BODY}}>Full schedule →</button>
            }>RECENT</SectionTitle>
            <div style={{display:"grid",gap:10,marginBottom:44}}>
              {recentGames.map((g,i)=><FixtureCard key={g.id} game={g} i={i}/>)}
            </div>
          </>
        )}

        {/* ── Gallery ─────────────────────────────────────────────────── */}
        <SectionTitle>GALLERY</SectionTitle>
        {gallery.length>0 ? (
          <div className="gallery">
            {gallery.map((src,i)=>(
              <div key={src} className="lift" style={{...CardS,overflow:"hidden",aspectRatio:"4/3",...rise(i)}}>
                <img src={src} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              </div>
            ))}
          </div>
        ) : (
          <div className="gallery">
            <div className="lift" style={{...CardS,overflow:"hidden",aspectRatio:"4/3"}}>
              <img src={avatar} alt={`${PLAYER.firstName} ${PLAYER.lastName}`}
                   style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
            </div>
            <div style={{...CardS,aspectRatio:"4/3",display:"flex",flexDirection:"column",alignItems:"center",
                         justifyContent:"center",gap:8,border:`1px dashed ${C.line2}`,textAlign:"center",padding:20}}>
              <div style={{fontSize:30}}>📸</div>
              <div style={{color:C.ink3,fontSize:13,fontWeight:600}}>Add more photos</div>
              <code style={{color:C.faint,fontSize:11}}>src/assets/gallery/</code>
              <div style={{color:C.faint,fontSize:11}}>Anything dropped there shows up here.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
