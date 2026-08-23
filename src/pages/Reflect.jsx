import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SK } from '../config.js';
import { ld, sv, gid } from '../lib/storage.js';
import { C, CardS, GlassS, DISPLAY, PAGE, IS, BP, RESULT, rC, rise, BS } from '../ui/theme.js';
import SectionTitle from '../ui/SectionTitle.jsx';
import Empty from '../ui/Empty.jsx';
import { played, prettyDate, isPlayed } from '../lib/season.js';
import { questionsOf, questionsToText, mergeQuestionText } from '../lib/questions.js';

// Seb's page. Three questions and nothing else — the reflection is the
// development work, so it should not be buried in a fifteen-field form.
const PROMPTS = [
  "What did I do well today?",
  "What do I want to be better at?",
  "Questions for my coaches",
];

export default function Reflect({ stats, journal, focusId }) {
  // Games already played, newest first — reflecting is a post-match act.
  const games = useMemo(() => played(stats), [stats]);
  const [gameId, setGameId] = useState(() => focusId || games[0]?.id || "");
  // Follow the match chosen on the Matches tab.
  useEffect(() => { if (focusId && focusId !== gameId) setGameId(focusId); }, [focusId]);
  const game = useMemo(() => games.find(g => g.id === gameId) || null, [games, gameId]);

  const entry = useMemo(
    () => (journal || []).find(e => e.statId === gameId || (game && e.date === game.date)) || null,
    [journal, gameId, game]
  );

  const [rating, setRating] = useState(5);
  const [wentWell, setWentWell] = useState("");
  const [toImprove, setToImprove] = useState("");
  const [questions, setQuestions] = useState("");
  const [status, setStatus] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  // Same rule as Match Day: nothing is written until something is changed, so
  // opening a match to read it never records anything.
  const touched = useRef(false);
  const loading = useRef(false);

  useEffect(() => {
    loading.current = true;
    touched.current = false;
    setRating(entry?.rating ?? 5);
    setWentWell(entry?.wentWell || "");
    setToImprove(entry?.toImprove || "");
    setQuestions(questionsToText(questionsOf(entry)));
    setStatus("");
    setSavedAt(null);
    const t = setTimeout(() => { loading.current = false; }, 0);
    return () => clearTimeout(t);
  }, [gameId, entry?.id]);

  const save = useCallback(() => {
    if (!game) return;
    const all = ld(SK.journal) || [];
    if (entry) {
      sv(SK.journal, all.map(e => e.id === entry.id
        ? { ...e, rating, wentWell, toImprove, questionsForCoaches: mergeQuestionText(questions, questionsOf(entry)), statId: game.id } : e));
    } else {
      sv(SK.journal, [{
        id: gid(), date: game.date, opponent: game.opponent, location: game.notes || "",
        surface: "grass", position: game.position || "CB",
        wentWell, toImprove, questionsForCoaches: mergeQuestionText(questions), rating, moments: [], statId: game.id,
      }, ...all]);
    }
    setStatus("saved");
    setSavedAt(new Date());
  }, [game, entry, rating, wentWell, toImprove, questions, journal]);

  // Autosave — a reflection half-typed and abandoned should still be there.
  useEffect(() => {
    if (!game || loading.current || !touched.current) return;
    setStatus("saving");
    const t = setTimeout(() => save(), 700);
    return () => clearTimeout(t);
  }, [rating, wentWell, toImprove, questions, game, save]);

  if (!games.length) {
    return <div style={PAGE}><Empty icon="✍️" text="No played games yet — reflections unlock after a match."/></div>;
  }

  const r = RESULT[game?.result] || RESULT["—"];
  const score = game && game.scoreFor !== "" && game.scoreFor != null && game.scoreAgainst != null && game.scoreAgainst !== ""
    ? `${game.scoreFor}–${game.scoreAgainst}` : null;

  const field = (label, value, onChange, placeholder) => (
    <div style={{...CardS, padding: "18px 16px", marginBottom: 14}}>
      <label style={{color: C.ink, fontSize: 15, fontWeight: 700, display: "block", marginBottom: 10}}>
        {label}
      </label>
      <textarea value={value} onChange={e => { touched.current = true; onChange(e.target.value); }} rows={4} placeholder={placeholder}
                style={{...IS, resize: "vertical", fontSize: 15, lineHeight: 1.6}}/>
    </div>
  );

  return (
    <div style={{...PAGE, maxWidth: 620}}>
      <SectionTitle>SEBI'S MATCH DAY REVIEW</SectionTitle>

      <select value={gameId} onChange={e => setGameId(e.target.value)}
              style={{...IS, marginBottom: 16, fontSize: 15, padding: "14px"}}>
        {games.map(g => (
          <option key={g.id} value={g.id}>{g.date} · {g.opponent} · {g.result}</option>
        ))}
      </select>

      {game && (
        <>
          <div style={{...GlassS, padding: "16px 20px", marginBottom: 20, display: "flex",
                       alignItems: "center", gap: 14, ...rise(0)}}>
            <div style={{flex: 1}}>
              <div style={{fontFamily: DISPLAY, fontSize: 28, color: C.ink, lineHeight: 1.1}}>{game.opponent}</div>
              <div style={{color: C.muted, fontSize: 12.5, marginTop: 3}}>{prettyDate(game.date)}</div>
            </div>
            <div style={{textAlign: "right"}}>
              <div style={{fontFamily: DISPLAY, fontSize: 26, color: r.fg, lineHeight: 1}}>{score || game.result}</div>
            </div>
          </div>

          {/* rating */}
          <div style={{...CardS, padding: "20px 16px", marginBottom: 14, ...rise(1)}}>
            <div style={{textAlign: "center"}}>
              <div style={{color: C.muted, fontSize: 11, fontWeight: 800, letterSpacing: 1.6,
                           textTransform: "uppercase"}}>How did I play?</div>
              <div style={{fontFamily: DISPLAY, fontSize: 62, color: rC(rating), lineHeight: 1.1, marginTop: 4}}>
                {rating}<span style={{fontSize: 24, color: C.faint}}>/10</span>
              </div>
            </div>
            <input type="range" min="1" max="10" value={rating}
                   onChange={e => { touched.current = true; setRating(parseInt(e.target.value)); }}
                   style={{width: "100%", accentColor: rC(rating), marginTop: 10, height: 30}}/>
            <div style={{display: "flex", justifyContent: "space-between", color: C.faint, fontSize: 11}}>
              <span>Off day</span><span>Best game</span>
            </div>
          </div>

          {field(PROMPTS[0], wentWell, setWentWell, "One or two things. Be specific — “won my headers” beats “played well”.")}
          {field(PROMPTS[1], toImprove, setToImprove, "One thing to take into training this week.")}
          {field(PROMPTS[2], questions, setQuestions, "One question per line. Each becomes its own item you can tick off once it's answered.")}

          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:4}}>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:8,height:8,borderRadius:"50%",flexShrink:0,
                            background: status==="saving" ? C.gold : status==="saved" ? RESULT.W.fg : C.faint,
                            animation: status==="saving" ? "pulseDot 1s ease-in-out infinite" : "none"}}/>
              <span style={{color: status==="saved" ? RESULT.W.fg : C.muted, fontSize:12.5, fontWeight:600}}>
                {status==="saving" ? "Saving…"
                  : status==="saved" ? `Saved${savedAt ? " " + savedAt.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}) : ""}`
                  : "Changes save automatically"}
              </span>
            </div>
            <button type="button" onClick={() => save()} style={{...BS,padding:"10px 18px",fontSize:13}}>Save now</button>
          </div>
        </>
      )}
    </div>
  );
}
