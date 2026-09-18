import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react'
import { HEIGHT, WIDTH } from '../templates'

interface Props {
  children: ReactNode
  time: number
  duration: number
  playing: boolean
  onScrub: (t: number) => void
  onToggle: () => void
  busy: boolean
}

/** Renders the 1200×630 card at native size and scales it to fit; the inner node is what gets captured. */
export const Preview = forwardRef<HTMLDivElement, Props>(function Preview({ children, time, duration, playing, onScrub, onToggle, busy }, ref) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const update = () => setScale(Math.min(1, el.clientWidth / WIDTH))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="preview">
      <div className="frame" ref={frameRef} style={{ height: HEIGHT * scale }}>
        <div className="stage" style={{ transform: `scale(${scale})` }}>
          <div ref={ref} className="card-root" style={{ width: WIDTH, height: HEIGHT }}>
            {children}
          </div>
        </div>
      </div>
      <div className="transport">
        <button type="button" className="button small" onClick={onToggle} disabled={busy} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={duration}
          step={10}
          value={Math.round(time)}
          onChange={e => onScrub(Number(e.target.value))}
          disabled={busy}
          aria-label="Timeline"
        />
        <code className="time">{(time / 1000).toFixed(2)}s</code>
      </div>
    </div>
  )
})
