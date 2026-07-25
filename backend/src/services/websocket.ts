import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env-validation';
import logger from '../config/logging';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  workspaceId?: string;
  roles?: string[];
}

export class WebSocketService {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private workspaceSockets: Map<string, Set<string>> = new Map(); // workspaceId -> socketIds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, env.JWT_SECRET as string) as any;
        
        (socket as AuthenticatedSocket).userId = decoded.userId;
        (socket as AuthenticatedSocket).workspaceId = decoded.workspaceId;
        (socket as AuthenticatedSocket).roles = decoded.roles;

        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.userId;
      const workspaceId = socket.workspaceId;
      const socketId = socket.id;

      logger.info({ userId, workspaceId, socketId }, 'WebSocket connection established');

      // Track user connections
      if (userId) {
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socketId);
      }

      // Track workspace connections
      if (workspaceId) {
        if (!this.workspaceSockets.has(workspaceId)) {
          this.workspaceSockets.set(workspaceId, new Set());
        }
        this.workspaceSockets.get(workspaceId)!.add(socketId);
      }

      // Join user's personal room
      if (userId) {
        socket.join(`user:${userId}`);
      }

      // Join workspace room
      if (workspaceId) {
        socket.join(`workspace:${workspaceId}`);
      }

      // Handle user joining specific rooms
      socket.on('join-room', (room: string) => {
        socket.join(room);
        logger.info({ userId, room }, 'User joined room');
      });

      // Handle user leaving specific rooms
      socket.on('leave-room', (room: string) => {
        socket.leave(room);
        logger.info({ userId, room }, 'User left room');
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info({ userId, workspaceId, socketId }, 'WebSocket connection closed');

        // Remove from user tracking
        if (userId) {
          const userSocketIds = this.userSockets.get(userId);
          if (userSocketIds) {
            userSocketIds.delete(socketId);
            if (userSocketIds.size === 0) {
              this.userSockets.delete(userId);
            }
          }
        }

        // Remove from workspace tracking
        if (workspaceId) {
          const workspaceSocketIds = this.workspaceSockets.get(workspaceId);
          if (workspaceSocketIds) {
            workspaceSocketIds.delete(socketId);
            if (workspaceSocketIds.size === 0) {
              this.workspaceSockets.delete(workspaceId);
            }
          }
        }
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'WebSocket connection established',
        userId,
        workspaceId
      });
    });
  }

  // Notification methods
  notifyUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
    logger.info({ userId, event }, 'Notification sent to user');
  }

  notifyWorkspace(workspaceId: string, event: string, data: any): void {
    this.io.to(`workspace:${workspaceId}`).emit(event, data);
    logger.info({ workspaceId, event }, 'Notification sent to workspace');
  }

  notifyRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
    logger.info({ room, event }, 'Notification sent to room');
  }

  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
    logger.info({ event }, 'Broadcast notification sent');
  }

  // Specific notification methods
  notifyQuoteUpdate(quoteId: string, workspaceId: string, update: any): void {
    this.notifyWorkspace(workspaceId, 'quote:update', {
      quoteId,
      ...update
    });
  }

  notifyProjectUpdate(projectId: string, workspaceId: string, update: any): void {
    this.notifyWorkspace(workspaceId, 'project:update', {
      projectId,
      ...update
    });
  }

  notifyNewMessage(userId: string, message: any): void {
    this.notifyUser(userId, 'message:new', message);
  }

  notifyUserStatus(userId: string, status: 'online' | 'offline'): void {
    this.broadcast('user:status', { userId, status });
  }

  // Presence methods
  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getWorkspaceUsers(workspaceId: string): string[] {
    // This would need to be implemented by tracking which users belong to which workspace
    // For now, return all online users (this should be refined)
    return this.getOnlineUsers();
  }

  // Typing indicators
  setTyping(userId: string, workspaceId: string, entityType: string, entityId: string): void {
    this.notifyWorkspace(workspaceId, 'typing:start', {
      userId,
      entityType,
      entityId
    });
  }

  clearTyping(userId: string, workspaceId: string, entityType: string, entityId: string): void {
    this.notifyWorkspace(workspaceId, 'typing:stop', {
      userId,
      entityType,
      entityId
    });
  }

  getIO(): SocketIOServer {
    return this.io;
  }
}