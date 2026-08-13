# Live Tracking Audit Report

## 1. Coverage Proof
I searched the codebase for keywords related to location tracking (`location`, `gps`, `coordinates`, `watchPosition`, `setInterval`, `ping`, `ws://`, `WebSocket`, `live-track`, etc.) across all 3 surfaces (mobile, server, web).

Files explicitly opened and reviewed:
- `recoverpro/mobile/src/hooks/useShiftTracking.ts`
- `recoverpro/server/src/main/java/com/recoverpro/server/service/AgentFieldService.java`
- `recoverpro/server/src/main/java/com/recoverpro/server/service/impl/AgentFieldServiceImpl.java`
- `recoverpro/server/src/main/java/com/recoverpro/server/websocket/LiveTrackWebSocketHandler.java`
- `recoverpro/server/src/main/java/com/recoverpro/server/config/WebSocketConfig.java`
- `recoverpro/server/src/main/resources/db/migration/V001__baseline.sql`
- `recoverpro/web/src/pages/FieldOpsPage.tsx`
- `recoverpro/web/src/styles/FieldOpsMap.css`
- `recoverpro/web/src/hooks/useLiveTrackSocket.ts`
- `recoverpro/web/src/pages/FieldOpsMapPanel.tsx`

## 2. Verdict Per Sub-Requirement

### 1. CAPTURE: PARTIAL
- **Evidence:** `recoverpro/mobile/src/hooks/useShiftTracking.ts`, lines 13 and 65 (`const PING_INTERVAL_MS = 15_000;` and `intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);`), and lines 68-73 (`if (AppState.currentState === 'active') startInterval();`).
- **Explanation:** The app does capture and send GPS coordinates on a 15-second interval, which is frequent enough for movement. However, it *only* tracks when the app is in the foreground (`AppState.currentState === 'active'`). There is no background tracking, so a field officer who puts their phone in their pocket while driving will not be tracked.

### 2. INGEST/STORE: IMPLEMENTED
- **Evidence:** `recoverpro/server/src/main/java/com/recoverpro/server/service/impl/AgentFieldServiceImpl.java`, line 163 (`pingRepository.save(ping);`) and `recoverpro/server/src/main/resources/db/migration/V001__baseline.sql`, lines 597-607 (`CREATE TABLE IF NOT EXISTS agent_location_pings`).
- **Explanation:** The backend retains a full history of location pings. The `agent_location_pings` table creates a new row per ping (using an auto-generated UUID primary key), rather than overwriting a single "current location" field on the agent entity.

### 3. PUSH: IMPLEMENTED
- **Evidence:** `recoverpro/server/src/main/java/com/recoverpro/server/websocket/LiveTrackWebSocketHandler.java`, line 151-158 (`relayAgentLocation` broadcasts to subscribers), and `recoverpro/web/src/hooks/useLiveTrackSocket.ts`, lines 71-82 (opens a WebSocket to `ws/live-track`) and 88-106 (receives `agent-update` to update map markers).
- **Explanation:** The backend actively pushes new pings to the web app via WebSockets in near-real-time. The web app successfully connects to this WebSocket and processes the updates, bypassing the need to solely rely on the REST polling fallback.

### 4. CLICK-TO-FOCUS: PARTIAL
- **Evidence:** `recoverpro/web/src/pages/FieldOpsPage.tsx`, line 265 (`onClick={() => setSelected(a)}`) and `recoverpro/web/src/pages/FieldOpsMapPanel.tsx`, line 87 (`eventHandlers={{ click: () => onSelect(agent) }}`).
- **Explanation:** Clicking a map marker or list row successfully populates a detail panel in the sidebar with the officer's specific stats (battery, speed, heading). However, the map itself does not pan or zoom to focus on the selected officer; the `mapCenter` remains statically bound to the first agent in the list (`FieldOpsPage.tsx`, line 184).

### 5. MOVEMENT RENDERING: IMPLEMENTED
- **Evidence:** `recoverpro/web/src/pages/FieldOpsMapPanel.tsx`, lines 55-64 (maintains `trailsRef` of up to 20 past positions) and line 84 (`<Polyline positions={trail} ... />`).
- **Explanation:** The web app draws a `Polyline` trail representing the last 20 GPS positions. While the marker pin itself doesn't smoothly animate via CSS between coordinates, the visible trail provides clear visual continuity of the officer's recent movement path.

## 3. End-to-End Verdict
The live tracking chain **works with major caveats**. The data flows completely end-to-end (Mobile → REST POST → Backend DB → WS Fanout → Web Map Update → Trail Rendered). However, the "ride-hailing app" experience is broken primarily by the mobile app's lack of background tracking. The web map will only show movement if the field officer actively keeps the RecoverPro app open and on-screen while moving. Additionally, supervisors cannot visually pan the map to a specific officer just by clicking them in the list.

## 4. Other Relevant Findings
- **REST Polling Fallback:** The web app explicitly retains a polling mechanism (`useLiveTrackSocket.ts`, lines 34-69, calling `fieldOpsApi.listActive(orgId)`) alongside the WebSocket, ensuring that if the WebSocket drops, the map still updates every 15 seconds (`REFRESH_MS`).
- **Mock Location Detection:** Both mobile capture (`mocked` flag) and backend/web rendering explicitly handle and display warnings if a field officer is using a mock GPS provider.
