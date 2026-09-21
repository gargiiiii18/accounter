'use client'

import { useEffect, useRef, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const checkOnline = async () => {
      try {
        const res = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' })
        setIsOffline(!res.ok)
      } catch {
        setIsOffline(true)
      }
    }

    checkOnline()
    intervalRef.current = setInterval(checkOnline, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[100] bg-[#1a2332] text-white px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium">
      <WifiOff className="h-4 w-4" />
      You&apos;re not connected to the internet
    </div>
  )
}
