import { io } from 'socket.io-client';

/**
 * Singleton Socket.IO client instance.
 *
 * We create a single socket that persists across page navigations within
 * the same browser tab, avoiding duplicate connections when components
 * re-mount. The socket connects lazily (autoConnect: false so we control
 * exactly when it connects).
 */

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000', {
      autoConnect: false,
    });
  }
  return socket;
}
