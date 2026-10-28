/**
 * Real-time WebSocket Client for Live Telemetry Streaming.
 * Handles automatic reconnects, ping/pong heartbeats, and listener dispatching.
 */

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimeout: number | null = null;
  private heartbeatInterval: number | null = null;
  public isConnected: boolean = false;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    this.url = `${protocol}//${host}:8000/ws/telemetry`;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log('[WS] Connected to live telemetry stream');
        this.emit('connection_change', { connected: true });
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type) {
            this.emit(payload.type, payload.data || payload);
          }
        } catch (e) {
          console.error('[WS] Error parsing message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        console.warn('[WS] Connection closed. Attempting reconnect in 3s...');
        this.emit('connection_change', { connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Socket error:', err);
        this.ws?.close();
      };
    } catch (err) {
      console.error('[WS] Connection attempt failed:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 3000);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public on(eventType: string, handler: MessageHandler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  private emit(eventType: string, data: any) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const wsClient = new WebSocketClient();
