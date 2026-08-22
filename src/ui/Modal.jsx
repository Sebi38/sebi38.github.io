export default function Modal({ title, onClose, children, wide }) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#111b33",borderRadius:20,padding:32,maxWidth:wide?700:560,width:"100%",border:"1px solid #1e2d50",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#fff",margin:0,letterSpacing:1}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#5a6a8a",fontSize:24,cursor:"pointer"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
