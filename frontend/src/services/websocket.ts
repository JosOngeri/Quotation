import { io, Socket } from 'socket.io-client';

type EventHandler = (data: any) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();

  connect(token: string): void {
    this.token = token;

    if (this.socket?.connected) {
      return;
    }

    this.socket = io(process.env.VITE_API_URL || 'http://localhost:5000', {
      auth: {
        token: this.token
      },
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('connected', (data) => {
      console.log('WebSocket connection confirmed:', data);
    });

    // Quote updates
    this.socket.on('quote:update', (data) => {
      console.log('Quote update received:', data);
      this.notifyHandlers('quote-update', data);
    });

    // Project updates
    this.socket.on('project:update', (data) => {
      console.log('Project update received:', data);
      this.notifyHandlers('project-update', data);
    });

    // New messages
    this.socket.on('message:new', (data) => {
      console.log('New message received:', data);
      this.notifyHandlers('new-message', data);
    });

    // User status updates
    this.socket.on('user:status', (data) => {
      console.log('User status update:', data);
      this.notifyHandlers('user-status', data);
    });

    // Typing indicators
    this.socket.on('typing:start', (data) => {
      console.log('Typing started:', data);
      this.notifyHandlers('typing-start', data);
    });

    this.socket.on('typing:stop', (data) => {
      console.log('Typing stopped:', data);
      this.notifyHandlers('typing-stop', data);
    });
  }

  private notifyHandlers(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }

  joinRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-room', room);
    }
  }

  leaveRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', room);
    }
  }

  // Typing indicators
  startTyping(entityType: string, entityId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing:start', { entityType, entityId });
    }
  }

  stopTyping(entityType: string, entityId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing:stop', { entityType, entityId });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
const webSocketClient = new WebSocketClient();

export default webSocketClient;