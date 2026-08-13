import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

const port = Number(process.env.PRESENCE_PORT || 8787);
const heartbeatTimeoutMs = 65_000;
const sessions = new Map();
const sockets = new Set();

function broadcastCount() {
  const payload = JSON.stringify({ type: 'count', count: sessions.size });
  for (const client of sockets) if (client.readyState === WebSocket.OPEN) client.send(payload);
}

const server = createServer((_request, response) => {
  response.writeHead(404, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ error: 'Presence service only accepts WebSocket connections.' }));
});
const wss = new WebSocketServer({ server, path: '/presence' });

function removeConnection(socket, announce = true) {
  sockets.delete(socket);
  if (!socket.sessionId) return;
  const session = sessions.get(socket.sessionId);
  if (!session) return;
  session.sockets.delete(socket);
  if (session.sockets.size === 0) {
    sessions.delete(socket.sessionId);
    if (announce) broadcastCount();
  }
}

wss.on('connection', socket => {
  sockets.add(socket);
  socket.on('message', raw => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if (!['join', 'heartbeat', 'leave'].includes(message.type) || typeof message.sessionId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(message.sessionId)) return;
    if (message.type === 'leave') return removeConnection(socket);
    if (socket.sessionId && socket.sessionId !== message.sessionId) removeConnection(socket, false);
    socket.sessionId = message.sessionId;
    const wasOnline = sessions.has(message.sessionId);
    const session = sessions.get(message.sessionId) || { sockets: new Set(), lastSeen: Date.now() };
    session.sockets.add(socket);
    session.lastSeen = Date.now();
    sessions.set(message.sessionId, session);
    if (!wasOnline) broadcastCount();
    else socket.send(JSON.stringify({ type: 'count', count: sessions.size }));
  });
  socket.on('close', () => removeConnection(socket));
  socket.on('error', () => removeConnection(socket));
});

setInterval(() => {
  let changed = false;
  for (const [sessionId, session] of sessions) {
    if (session.lastSeen < Date.now() - heartbeatTimeoutMs) {
      sessions.delete(sessionId);
      for (const socket of session.sockets) socket.close();
      changed = true;
    }
  }
  if (changed) broadcastCount();
}, 10_000).unref();

server.listen(port, () => console.log(`Presence service listening on ws://localhost:${port}/presence`));
