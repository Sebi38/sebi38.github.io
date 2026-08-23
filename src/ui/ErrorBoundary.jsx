import { Component } from 'react';
import { C, CardS, DISPLAY, BODY, PAGE, BS } from './theme.js';

// A render error anywhere in a page used to unmount the whole app, nav and
// all — one bad row on Match Day took the site down mid-game and a reload
// landed straight back on it. A tab that breaks should stay one broken tab.
//
// Reset by giving this a `key` that changes with the tab, so switching away
// and back mounts a fresh boundary rather than staying stuck on the error.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Nothing to report to, but the stack is worth having in the console
    // when this happens on a phone at the side of a pitch.
    console.error("Page crashed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={PAGE}>
        <div style={{...CardS, padding: "32px 24px", textAlign: "center", maxWidth: 520, margin: "0 auto"}}>
          <div style={{fontSize: 44, marginBottom: 10}}>⚠️</div>
          <div style={{fontFamily: DISPLAY, fontSize: 28, color: C.ink, letterSpacing: 1}}>
            THIS TAB HIT A SNAG
          </div>
          <p style={{color: C.ink3, fontSize: 14, lineHeight: 1.6, marginTop: 8}}>
            Nothing you entered is lost — it's saved on this device and synced.
            The other tabs still work.
          </p>
          <p style={{color: C.faint, fontSize: 12, fontFamily: "ui-monospace, monospace",
                     marginTop: 12, wordBreak: "break-word"}}>
            {this.state.error?.message || String(this.state.error)}
          </p>
          <button type="button" onClick={() => this.setState({ error: null })}
                  style={{...BS, marginTop: 16, fontFamily: BODY}}>Try again</button>
        </div>
      </div>
    );
  }
}
