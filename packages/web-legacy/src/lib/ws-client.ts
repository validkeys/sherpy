/**
 * WebSocket Client with reconnection and typed event dispatch
 */

export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

export type WsEventType =
  | "project:updated"
  | "project:pipelineStatusChanged"
  | "task:statusChanged"
  | "assignment:created"
  | "assignment:updated"
  | "conflict:detected"
  | "document:generated"
  | "chat:message"
  | "schedule:generated";

export interface WsEvent {
  type: WsEventType;
  payload: unknown;
  timestamp: string;
}

type EventHandler = (payload: unknown) => void;

/**
 * WebSocket client with exponential backoff reconnection
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;
  private maxReconnectDelay = 30000; // 30 seconds
  private listeners = new Map<string, Set<EventHandler>>();

  constructor(
    private url: string,
    private getToken: () => Promise<string | null>,
  ) {}

  /**
   * Connect to WebSocket server with JWT authentication
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    this.connectionState = "connecting";
    this.notifyStateChange();

    try {
      const token = await this.getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }

      // IMPORTANT: Token MUST be in URL query param - server authenticates on connection, not via messages
      // Sending token as a message after connect will fail because server validates immediately
      const wsUrlWithToken = `${this.url}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrlWithToken);

      this.ws.onopen = () => {
        // Connection already authenticated via URL param - no auth message needed
        this.connectionState = "connected";
        this.reconnectAttempts = 0;
        this.notifyStateChange();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsEvent;
          this.dispatch(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.ws.onclose = () => {
        this.connectionState = "disconnected";
        this.notifyStateChange();
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      this.connectionState = "disconnected";
      this.notifyStateChange();
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff and jitter
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout !== null) {
      return; // Already scheduled
    }

    this.connectionState = "reconnecting";
    this.notifyStateChange();

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);

    // Add jitter: ±25% of base delay
    const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
    const delay = Math.floor(baseDelay + jitter);

    this.reconnectAttempts++;

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  /**
   * Dispatch event to registered handlers
   */
  private dispatch(event: WsEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event.payload));
    }
  }

  /**
   * Notify connection state change listeners
   */
  private notifyStateChange(): void {
    const handlers = this.listeners.get("_connectionStateChanged");
    if (handlers) {
      handlers.forEach((handler) => handler(this.connectionState));
    }
  }

  /**
   * Subscribe to event type
   * @returns Unsubscribe function
   */
  on(eventType: WsEventType | "_connectionStateChanged", handler: EventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  /**
   * Unsubscribe from event type
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Destroy connection and clean up
   */
  destroy(): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.listeners.clear();
    this.connectionState = "disconnected";
  }
}
