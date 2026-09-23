import { formatBytes } from '../lib/media'
import type { VideoKind } from '../lib/video'
import { Icon } from './Icons'

export type ExportKind = 'png' | 'gif' | 'video'
export interface ExportResult { kind: ExportKind; filename: string; bytes: number }
interface Props {
  video: VideoKind | null | 'detecting'
  busy: ExportKind | null
  disabled: boolean
  progress: { done: number; total: number } | null
  error: string | null
  results: ExportResult[]
  onExport: (kind: ExportKind) => void
}

export function ExportBar({ video, busy, disabled, progress, error, results, onExport }: Props) {
  const videoLabel = video === 'webm' ? 'WebM' : 'MP4'
  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0
  return <section className="export panel" id="download" aria-labelledby="download-title">
    <div className="download-heading"><span className="step">4</span><div><h3 id="download-title">Ready to share?</h3><p>Choose a format. Your file downloads directly.</p></div></div>
    <div className="download-options">
      <button type="button" className="download-option" disabled={disabled || !!busy} onClick={() => onExport('png')}>
        <Icon.image /><strong>Image <span>PNG</span></strong><small>A finished still for your link preview</small>
      </button>
      <button type="button" className="download-option" disabled={disabled || !!busy} onClick={() => onExport('gif')}>
        <Icon.gif /><strong>Animation <span>GIF</span></strong><small>A looping card to share as an image</small>
      </button>
      <button type="button" className="download-option" disabled={disabled || !!busy || !video || video === 'detecting'} onClick={() => onExport('video')}>
        <Icon.film /><strong>Video <span>{video === 'detecting' ? 'Checking…' : videoLabel}</span></strong><small>A smooth clip for posts and presentations</small>
      </button>
    </div>
    {busy && progress && <div className="progress" role="progressbar" aria-label="Preparing download" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-bar" style={{ width: `${pct}%` }} /><span>Preparing your {busy === 'png' ? 'image' : busy === 'gif' ? 'animation' : 'video'}… {pct}%</span>
    </div>}
    <ul className="results" aria-live="polite">{results.map(r => <li key={r.kind}><Icon.check /> {r.filename} <span className="dim">{formatBytes(r.bytes)}</span></li>)}</ul>
    {video === 'webm' && <p className="hint">This browser saves video as WebM. For MP4, try a browser that supports H.264 encoding.</p>}
    {video === null && <p className="hint">Video downloads are unavailable in this browser. You can still save an image or GIF.</p>}
    {disabled && <p className="hint">Finish the highlighted fields before downloading.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <p className="hint">For website link previews, include the PNG. Animation playback depends on where you share it.</p>
  </section>
}
