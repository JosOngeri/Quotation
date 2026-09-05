import { io, Socket } from 'socket.io-client'

type EventHandler = (data: any) => void

class SocketClient {
  private socket: Socket | null = null
  private handlers: Map<string, Set<EventHandler>> = new Map()

  connect(token: string) {
    if (this.socket?.connected) return

    this.socket = io('/', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    this.socket.on('connect', () => {
      console.log('Socket connected')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    this.socket.on('quote:update', (data) => this.emit('quote:update', data))
    this.socket.on('project:update', (data) => this.emit('project:update', data))
    this.socket.on('client:created', (data) => this.emit('client:created', data))
    this.socket.on('supplier:created', (data) => this.emit('supplier:created', data))
  }

  private emit(event: string, data: any) {
    const listeners = this.handlers.get(event)
    if (listeners) {
      listeners.forEach((handler) => handler(data))
    }
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }

  off(event: string, handler: EventHandler) {
    const listeners = this.handlers.get(event)
    if (listeners) {
      listeners.delete(handler)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.handlers.clear()
  }
}

const socketClient = new SocketClient()
export default socketClient
