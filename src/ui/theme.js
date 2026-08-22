// ── Palette ──────────────────────────────────────────────────────────────────
// Club-derived: deep navy ground, red primary, steel blue secondary.
export const C = {
  ink:      "#ffffff",
  ink2:     "#c8d0e0",
  ink3:     "#8892a8",
  muted:    "#5a6a8a",
  faint:    "#3a4560",

  bg:       "#070b16",
  surface:  "#0d1526",
  surface2: "#111b33",
  line:     "#1a2540",
  line2:    "#1e2d50",

  red:      "#e63946",
  redDeep:  "#c1121f",
  blue:     "#4a7ccc",
  blueDeep: "#1d3557",
  gold:     "#f4a261",
  violet:   "#9b59b6",
  teal:     "#2a9d8f",
};

// Status palette — reserved for match outcome, never reused as a series colour.
// Always paired with the W/D/L letter so identity is never colour-alone.
export const RESULT = {
  W: { fg: "#2ecc71", bg: "rgba(46,204,113,0.14)", label: "Win"  },
  D: { fg: "#f39c12", bg: "rgba(243,156,18,0.14)", label: "Draw" },
  L: { fg: "#e63946", bg: "rgba(230,57,70,0.14)",  label: "Loss" },
  "—":{ fg: "#5a6a8a", bg: "rgba(90,106,138,0.12)",label: "Upcoming" },
};
export const RESULT_COLORS = { W: RESULT.W.fg, D: RESULT.D.fg, L: RESULT.L.fg };

// ── Type ─────────────────────────────────────────────────────────────────────
export const DISPLAY = "'Bebas Neue', sans-serif";
export const BODY = "'Outfit', sans-serif";

// ── Form controls ────────────────────────────────────────────────────────────
export const IS = {width:"100%",padding:"12px 14px",fontSize:14,background:C.bg,border:`1px solid ${C.line2}`,borderRadius:10,color:C.ink,outline:"none",boxSizing:"border-box",fontFamily:BODY};
export const LS = {color:C.ink3,fontSize:13,fontWeight:600,marginBottom:6,display:"block"};
export const BP = {padding:"12px 24px",fontSize:14,fontWeight:700,background:`linear-gradient(135deg,${C.red},${C.redDeep})`,color:C.ink,border:"none",borderRadius:10,cursor:"pointer",letterSpacing:0.5,fontFamily:BODY,boxShadow:"0 6px 18px rgba(230,57,70,0.28)"};
export const BS = {padding:"12px 24px",fontSize:14,fontWeight:600,background:"transparent",color:C.muted,border:`1px solid ${C.line2}`,borderRadius:10,cursor:"pointer",fontFamily:BODY};

// ── Surfaces ─────────────────────────────────────────────────────────────────
export const CardS = {
  background:`linear-gradient(145deg,${C.surface2},${C.surface})`,
  borderRadius:16,
  border:`1px solid ${C.line}`,
};
export const GlassS = {
  background:"rgba(17,27,51,0.62)",
  backdropFilter:"blur(14px)",
  border:"1px solid rgba(255,255,255,0.07)",
  borderRadius:18,
};

// ── Layout ───────────────────────────────────────────────────────────────────
export const PAGE = {padding:"40px 24px 72px",maxWidth:1040,margin:"0 auto"};
export const H2 = {fontFamily:DISPLAY,fontSize:38,color:C.ink,margin:0,letterSpacing:2};


// Rating colour: green / amber / red
export const rC = r => (r >= 8 ? RESULT.W.fg : r >= 5 ? RESULT.D.fg : RESULT.L.fg);

// ── Motion ───────────────────────────────────────────────────────────────────
// Keyframes live in styles.css; this just staggers children.
export const rise = (i = 0) => ({
  animation: `rise 520ms cubic-bezier(.22,1,.36,1) ${i * 55}ms both`,
});
