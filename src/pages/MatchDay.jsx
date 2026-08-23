import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SK, POS } from '../config.js';
import { ld, sv, gid } from '../lib/storage.js';
import { hasValue } from '../lib/numbers.js';
import { C, CardS, GlassS, DISPLAY, BODY, PAGE, IS, LS, BP, BS, RESULT, rC, rise } from '../ui/theme.js';
import SectionTitle from '../ui/SectionTitle.jsx';
import Stepper from '../ui/Stepper.jsx';
import Segmented from '../ui/Segmented.jsx';
import Empty from '../ui/Empty.jsx';
import { prettyDate, venueOf, isPlayed, todayISO as todayStr,
         fixtureChoices, fixtureLabel, defaultMatchDayFixture } from '../lib/season.js';
import { surfaceForVenue } from '../data/venues.js';
import { momentsOf, momentId, label as momentLabel } from '../lib/moments.js';
import { EVENT_TYPES, eventsOf, countOf } from '../lib/events.js';

const clockNow = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const resultFromScore = (f, a) =>
  f === "" || a === "" || f == null || a == null ? "—" : f > a ? "W" : f < a ? "L" : "D";

export default function MatchDay({ stats, journal, focusId }) {
  const [fixtureId, setFixtureId] = useState(() => focusId || defaultMatchDayFixture(stats)?.id || "");
  // Follow the match chosen on the Matches tab.
  useEffect(() => { if (focusId && focusId !== fixtureId) setFixtureId(focusId); }, [focusId]);
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
  const [fieldName, setFieldName] = useState("");
  const [address, setAddress] = useState("");
  const [events, setEvents] = useState([]);
  const [surface, setSurface] = useState("grass");
  const [moment, setMoment] = useState("");
  const [moments, setMoments] = useState([]);
  const [status, setStatus] = useState("");      // "saving" | "saved" | ""
  const [savedAt, setSavedAt] = useState(null);
  // Nothing is written until you actually change something, so opening a
  // fixture to look at it never records anything.
  const touched = useRef(false);
  // A 0–0 scoreline is only a draw once someone has touched the score.
  const scoreTouched = useRef(false);
  const [scoreDirty, setScoreDirty] = useState(false);
  // Suppress the autosave effect while a fixture's saved values load in.
  const loading = useRef(false);

  // Load whatever is already recorded for this fixture.
  useEffect(() => {
    if (!fixture) return;
    loading.current = true;
    touched.current = false;
    scoreTouched.current = false;
    setScoreDirty(false);
    setGoals(fixture.goals || 0);
    setAssists(fixture.assists || 0);
    setSf(Number(fixture.scoreFor) || 0);
    if (hasValue(fixture.scoreFor) && hasValue(fixture.scoreAgainst)) {
      scoreTouched.current = true; setScoreDirty(true);
    }
    setSa(Number(fixture.scoreAgainst) || 0);
    setMinutes(fixture.minutes || 0);
    const existing = Array.isArray(fixture.positions) && fixture.positions.length
      ? fixture.positions
      : (fixture.position ? [fixture.position] : []);
    setPositions([existing[0] || "", existing[1] || "", existing[2] || ""]);
    setStarted(typeof fixture.started === "boolean" ? fixture.started : null);
    const v = venueOf(fixture);
    setFieldName(v.fieldName);
    setAddress(v.address);
    setEvents(eventsOf(fixture));
    const j0 = (journal || []).find(e => e.statId === fixture.id || e.date === fixture.date);
    setSurface(j0?.surface || surfaceForVenue(`${v.fieldName} ${v.address}`) || "grass");
    const j = (journal || []).find(e => e.statId === fixture.id || e.date === fixture.date);
    setMoments(momentsOf(j));
    setStatus("");
    setSavedAt(null);
    // Let this render settle before autosave starts watching.
    const t = setTimeout(() => { loading.current = false; }, 0);
    return () => clearTimeout(t);
  }, [fixtureId]);

  // Wrap the setters so any real edit arms the autosave.
  const edit = fn => v => { touched.current = true; fn(v); };
  const editScore = fn => v => { touched.current = true; scoreTouched.current = true; setScoreDirty(true); fn(v); };

  const result = scoreDirty ? resultFromScore(sf, sa) : "—";
  const r = RESULT[result] || RESULT["—"];

  // Moments write straight through rather than waiting for the debounce —
  // they are the thing most easily lost, and each one is a discrete event.
  const addMoment = () => {
    if (!moment.trim()) return;
    const next = [...moments, { id: momentId(), t: clockNow(), text: moment.trim(), reviewed: false }];
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
    const ev = overrides.events ?? events;
    const allStats = ld(SK.stats) || [];
    const playedPositions = positions.filter(Boolean);
    sv(SK.stats, allStats.map(st => st.id === fixture.id
      ? { ...st, goals, assists, minutes,
          positions: playedPositions,
          position: playedPositions[0] || st.position || "",
          started, fieldName, address, events: ev,
          // Leave the score and result alone until someone has touched them,
          // so an untouched fixture is never recorded as a 0–0 draw.
          ...(scoreTouched.current
            ? { scoreFor: sf, scoreAgainst: sa, result: resultFromScore(sf, sa) }
            : {}) }
      : st));

    const allJournal = ld(SK.journal) || [];
    const existing = allJournal.find(e => e.statId === fixture.id || e.date === fixture.date);
    const momentList = m;
    const matchFacts = {
      goals, assists, minutes, started,
      positions: playedPositions,
      position: playedPositions[0] || fixture.position || "CB",
      fieldName, address, surface,
      ...(scoreTouched.current
        ? { scoreFor: sf, scoreAgainst: sa, result: resultFromScore(sf, sa) }
        : {}),
    };

    if (existing) {
      sv(SK.journal, allJournal.map(e => e.id === existing.id
        ? { ...e, ...matchFacts, moments: momentList, freeform: "", statId: fixture.id } : e));
    } else if (momentList.length || scoreTouched.current) {
      sv(SK.journal, [{
        id: gid(), date: fixture.date, opponent: fixture.opponent,
        fieldName, address, surface,
        wentWell: "", toImprove: "", questionsForCoaches: "", rating: 5,
        moments: momentList, statId: fixture.id,
        ...matchFacts,
      }, ...allJournal]);
    }
    setStatus("saved");
    setSavedAt(new Date());
  }, [fixture, goals, assists, sf, sa, minutes, positions, started, moments, events, fieldName, address, surface]);

  // Autosave. Every change is written, so nothing depends on remembering to
  // press a button during a match.
  useEffect(() => {
    if (!fixture || loading.current || !touched.current) return;
    setStatus("saving");
    const t = setTimeout(() => persist(), 600);
    return () => clearTimeout(t);
  }, [goals, assists, sf, sa, minutes, positions, started, moments, events, fieldName, address, surface, fixture, persist]);

  if (!stats.length) {
    return <div style={PAGE}><Empty icon="⚽" text="No fixtures yet."/></div>;
  }

  const v = fixture ? venueOf({ ...fixture, fieldName, address }) : {};
  const isToday = fixture?.date === todayStr();

  // Fixtures worth offering: anything near today, newest first.
  const choices = fixtureChoices(stats);

  return (
    <div style={{...PAGE, maxWidth: 620}}>
      <SectionTitle>MATCH DAY</SectionTitle>

      {/* which game */}
      <select value={fixtureId} onChange={e => setFixtureId(e.target.value)}
              style={{...IS, marginBottom: 16, fontSize: 15, padding: "14px"}}>
        {choices.map(g => (
          <option key={g.id} value={g.id}>
            {fixtureLabel(g)}
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
            {(v.fieldName || v.address || v.kickoff) && (
              <div style={{color: C.muted, fontSize: 12.5, marginTop: 3}}>
                {[v.fieldName || v.address, v.kickoff].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>

          {/* where — editable at the field, because the venue on the
              calendar is often wrong and the surface is only known on arrival */}
          <div style={{...CardS, padding: "16px", marginBottom: 14, ...rise(0)}}>
            <label style={LS}>Field name</label>
            <input value={fieldName}
                   onChange={e => { touched.current = true; setFieldName(e.target.value); }}
                   placeholder="e.g. Williamsburg Middle School"
                   style={{...IS, marginBottom: 10}}/>
            <label style={LS}>Address</label>
            <input value={address}
                   onChange={e => { touched.current = true; setAddress(e.target.value); }}
                   placeholder="e.g. 5241 36th St N, Arlington, VA 22207"
                   style={{...IS, marginBottom: 12}}/>
            <Segmented label="Surface" value={surface} accent={C.teal}
                       onChange={v => { touched.current = true; setSurface(v); }}
                       options={[{v:"grass",l:"🌱 Grass"},{v:"turf",l:"🏟 Turf"}]}/>
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

          {/* timed events — one tap stamps the time */}
          <div style={{...CardS, padding: "18px 16px", marginBottom: 14, ...rise(5)}}>
            <div style={{color: C.muted, fontSize: 11, fontWeight: 800, letterSpacing: 1.6,
                         textTransform: "uppercase", marginBottom: 12, textAlign: "center"}}>Match events</div>
            <div style={{display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8}}>
              {EVENT_TYPES.map(t => (
                <button key={t.key} type="button"
                        onClick={() => { touched.current = true;
                          const next = [...events, { id: momentId(), t: clockNow(), type: t.key, note: "" }];
                          setEvents(next); persist({ events: next }); }}
                        style={{padding: "14px 6px", borderRadius: 12, cursor: "pointer", fontFamily: BODY,
                                background: C.surface, border: `1px solid ${C.line2}`, color: C.ink,
                                WebkitTapHighlightColor: "transparent"}}>
                  <div style={{fontSize: 20, lineHeight: 1}}>{t.icon}</div>
                  <div style={{fontFamily: DISPLAY, fontSize: 26, color: C.blue, lineHeight: 1.1, marginTop: 4}}>
                    {countOf(events, t.key)}
                  </div>
                  <div style={{fontSize: 10, fontWeight: 700, letterSpacing: .8, color: C.muted,
                               textTransform: "uppercase", marginTop: 2}}>{t.label}</div>
                </button>
              ))}
            </div>
            {events.length > 0 && (
              <div style={{marginTop: 12, display: "grid", gap: 5}}>
                {[...events].reverse().map(e => {
                  const type = EVENT_TYPES.find(x => x.key === e.type);
                  return (
                    <div key={e.id} style={{display: "flex", gap: 8, alignItems: "center",
                                            background: C.bg, borderRadius: 8, padding: "7px 10px"}}>
                      <span style={{fontSize: 14}}>{type?.icon}</span>
                      <span style={{color: C.ink2, fontSize: 13, flex: 1}}>
                        {e.t} — {type?.label.replace(/s$/, "")}
                      </span>
                      <button type="button"
                              onClick={() => { touched.current = true;
                                const next = events.filter(x => x.id !== e.id);
                                setEvents(next); persist({ events: next }); }}
                              style={{background: "none", border: "none", color: C.faint,
                                      cursor: "pointer", fontSize: 14, padding: 0}}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
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
                  <div key={m.id || i} style={{display: "flex", gap: 8, alignItems: "flex-start",
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
            the match analytics afterwards, not from watching. Add those on the Matches
            tab later.
          </p>
        </>
      )}
    </div>
  );
}
