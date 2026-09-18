import type { VideoKind } from '../lib/video'

export type ExportKind = 'png' | 'gif' | 'video'

interface Props {
  video: VideoKind | null | 'detecting'
  busy: ExportKind | null
  progress: { done: number; total: number } | null
  error: string | null
  onExport: (kind: ExportKind) => void
}

export function ExportBar({ video, busy, progress, error, onExport }: Props) {
  const videoLabel = video === 'mp4' ? 'MP4' : video === 'webm' ? 'WebM' : 'MP4'
  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="export">
      <div className="export-buttons">
        <button type="button" className="button primary" disabled={!!busy} onClick={() => onExport('png')}>
          Download PNG
        </button>
        <button type="button" className="button primary" disabled={!!busy} onClick={() => onExport('gif')}>
          Download GIF
        </button>
        <button
          type="button"
          className="button primary"
          disabled={!!busy || !video || video === 'detecting'}
          onClick={() => onExport('video')}
          title={video === null ? 'Video export needs WebCodecs (Chrome, Edge, Safari 17+). The CLI renders MP4 anywhere.' : undefined}
        >
          Download {videoLabel}
        </button>
      </div>
      {busy && progress && (
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-bar" style={{ width: `${pct}%` }} />
          <span>Rendering {busy === 'video' ? videoLabel : busy.toUpperCase()} · frame {progress.done}/{progress.total}</span>
        </div>
      )}
      {video === 'webm' && !busy && (
        <p className="hint">This browser cannot encode H.264, so you get WebM (VP9) instead. For an MP4 use Chrome, Edge or Safari, or run <code>npx @liveog/cli</code>.</p>
      )}
      {video === null && !busy && (
        <p className="hint">Video export needs WebCodecs. Use Chrome, Edge or Safari 17+, or run <code>npx @liveog/cli render</code> locally.</p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
