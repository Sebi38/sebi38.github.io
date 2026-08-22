import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/auth';

// Firebase web config is public by design — it identifies the project, it does
// not authorize access. Access control lives in the Realtime Database rules
// (see database.rules.json) and is enforced by Firebase Authentication below.
const firebaseConfig = {
  apiKey: "AIzaSyDnulrGY8quwJqgADAldowBMigULax7_TY",
  authDomain: "sebi-soccer-38.firebaseapp.com",
  databaseURL: "https://sebi-soccer-38-default-rtdb.firebaseio.com",
  projectId: "sebi-soccer-38",
  storageBucket: "sebi-soccer-38.firebasestorage.app",
  messagingSenderId: "465168408261",
  appId: "1:465168408261:web:49ce5caf5df95939589aac",
};

firebase.initializeApp(firebaseConfig);

export const db = firebase.database();
export const auth = firebase.auth();

// Root node for everything this app owns.
export const ROOT = 'seb38';

// Keep the family signed in across visits so nobody has to log in every time.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(console.error);

export function signIn(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

export function signOutUser() {
  return auth.signOut();
}

// Resolves once Firebase has restored (or failed to restore) the session.
export function onAuthReady(callback) {
  return auth.onAuthStateChanged(callback);
}
