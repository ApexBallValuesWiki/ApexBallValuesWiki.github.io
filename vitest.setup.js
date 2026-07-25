// Node < 22 has no global WebSocket, which makes @supabase/realtime-js throw
// during createClient() at import time. Tests never open a socket, so a stub
// constructor is enough to let the client initialize. (In the browser build
// the native WebSocket is always present and this never runs.)
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class WebSocketUnavailableInTests {
    constructor() {
      throw new Error('WebSocket is not available in the test environment.');
    }
  };
}
