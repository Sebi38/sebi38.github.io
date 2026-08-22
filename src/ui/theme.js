// Shared inline-style constants. The original app used inline styles
// throughout; these are the pieces that were repeated everywhere.

// Input
export const IS = {width:"100%",padding:"12px 14px",fontSize:14,background:"#0a0f1e",border:"1px solid #1e2d50",borderRadius:10,color:"#fff",outline:"none",boxSizing:"border-box",fontFamily:"'Outfit',sans-serif"};
// Label
export const LS = {color:"#8892a8",fontSize:13,fontWeight:600,marginBottom:6,display:"block"};
// Button, primary
export const BP = {padding:"12px 24px",fontSize:14,fontWeight:700,background:"linear-gradient(135deg,#e63946,#c1121f)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",letterSpacing:0.5,fontFamily:"'Outfit',sans-serif"};
// Button, secondary
export const BS = {padding:"12px 24px",fontSize:14,fontWeight:600,background:"transparent",color:"#5a6a8a",border:"1px solid #1e2d50",borderRadius:10,cursor:"pointer",fontFamily:"'Outfit',sans-serif"};
// Card
export const CardS = {background:"linear-gradient(145deg,#111b33,#0d1526)",borderRadius:14,border:"1px solid #1a2540"};

// Section heading used at the top of each page
export const H2 = {fontFamily:"'Bebas Neue',sans-serif",fontSize:36,color:"#fff",margin:0,letterSpacing:2};
// Page wrapper
export const PAGE = {padding:"40px 24px",maxWidth:960,margin:"0 auto"};

// Rating colour: green / amber / red
export const rC = r => (r >= 8 ? "#2ecc71" : r >= 5 ? "#f39c12" : "#e63946");

// Result colours
export const RESULT_COLORS = {W:"#2ecc71",L:"#e63946",D:"#f39c12"};
