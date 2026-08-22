import { useState } from 'react';
import { PLAYER } from '../config.js';
import { signIn } from '../lib/firebase.js';
import { IS, BP } from '../ui/theme.js';

// Maps Firebase's error codes onto something a parent can act on.
const MESSAGES = {
  'auth/invalid-email': 'That doesn’t look like a valid email address.',
  'auth/invalid-credential': 'Email or password not recognised.',
  'auth/wrong-password': 'Email or password not recognised.',
  'auth/user-not-found': 'Email or password not recognised.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': 'Could not reach Firebase. Check your connection.',
  // These two mean the Firebase project itself isn't set up yet, not that the
  // user typed something wrong — see the Authentication section of README.md.
  'auth/configuration-not-found': 'Firebase Authentication is not enabled for this project yet. Enable Email/Password in the Firebase console.',
  'auth/operation-not-allowed': 'Email/Password sign-in is disabled in the Firebase console. Enable it under Authentication → Sign-in method.',
};

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (busy || !email || !password) return;
    setBusy(true); setErr('');
    try {
      await signIn(email.trim(), password);
      // App re-renders via onAuthStateChanged; nothing to do here.
    } catch (e) {
      setErr(MESSAGES[e.code] || 'Sign-in failed. Please try again.');
      setBusy(false);
    }
  };

  const onKey = e => { if (e.key === 'Enter') go(); };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#0a0f1e 0%,#111b33 50%,#1a1020 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",maxWidth:400,padding:"0 24px",width:"100%"}}>
        <div style={{fontSize:72,marginBottom:8}}>⚽</div>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,color:"#fff",margin:"0 0 4px",letterSpacing:2}}>SEB <span style={{color:"#e63946"}}>#{PLAYER.number}</span></h1>
        <p style={{color:"#5a6a8a",fontSize:14,marginBottom:32,letterSpacing:1}}>{PLAYER.team}</p>

        <input
          type="email" autoComplete="username" value={email}
          onChange={e=>setEmail(e.target.value)} onKeyDown={onKey}
          placeholder="Family email"
          style={{...IS,border:"2px solid #1e2d50",marginBottom:12}}/>
        <input
          type="password" autoComplete="current-password" value={password}
          onChange={e=>setPassword(e.target.value)} onKeyDown={onKey}
          placeholder="Password"
          style={{...IS,border:err?"2px solid #e63946":"2px solid #1e2d50",marginBottom:err?0:16}}/>

        {err&&<p style={{color:"#e63946",fontSize:13,margin:"8px 0"}}>{err}</p>}

        <button onClick={go} disabled={busy}
          style={{...BP,width:"100%",marginTop:err?8:0,padding:"14px",opacity:busy?0.6:1,cursor:busy?"default":"pointer"}}>
          {busy ? 'SIGNING IN…' : 'ENTER'}
        </button>
      </div>
    </div>
  );
}
