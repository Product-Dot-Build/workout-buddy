'use client'

import { useState, useEffect } from 'react'

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !('MSStream' in window))
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
  }, [])

  if (isStandalone) return null
  if (!isIOS) return null

  return (
    <div
      role="banner"
      aria-label="Install application"
      className="fixed bottom-20 left-4 right-4 z-50 rounded-lg border border-zinc-700 bg-zinc-900/95 px-4 py-3 text-center text-sm text-zinc-200 backdrop-blur sm:left-auto sm:right-4 sm:max-w-sm"
    >
      <p>
        To install this app, tap Share and then &quot;Add to Home Screen&quot;.
      </p>
    </div>
  )
}
