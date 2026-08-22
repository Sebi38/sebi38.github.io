import { IS } from './theme.js';

export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{position:"relative",flex:1,maxWidth:320}}>
      <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#3a4560",fontSize:16}}>🔍</span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...IS,paddingLeft:36,background:"#0d1526"}}/>
    </div>
  );
}
