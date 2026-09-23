import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Editor } from './components/Editor'
import { ExportBar, type ExportKind, type ExportResult } from './components/ExportBar'
import { HowTo } from './components/HowTo'
import { Icon } from './components/Icons'
import { Preview } from './components/Preview'
import { captureCard, downloadBlob, type FrameSource } from './lib/capture'
import { encodeGif } from './lib/gif'
import { prepareFrame, slug } from './lib/media'
import type { ImportResult } from './lib/site-import'
import { usePlayback } from './lib/usePlayback'
import { detectVideoSupport, encodeVideo, type VideoKind } from './lib/video'
import { useDraft } from './lib/useDraft'
import { MotionCard } from './components/MotionCard'
import { templates, type CardData, type Media, type Template } from './templates'

export default function App() {
  const { draft, setDraft, ready, status } = useDraft()
  const template = templates.find(t => t.id === draft.templateId) ?? templates[0]!
  const data = draft.cards[template.id] ?? template.defaults
  const { duration, animation } = draft
  const [uploading, setUploading] = useState(false)
  const [contentValid, setContentValid] = useState(true)
  const { time, setTime, playing, scrub, toggle, pause, replay } = usePlayback(duration)
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
    setDraft(prev => ({ ...prev, templateId: next.id, cards: {
      ...prev.cards,
      [next.id]: prev.cards[next.id] ?? { ...next.defaults, accent: data.accent, logo: data.logo, background: data.background },
    } }))
    if (next.id !== template.id) setContentValid(true)
    setResults([])
    scrub(duration)
  }

  const update = (patch: Partial<CardData>) => {
    setDraft(prev => ({ ...prev, cards: { ...prev.cards, [template.id]: { ...(prev.cards[template.id] ?? template.defaults), ...patch } } }))
    setResults([])
    scrub(duration)
  }

  const applyImport = (result: ImportResult) => update(result.patch)
  const applySocialImage = (image: Media) => update({ background: image })

  const frameSource: FrameSource = useCallback(async t => {
    const node = cardRef.current
    if (!node) throw new Error('Card is not mounted')
    flushSync(() => setExportTime(t))
    await prepareFrame(animation === 'still' ? duration : t)
    await new Promise(r => requestAnimationFrame(() => r(null)))
    return captureCard(node)
  }, [animation, duration])

  const exportAs = async (kind: ExportKind) => {
    if (busy || uploading || !ready || !contentValid) return
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

      <section className="hero studio-hero">
        <span className="pill"><Icon.sparkle /> Your card. Your style. No code.</span>
        <h1>Make your next link <em>stand out.</em></h1>
        <p>Choose a look, make it yours, and download a card that moves.</p>
      </section>

      <div className="studio-toolbar">
        <span><strong>Your studio</strong><span className="draft-status" role="status">{status}</span></span>
        <a href="#download" className="button small">Download card ↓</a>
      </div>
      <main className="studio visual-studio" aria-busy={!ready}>
        <Editor
          templates={templates} template={template} data={data} duration={duration}
          animation={animation} disabled={!!busy || uploading || !ready} onUploading={setUploading}
          onTemplate={chooseTemplate} onChange={update}
          onAnimation={next => { setDraft(prev => ({ ...prev, animation: next })); setResults([]); replay() }}
          onDuration={ms => { setDraft(prev => ({ ...prev, duration: ms })); replay(); setResults([]) }}
          onImport={applyImport} onUseSocialImage={applySocialImage}
          onValidity={setContentValid}
        />
        <section className="stage-col">
          <div className="preview-heading"><span><span className="live-dot" /> Live preview</span><span>{template.name} · {duration / 1000}s</span></div>
          <Preview ref={cardRef} time={shownTime} duration={duration} playing={playing && !busy} onScrub={scrub} onToggle={toggle} onReplay={replay} busy={!!busy || !ready}>
            <MotionCard template={template} data={data} time={shownTime} duration={duration} animation={animation} exporting={exporting} playing={playing && !busy} />
          </Preview>
          <ExportBar video={video} busy={busy} disabled={!ready || uploading || !contentValid} progress={progress} error={error} results={results} onExport={exportAs} />
        </section>
      </main>

      <details className="publish-guide">
        <summary>How do I use my card on a website?</summary>
        <HowTo />
      </details>

      <footer className="foot">
        <span>MIT licensed. Built with <a href="https://www.npmjs.com/package/@liveog/react" target="_blank" rel="noreferrer">@liveog/react</a>, the same components you would use in your own app.</span>
      </footer>
    </>
  )
}
