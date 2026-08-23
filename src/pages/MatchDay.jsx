import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SK, POS } from '../config.js';
import { ld, sv, gid } from '../lib/storage.js';
import { C, CardS, GlassS, DISPLAY, BODY, PAGE, IS, LS, BP, BS, RESULT, rC, rise } from '../ui/theme.js';
import SectionTitle from '../ui/SectionTitle.jsx';
import Stepper from '../ui/Stepper.jsx';
import Segmented from '../ui/Segmented.jsx';
import Empty from '../ui/Empty.jsx';
import { upcoming, played, prettyDate, splitVenue, isPlayed, todayISO as todayStr } from '../lib/season.js';
import { surfaceForVenue } from '../data/venues.js';

const clockNow = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// Pick the fixture this screen should open on: today's game if there is one,
// otherwise the most recent unfinished game, otherwise the next one up.
function defaultFixture(stats) {
  const t = todayStr();
  const today = stats.find(g => g.date === t);
  if (today) return today;
  const recentUnfinished = stats
    .filter(g => g.date < t && !isPlayed(g))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return recentUnfinished || upcoming(stats)[0] || null;
}

const resultFromScore = (f, a) =>
  f === "" || a === "" || f == null || a == null ? "—" : f > a ? "W" : f < a ? "L" : "D";

