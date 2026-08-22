import { C, H2 } from './theme.js';

// Section heading with a red rule underneath.
export default function SectionTitle({ children, right }) {
  return (
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,marginBottom:18,flexWrap:"wrap"}}>
      <div>
        <h2 style={H2}>{children}</h2>
        <div style={{height:3,width:56,background:`linear-gradient(90deg,${C.red},transparent)`,borderRadius:2,marginTop:6}}/>
      </div>
      {right}
    </div>
  );
}
