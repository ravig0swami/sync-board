/**
 * Session management for room access control.
 *
 * Stores the list of room codes the user has *explicitly* joined through the
 * landing page (i.e. they knew the code and submitted it). This acts as an
 * access gate: direct URL navigation to /board/[code] will NOT grant access
 * because sessionStorage is per-tab and is only populated by the landing
 * page flow.
 *
 * We use sessionStorage (not localStorage) so that:
 *  - Same-tab refreshes & SPA navigations: access persists ✓
 *  - New tabs/windows with the URL: access denied ✗ (redirected to landing)
 */

const SESSION_KEY = "whiteboard_joined_rooms";

/**
 * Record that the user has joined a room through the proper flow.
 * Called from the landing page after the server confirms a successful
 * create-room or join-room.
 *
 * @param {string} roomCode
 */
function markRoomAsJoined(roomCode) {
  if (!roomCode) return;
  const joined = getJoinedRooms();
  if (!joined.includes(roomCode)) {
    joined.push(roomCode);
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(joined));
}

/**
 * Get the list of room codes the user has joined in this tab session.
 *
 * @returns {string[]}
 */
function getJoinedRooms() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Check whether the user has explicitly joined this room in the current
 * tab session.
 *
 * @param {string} roomCode
 * @returns {boolean}
 */
function hasJoinedRoom(roomCode) {
  return getJoinedRooms().includes(roomCode);
}

/**
 * Remove a room from the joined list.
 * Called when the user explicitly leaves a room.
 *
 * @param {string} roomCode
 */
function leaveRoom(roomCode) {
  const joined = getJoinedRooms().filter((code) => code !== roomCode);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(joined));
}

export {
  markRoomAsJoined,
  getJoinedRooms,
  hasJoinedRoom,
  leaveRoom,
};
