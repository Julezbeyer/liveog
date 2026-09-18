import { useCallback, useEffect, useRef, useState } from 'react'

/** Scrubber state plus a looping play/pause driven by requestAnimationFrame. */
export function usePlayback(duration: number) {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(true)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now - time
      const elapsed = (now - startRef.current) % (duration + 600) // short hold on the last frame
      setTime(Math.min(duration, elapsed))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); startRef.current = null }
    // `time` is intentionally not a dependency: it is read once when playback starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration])

  const scrub = useCallback((t: number) => { setPlaying(false); setTime(t) }, [])
  const toggle = useCallback(() => setPlaying(p => !p), [])

  return { time, setTime, playing, scrub, toggle, pause: () => setPlaying(false) }
}
