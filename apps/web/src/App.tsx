import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { LiveOGTimeProvider } from '@liveog/react'
import { Editor } from './components/Editor'
import { ExportBar, type ExportKind } from './components/ExportBar'
import { HowTo } from './components/HowTo'
import { Preview } from './components/Preview'
import { captureCard, downloadBlob, type FrameSource } from './lib/capture'
import { slug } from './lib/files'
import { encodeGif } from './lib/gif'
import { usePlayback } from './lib/usePlayback'
import { detectVideoSupport, encodeVideo, type VideoKind } from './lib/video'
import { templates, type CardData, type Template } from './templates'

export default function App() {
  const [template, setTemplate] = useState<Template>(templates[0]!)
  const [data, setData] = useState<CardData>(template.defaults)
  const [duration, setDuration] = useState(4000)
  const { time, setTime, playing, scrub, toggle, pause } = usePlayback(duration)
  const [video, setVideo] = useState<VideoKind | null | 'detecting'>('detecting')
  const [busy, setBusy] = useState<ExportKind | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  // During export the timeline is driven frame by frame instead of by playback.
  const [exportTime, setExportTime] = useState<number | null>(null)

  useEffect(() => { detectVideoSupport().then(setVideo) }, [])

  const chooseTemplate = (next: Template) => {
    setTemplate(next)
    // Keep uploads and accent across templates, reset the copy to the template's defaults.
    setData(prev => ({ ...next.defaults, accent: prev.accent, logo: prev.logo, background: prev.background }))
  }

  const frameSource: FrameSource = useCallback(async t => {
    const node = cardRef.current
    if (!node) throw new Error('Card is not mounted')
    flushSync(() => setExportTime(t))
    await new Promise(r => requestAnimationFrame(() => r(null)))
    return captureCard(node)
  }, [])

  const exportAs = async (kind: ExportKind) => {
    setError(null)
    setBusy(kind)
    pause()
    const name = slug(data.title || data.eyebrow)
    try {
      if (kind === 'png') {
        setProgress({ done: 0, total: 1 })
        const canvas = await frameSource(duration)
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
        if (!blob) throw new Error('PNG encoding failed')
        downloadBlob(blob, `${name}-og.png`)
      } else if (kind === 'gif') {
        const blob = await encodeGif(frameSource, duration, (done, total) => setProgress({ done, total }))
        downloadBlob(blob, `${name}-og.gif`)
      } else if (video === 'mp4' || video === 'webm') {
        const blob = await encodeVideo(video, frameSource, duration, (done, total) => setProgress({ done, total }))
        downloadBlob(blob, `${name}-og.${video}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setExportTime(null)
      setTime(duration)
      setBusy(null)
      setProgress(null)
    }
  }

  const shownTime = exportTime ?? Math.min(time, duration)
  const Card = template.Component

  return (
    <>
      <header className="top">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <span>LiveOG</span>
        </div>
        <p>Animated Open Graph cards, rendered in your browser. Nothing leaves your machine.</p>
        <a className="button small ghost" href="https://github.com/Julezbeyer/liveog" target="_blank" rel="noreferrer">GitHub</a>
      </header>

      <main className="workspace">
        <Editor
          templates={templates}
          template={template}
          data={data}
          duration={duration}
          onTemplate={chooseTemplate}
          onChange={patch => setData(prev => ({ ...prev, ...patch }))}
          onDuration={ms => { setDuration(ms); setTime(0) }}
        />
        <section className="canvas">
          <Preview ref={cardRef} time={shownTime} duration={duration} playing={playing && !busy} onScrub={scrub} onToggle={toggle} busy={!!busy}>
            <LiveOGTimeProvider value={shownTime}>
              <Card data={data} time={shownTime} duration={duration} />
            </LiveOGTimeProvider>
          </Preview>
          <ExportBar video={video} busy={busy} progress={progress} error={error} onExport={exportAs} />
        </section>
      </main>

      <HowTo />

      <footer className="foot">
        <span>MIT licensed. Built with <a href="https://www.npmjs.com/package/@liveog/react" target="_blank" rel="noreferrer">@liveog/react</a>.</span>
      </footer>
    </>
  )
}
