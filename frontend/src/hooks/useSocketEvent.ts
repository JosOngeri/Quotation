import { useEffect } from 'react'
import socketClient from '../services/socketClient'
import { useAuth } from '../contexts/AuthContext'

export function useSocketEvent(event: string, callback: (data: any) => void) {
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return

    socketClient.connect(token)
    socketClient.on(event, callback)

    return () => {
      socketClient.off(event, callback)
    }
  }, [event, token, callback])
}
