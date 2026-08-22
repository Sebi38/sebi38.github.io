export default function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{padding:"8px 14px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",background:active?"#e63946":"#111b33",color:active?"#fff":"#5a6a8a",border:active?"none":"1px solid #1e2d50",fontFamily:"'Outfit',sans-serif"}}>
      {label}
    </button>
  );
}
