import { useEffect, useState } from 'react';

const storageKey = 'musafir-presence-session';
const heartbeatMs = 25_000;

function createSessionId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `presence-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function getSessionId() {
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const next = createSessionId();
    sessionStorage.setItem(storageKey, next);
    return next;
  } catch {
    return createSessionId();
  }
}

function presenceUrl() {
  const explicitUrl = import.meta.env.VITE_PRESENCE_WS_URL as string | undefined;
  if (explicitUrl) return explicitUrl;
  // In dev, proxy through Vite to local presence server
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/presence`;
}

/** An anonymous presence connection. A null count means the service is unavailable. */
export function useOnlinePresence() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    const id = getSessionId();
    let socket: WebSocket | null = null;
    let heartbeat: number | null = null;
    let reconnect: number | null = null;
    let attempts = 0;
    let disposed = false;

    const clearTimers = () => {
      if (heartbeat !== null) window.clearInterval(heartbeat);
      if (reconnect !== null) window.clearTimeout(reconnect);
      heartbeat = null;
      reconnect = null;
    };

    const send = (type: 'join' | 'heartbeat' | 'leave') => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, sessionId: id }));
      }
    };

    const scheduleReconnect = () => {
      if (disposed || reconnect !== null) return;
      // Exponential backoff: 1s, 2s, 4s, 8s … max 30s
      const delay = Math.min(30_000, 1_000 * 2 ** attempts++);
      reconnect = window.setTimeout(() => {
        reconnect = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed) return;
      try {
        socket = new WebSocket(presenceUrl());
      } catch {
        scheduleReconnect();
        return;
      }

      socket.addEventListener('open', () => {
        attempts = 0;
        send('join');
        heartbeat = window.setInterval(() => send('heartbeat'), heartbeatMs);
      });

      socket.addEventListener('message', event => {
        try {
          const message = JSON.parse(event.data as string) as {
            type?: string;
            count?: unknown;
          };
          if (message.type === 'count' && typeof message.count === 'number') {
            setOnlineCount(message.count);
          }
        } catch {
          /* Ignore malformed messages. */
        }
      });

      socket.addEventListener('close', () => {
        setOnlineCount(null);
        clearTimers();
        scheduleReconnect();
      });

      socket.addEventListener('error', () => {
        socket?.close();
      });
    };

    const leave = () => send('leave');

    connect();
    window.addEventListener('pagehide', leave);

    return () => {
      disposed = true;
      window.removeEventListener('pagehide', leave);
      leave();
      clearTimers();
      socket?.close();
    };
  }, []);

  return onlineCount;
}
