import { useEffect, useRef, useCallback } from 'react'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

/**
 * WebSocket hook with exponential backoff reconnection.
 * Compliant with PRD: auto-reconnect 1s→2s→4s, max 30s.
 */
export function useWebSocket(parcelId, onMessage) {
  const wsRef = useRef(null)
  const retryRef = useRef(null)
  const retriesRef = useRef(0)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!parcelId || !mountedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const url = `${WS_BASE}/ws/tracking/${parcelId}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessage(data)
      } catch {}
    }

    ws.onopen = () => {
      retriesRef.current = 0
      // Keep alive ping every 25s
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, 25000)
      ws._pingInterval = ping
    }

    ws.onclose = () => {
      clearInterval(ws._pingInterval)
      if (!mountedRef.current) return
      // Exponential backoff
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000)
      retriesRef.current += 1
      retryRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [parcelId, onMessage])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])
}
