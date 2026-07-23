# Fix 404 Error - Implementation Plan

## Steps:

### 1. Update `server/index.js` - Add static file serving and error handling

- [x] Add path module and serve Next.js static build
- [x] Add request logging middleware
- [x] Add catch-all route to serve index.html for SPA routing
- [x] Add 404 handler for API routes
- [x] Add error handling middleware
- [x] Log all incoming requests

### 2. Update `client/next.config.js` - Configure for production build

- [x] Add standalone output configuration for production
- [x] Configure security headers

### 3. Update `client/src/lib/socket.js` - Better connection handling

- [x] Add connection timeout
- [x] Add reconnection attempts configuration
- [x] Add error event handling
- [x] Add disconnectSocket helper

### 4. Update `client/src/app/board/[roomCode]/page.js` - Fix routing for production

- [x] Add better error handling for room join failures
- [x] Add connection state management improvements
- [x] Add mount safety checks
- [x] Add join timeout handling

### 5. Update `server/package.json` - Add combined deployment scripts

- [x] Add build:client script
- [x] Add production start script
- [x] Add install all deps script

### 6. Update `client/src/app/page.js` - Better error handling

- [x] Add socket connection error display
- [x] Add retry mechanism for failed connections

### 7. Final verification

- [x] Remove duplicate `/` and `/api/health` routes in server
- [x] Verify all file edits are consistent
