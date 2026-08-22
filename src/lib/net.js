// Firebase Realtime Database reads do not fail when the device is offline —
// `once('value')` simply waits for a connection that may never arrive. At a
// soccer field with no signal that means the app hangs on "Loading data…"
// forever. Every read goes through here so it can give up and let the caller
// fall back to the localStorage cache.

export class Offline extends Error {
  constructor(msg = 'No connection to the database') {
    super(msg);
    this.name = 'Offline';
    this.offline = true;
  }
}

export function withTimeout(promise, ms = 6000, label = 'read') {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Offline(`Timed out waiting for ${label}`)), ms);
    }),
  ]);
}

// Read a Firebase ref, giving up rather than hanging.
export const readOnce = (ref, ms = 6000) =>
  withTimeout(ref.once('value'), ms, ref.toString().split('/').slice(-1)[0] || 'data');
