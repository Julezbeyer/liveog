import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { LiveOGTimeProvider } from '@liveog/react'
import { Editor } from './components/Editor'
import { ExportBar, type ExportKind, type ExportResult } from './components/ExportBar'
import { HowTo } from './components/HowTo'
import { Icon } from './components/Icons'
import { Preview } from './components/Preview'
import { captureCard, downloadBlob, type FrameSource } from './lib/capture'
import { encodeGif } from './lib/gif'
import { prepareFrame, slug } from './lib/media'
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
  const [results, setResults] = useState<ExportResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  // During export the timeline is driven frame by frame instead of by playback.
  const [exportTime, setExportTime] = useState<number | null>(null)

  useEffect(() => { detectVideoSupport().then(setVideo) }, [])

  const chooseTemplate = (next: Template) => {
    setTemplate(next)
    // Keep uploads and accent across templates, reset the copy to the template's defaults.
    setData(prev => ({ ...next.defaults, accent: prev.accent, logo: prev.logo, background: prev.background }))
    setResults([])
  }

  const update = (patch: Partial<CardData>) => {
    setData(prev => ({ ...prev, ...patch }))
    setResults([])
  }

  const frameSource: FrameSource = useCallback(async t => {
    const node = cardRef.current
    if (!node) throw new Error('Card is not mounted')
    flushSync(() => setExportTime(t))
    await prepareFrame(t)
    await new Promise(r => requestAnimationFrame(() => r(null)))
    return captureCard(node)
  }, [])

  const exportAs = async (kind: ExportKind) => {
    setError(null)
    setBusy(kind)
    pause()
    const name = slug(data.title || data.eyebrow)
    try {
      let blob: Blob
      let filename: string
      if (kind === 'png') {
        setProgress({ done: 0, total: 1 })
        const canvas = await frameSource(duration)
        const png = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
        if (!png) throw new Error('PNG encoding failed')
        blob = png
        filename = `${name}-og.png`
      } else if (kind === 'gif') {
        blob = await encodeGif(frameSource, duration, (done, total) => setProgress({ done, total }))
        filename = `${name}-og.gif`
      } else {
        if (video !== 'mp4' && video !== 'webm') throw new Error('Video export is not available in this browser')
        blob = await encodeVideo(video, frameSource, duration, (done, total) => setProgress({ done, total }))
        filename = `${name}-og.${video}`
      }
      downloadBlob(blob, filename)
      setResults(prev => [...prev.filter(r => r.kind !== kind), { kind, filename, bytes: blob.size }])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setExportTime(null)
      setTime(duration)
      setBusy(null)
      setProgress(null)
    }
  }

  const exporting = exportTime !== null
  const shownTime = exportTime ?? Math.min(time, duration)
  const Card = template.Component

  return (
    <>
      <header className="top">
        <a className="brand" href="./">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={26} height={26} />
          LiveOG
        </a>
        <nav>
          <a href="https://www.npmjs.com/package/@liveog/react" target="_blank" rel="noreferrer">npm</a>
          <a className="button small ghost" href="https://github.com/Julezbeyer/liveog" target="_blank" rel="noreferrer"><Icon.github /> GitHub</a>
        </nav>
      </header>

      <section className="hero">
        <span className="pill"><Icon.sparkle /> Runs 100% in your browser. Nothing is uploaded.</span>
        <h1>Animated Open Graph cards, <em>no server required.</em></h1>
        <p>Pick a template, drop in your logo, a photo or a video, and download the PNG fallback plus MP4 and GIF versions in seconds.</p>
      </section>

      <main className="studio">
        <section className="stage-col">
          <Preview ref={cardRef} time={shownTime} duration={duration} playing={playing && !busy} onScrub={scrub} onToggle={toggle} busy={!!busy}>
            <LiveOGTimeProvider value={shownTime}>
              <Card data={data} time={shownTime} duration={duration} exporting={exporting} playing={playing && !busy} />
            </LiveOGTimeProvider>
          </Preview>
          <ExportBar video={video} busy={busy} progress={progress} error={error} results={results} onExport={exportAs} />
        </section>
        <Editor
          templates={templates}
          template={template}
          data={data}
          duration={duration}
          onTemplate={chooseTemplate}
          onChange={update}
          onDuration={ms => { setDuration(ms); setTime(0); setResults([]) }}
        />
      </main>

      <HowTo />

      <footer className="foot">
        <span>MIT licensed. Built with <a href="https://www.npmjs.com/package/@liveog/react" target="_blank" rel="noreferrer">@liveog/react</a>, the same components you would use in your own app.</span>
      </footer>
    </>
  )
}
