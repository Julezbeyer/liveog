import { formatBytes } from '../lib/media'
import type { VideoKind } from '../lib/video'
import { Icon } from './Icons'

export type ExportKind = 'png' | 'gif' | 'video'

export interface ExportResult { kind: ExportKind; filename: string; bytes: number }

interface Props {
  video: VideoKind | null | 'detecting'
  busy: ExportKind | null
  progress: { done: number; total: number } | null
  error: string | null
  results: ExportResult[]
  onExport: (kind: ExportKind) => void
}

export function ExportBar({ video, busy, progress, error, results, onExport }: Props) {
  const videoLabel = video === 'webm' ? 'WebM' : 'MP4'
  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const labelFor = (k: ExportKind) => (k === 'video' ? videoLabel : k.toUpperCase())

  return (
    <div className="export panel">
      <div className="export-row">
        <div className="export-buttons">
          <button type="button" className="button primary" disabled={!!busy} onClick={() => onExport('png')}>
            <Icon.image /> PNG
          </button>
          <button type="button" className="button primary" disabled={!!busy} onClick={() => onExport('gif')}>
            <Icon.gif /> GIF
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!!busy || !video || video === 'detecting'}
            onClick={() => onExport('video')}
            title={video === null ? 'Video export needs WebCodecs (Chrome, Edge, Safari 17+). The CLI renders MP4 anywhere.' : undefined}
          >
            <Icon.film /> {videoLabel}
          </button>
        </div>
        <ul className="results" aria-live="polite">
          {results.map(r => (
            <li key={r.kind}><Icon.check /> {r.filename} <span className="dim">{formatBytes(r.bytes)}</span></li>
          ))}
        </ul>
      </div>
      {busy && progress && (
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-bar" style={{ width: `${pct}%` }} />
          <span>Rendering {labelFor(busy)} · frame {progress.done}/{progress.total}</span>
        </div>
      )}
      {video === 'webm' && !busy && (
        <p className="hint">This browser cannot encode H.264, so video comes out as WebM (VP9). For an MP4 use Chrome, Edge or Safari, or run <code>npx @liveog/cli</code>.</p>
      )}
      {video === null && !busy && (
        <p className="hint">Video export needs WebCodecs. Use Chrome, Edge or Safari 17+, or run <code>npx @liveog/cli render</code> locally.</p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
