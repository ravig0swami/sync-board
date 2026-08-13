/**
 * Session management for room access control.
 *
 * Stores a map of board-URL token -> room code for the rooms the user has
 * *explicitly* joined through the landing page (i.e. they knew the code and
 * submitted it). The board URL only ever contains an opaque token, never the
 * human-readable room code. This pairing acts as an access gate: directly
 * navigating to /board/[token] will NOT grant access because sessionStorage is
 * per-tab and is only populated by the landing-page "join with room code" flow.
 *
 * We use sessionStorage (not localStorage) so that:
 *  - Same-tab refreshes & SPA navigations: access persists ✓
 *  - New tabs/windows with the URL: access denied ✗ (redirected to landing)
 */

const SESSION_KEY = "whiteboard_board_tokens";

/**
 * Record that the user has joined a room through the proper flow.
 * Called from the landing page after the server confirms a successful
 * create-room or join-room and returns its opaque board token.
 *
 * @param {string} token   The opaque board-URL token (never the room code).
 * @param {string} roomCode
 */
function markRoomAsJoined(token, roomCode) {
  if (!token || !roomCode) return;
  const map = getTokenMap();
  map[token] = roomCode;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(map));
}

/**
 * Get the token -> roomCode map for this tab session.
 *
 * @returns {Object<string, string>}
 */
function getTokenMap() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Recover the room code for a given board-URL token.
 * Returns undefined if this session never joined that room.
 *
 * @param {string} token
 * @returns {string|undefined}
 */
function getRoomCodeForToken(token) {
  return getTokenMap()[token];
}

/**
 * Check whether the user has explicitly joined the room behind this token in
 * the current tab session.
 *
 * @param {string} token
 * @returns {boolean}
 */
function hasJoinedRoom(token) {
  return Boolean(getTokenMap()[token]);
}

/**
 * Remove a room from the joined map.
 * Called when the user explicitly leaves a room.
 *
 * @param {string} token The opaque board-URL token for the room.
 */
function leaveRoom(token) {
  const map = getTokenMap();
  delete map[token];
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(map));
}

export {
  markRoomAsJoined,
  getTokenMap,
  getRoomCodeForToken,
  hasJoinedRoom,
  leaveRoom,
};