export default function MatchDay({ stats, journal }) {
  const [fixtureId, setFixtureId] = useState(() => defaultFixture(stats)?.id || "");
  const fixture = useMemo(() => stats.find(g => g.id === fixtureId) || null, [stats, fixtureId]);

  const [goals, setGoals] = useState(0);
  const [assists, setAssists] = useState(0);
  const [sf, setSf] = useState(0);
  const [sa, setSa] = useState(0);
  const [minutes, setMinutes] = useState(0);
  // Up to three positions, in the order he played them.
  const [positions, setPositions] = useState(["", "", ""]);
  // null = not recorded yet, so a blank fixture isn't claimed as "did not start".
  const [started, setStarted] = useState(null);
  const [moment, setMoment] = useState("");
  const [moments, setMoments] = useState([]);
  const [status, setStatus] = useState("");      // "saving" | "saved" | ""
  const [savedAt, setSavedAt] = useState(null);
  // Nothing is written until you actually change something, so opening a
  // fixture to look at it never records anything.
  const touched = useRef(false);
  // A 0–0 scoreline is only a draw once someone has touched the score.
  const scoreTouched = useRef(false);
  // Suppress the autosave effect while a fixture's saved values load in.
  const loading = useRef(false);

  // Load whatever is already recorded for this fixture.
  useEffect(() => {
    if (!fixture) return;
    loading.current = true;
    touched.current = false;
    scoreTouched.current = false;
    setGoals(fixture.goals || 0);
    setAssists(fixture.assists || 0);
    setSf(Number(fixture.scoreFor) || 0);
    setSa(Number(fixture.scoreAgainst) || 0);
    setMinutes(fixture.minutes || 0);
    const existing = Array.isArray(fixture.positions) && fixture.positions.length
      ? fixture.positions
      : (fixture.position ? [fixture.position] : []);
    setPositions([existing[0] || "", existing[1] || "", existing[2] || ""]);
    setStarted(typeof fixture.started === "boolean" ? fixture.started : null);
    const j = (journal || []).find(e => e.statId === fixture.id || e.date === fixture.date);
    setMoments(j?.freeform ? j.freeform.split("\n").filter(Boolean) : []);
    setStatus("");
    setSavedAt(null);
    // Let this render settle before autosave starts watching.
    const t = setTimeout(() => { loading.current = false; }, 0);
    return () => clearTimeout(t);
  }, [fixtureId]);

  // Wrap the setters so any real edit arms the autosave.
  const edit = fn => v => { touched.current = true; fn(v); };
  const editScore = fn => v => { touched.current = true; scoreTouched.current = true; fn(v); };

  const result = resultFromScore(sf, sa);
  const r = RESULT[result] || RESULT["—"];

  // Moments write straight through rather than waiting for the debounce —
  // they are the thing most easily lost, and each one is a discrete event.
  const addMoment = () => {
    if (!moment.trim()) return;
    const next = [...moments, `${clockNow()} — ${moment.trim()}`];
    touched.current = true;
    setMoments(next);
    setMoment("");
    persist({ moments: next });
  };

  const removeMoment = i => {
    const next = moments.filter((_, j) => j !== i);
    touched.current = true;
    setMoments(next);
    persist({ moments: next });
  };

  // Writes go to localStorage first and mirror to Firebase, so this works
  // offline and syncs when the connection returns.
  const persist = useCallback((overrides = {}) => {
    if (!fixture) return;
    const m = overrides.moments ?? moments;
    const allStats = ld(SK.stats) || [];
    const playedPositions = positions.filter(Boolean);
    sv(SK.stats, allStats.map(st => st.id === fixture.id
      ? { ...st, goals, assists, minutes,
          positions: playedPositions,
          position: playedPositions[0] || st.position || "",
          started,
          // Leave the score and result alone until someone has touched them,
          // so an untouched fixture is never recorded as a 0–0 draw.
          ...(scoreTouched.current
            ? { scoreFor: sf, scoreAgainst: sa, result: resultFromScore(sf, sa) }
            : {}) }
      : st));

    const allJournal = ld(SK.journal) || [];
    const existing = allJournal.find(e => e.statId === fixture.id || e.date === fixture.date);
    const freeform = m.join("\n");
    const matchFacts = {
      goals, assists, minutes, started,
      positions: playedPositions,
      position: playedPositions[0] || fixture.position || "CB",
      ...(scoreTouched.current
        ? { scoreFor: sf, scoreAgainst: sa, result: resultFromScore(sf, sa) }
        : {}),
    };

    if (existing) {
      sv(SK.journal, allJournal.map(e => e.id === existing.id
        ? { ...e, ...matchFacts, freeform, statId: fixture.id } : e));
    } else if (freeform || scoreTouched.current) {
      sv(SK.journal, [{
        id: gid(), date: fixture.date, opponent: fixture.opponent,
        location: fixture.notes || "", surface: surfaceForVenue(fixture.notes || "") || "grass",
        wentWell: "", toImprove: "", rating: 5, freeform, statId: fixture.id,
        ...matchFacts,
      }, ...allJournal]);
    }
    setStatus("saved");
    setSavedAt(new Date());
  }, [fixture, goals, assists, sf, sa, minutes, positions, started, moments]);

  // Autosave. Every change is written, so nothing depends on remembering to
  // press a button during a match.
  useEffect(() => {
    if (!fixture || loading.current || !touched.current) return;
    setStatus("saving");
    const t = setTimeout(() => persist(), 600);
    return () => clearTimeout(t);
  }, [goals, assists, sf, sa, minutes, positions, started, moments, fixture, persist]);

  if (!stats.length) {
    return <div style={PAGE}><Empty icon="⚽" text="No fixtures yet."/></div>;
  }

  const { venue, time } = fixture ? splitVenue(fixture.notes || "") : {};
  const isToday = fixture?.date === todayStr();

  // Fixtures worth offering: anything near today, newest first.
  const choices = [...stats].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);

  return (
    <div style={{...PAGE, maxWidth: 620}}>
      <SectionTitle>MATCH DAY</SectionTitle>

      {/* which game */}
      <select value={fixtureId} onChange={e => setFixtureId(e.target.value)}
              style={{...IS, marginBottom: 16, fontSize: 15, padding: "14px"}}>
        {choices.map(g => (
          <option key={g.id} value={g.id}>
            {g.date === todayStr() ? "● TODAY — " : ""}{g.date} · {g.opponent}
          </option>
        ))}
      </select>

      {!fixture ? <Empty icon="⚽" text="Pick a fixture to log."/> : (
        <>
          <div style={{...GlassS, padding: "16px 20px", marginBottom: 20,
                       borderColor: isToday ? `${C.red}55` : "rgba(255,255,255,.07)", ...rise(0)}}>
            <div style={{color: isToday ? C.red : C.blue, fontSize: 10, fontWeight: 800,
                         letterSpacing: 2, textTransform: "uppercase"}}>
              {isToday ? "Today" : prettyDate(fixture.date)}
            </div>
            <div style={{fontFamily: DISPLAY, fontSize: 30, color: C.ink, lineHeight: 1.1, marginTop: 4}}>
              {fixture.opponent}
            </div>
            {(venue || time) && (
              <div style={{color: C.muted, fontSize: 12.5, marginTop: 3}}>
                {[time, venue].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>

          {/* score */}
          <div style={{...CardS, padding: "20px 16px", marginBottom: 14, ...rise(1)}}>
            <div className="pair">
              <Stepper label="Us" value={sf} onChange={editScore(setSf)} accent={C.blue}/>
              <Stepper label="Them" value={sa} onChange={editScore(setSa)} accent={C.muted}/>
            </div>
            <div style={{textAlign: "center", marginTop: 14}}>
              <span style={{background: r.bg, color: r.fg, border: `1px solid ${r.fg}44`,
                            padding: "5px 16px", borderRadius: 20, fontSize: 12,
                            fontWeight: 800, letterSpacing: 1.2}}>
                {result === "—" ? "NO SCORE YET" : r.label.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Seb's numbers */}
          <div style={{...CardS, padding: "20px 16px", marginBottom: 14, ...rise(2)}}>
            <div className="pair">
              <Stepper label="Goals" value={goals} onChange={edit(setGoals)} accent={C.red}/>
              <Stepper label="Assists" value={assists} onChange={edit(setAssists)} accent={RESULT.W.fg}/>
            </div>
          </div>

          <div style={{...CardS, padding: "20px 16px", marginBottom: 14, ...rise(3)}}>
            <Stepper label="Minutes played" value={minutes} onChange={edit(setMinutes)}
                     accent={C.gold} step={5} max={120}/>
          </div>

          {/* positions + started */}
          <div style={{...CardS, padding: "20px 16px", marginBottom: 14, ...rise(4)}}>
            <div style={{color: C.muted, fontSize: 11, fontWeight: 800, letterSpacing: 1.6,
                         textTransform: "uppercase", marginBottom: 10, textAlign: "center"}}>
              Positions played
            </div>
            <div style={{display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8}}>
              {[0, 1, 2].map(i => (
                <div key={i}>
                  <div style={{color: C.faint, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                               textAlign: "center", marginBottom: 5}}>
                    {["1ST", "2ND", "3RD"][i]}
                  </div>
                  <select value={positions[i]}
                          onChange={e => { touched.current = true; setPositions(p => p.map((v, j) => j === i ? e.target.value : v)); }}
                          style={{...IS, padding: "13px 8px", fontSize: 15, textAlign: "center",
                                  textAlignLast: "center",
                                  color: positions[i] ? C.ink : C.faint}}>
                    <option value="">—</option>
                    {POS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{color: C.faint, fontSize: 11.5, textAlign: "center", marginTop: 9}}>
              Leave 2nd and 3rd blank if he stayed in one position.
            </div>

            <div style={{height: 1, background: C.line, margin: "18px 0"}}/>

            <Segmented label="Started" value={started} onChange={edit(setStarted)}
                       accent={C.gold}
                       options={[{v: true, l: "Yes"}, {v: false, l: "No"}]}/>
          </div>

          {/* moments */}
          <div style={{...CardS, padding: "18px 16px", marginBottom: 18, ...rise(4)}}>
            <div style={{color: C.muted, fontSize: 11, fontWeight: 800, letterSpacing: 1.6,
                         textTransform: "uppercase", marginBottom: 10}}>Moments</div>
            <div style={{display: "flex", gap: 8}}>
              <input value={moment} onChange={e => setMoment(e.target.value)}
                     onKeyDown={e => e.key === "Enter" && addMoment()}
                     placeholder="e.g. great switch of play"
                     style={{...IS, flex: 1}}/>
              <button type="button" onClick={addMoment}
                      style={{...BP, padding: "12px 18px", flexShrink: 0}}>Add</button>
            </div>
            {moments.length > 0 && (
              <div style={{marginTop: 12, display: "grid", gap: 6}}>
                {moments.map((m, i) => (
                  <div key={i} style={{display: "flex", gap: 8, alignItems: "flex-start",
                                       background: C.bg, borderRadius: 8, padding: "8px 10px"}}>
                    <span style={{color: C.ink2, fontSize: 13, lineHeight: 1.5, flex: 1}}>{m}</span>
                    <button type="button" onClick={() => removeMoment(i)}
                            style={{background: "none", border: "none", color: C.faint,
                                    cursor: "pointer", fontSize: 14, padding: 0}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Autosave status. The button is a reassurance, not a requirement —
              everything above is already written as you tap. */}
          <div style={{display: "flex", alignItems: "center", gap: 12, marginTop: 4}}>
            <div style={{flex: 1, display: "flex", alignItems: "center", gap: 8}}>
              <span style={{width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                            background: status === "saving" ? C.gold
                                      : status === "saved" ? RESULT.W.fg : C.faint,
                            animation: status === "saving" ? "pulseDot 1s ease-in-out infinite" : "none"}}/>
              <span style={{color: status === "saved" ? RESULT.W.fg : C.muted,
                            fontSize: 12.5, fontWeight: 600}}>
                {status === "saving" ? "Saving…"
                  : status === "saved"
                    ? `Saved${savedAt ? " " + savedAt.toLocaleTimeString([], {hour: "numeric", minute: "2-digit"}) : ""}`
                    : "Changes save automatically"}
              </span>
            </div>
            <button type="button" onClick={() => persist()}
                    style={{...BS, padding: "10px 18px", fontSize: 13}}>Save now</button>
          </div>

          <p style={{color: C.faint, fontSize: 12, textAlign: "center", marginTop: 12, lineHeight: 1.6}}>
            Passes, tackles and Taka counts aren't here on purpose — they come from
            the match analytics afterwards, not from watching. Add those on the Stats
            tab later.
          </p>
        </>
      )}
    </div>
  );
}
