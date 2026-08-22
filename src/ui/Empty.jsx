export default function Empty({ icon, text }) {
  return (
    <div style={{textAlign:"center",padding:60,color:"#5a6a8a",background:"#0d1526",borderRadius:16,border:"1px solid #1a2540"}}>
      <div style={{fontSize:48,marginBottom:12}}>{icon}</div>
      <p style={{margin:0}}>{text}</p>
    </div>
  );
}
