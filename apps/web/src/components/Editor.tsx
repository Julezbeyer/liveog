import { IMAGE_ACCEPT, MEDIA_ACCEPT, fileToMedia, releaseMedia } from '../lib/media'
import { IMPORT_API, type ImportResult } from '../lib/site-import'
import type { CardData, FieldSpec, Media, Template } from '../templates'
import { Icon } from './Icons'
import { ImportUrl } from './ImportUrl'
import { MiniCard } from './MiniCard'

interface Props {
  templates: Template[]
  template: Template
  data: CardData
  duration: number
  onTemplate: (t: Template) => void
  onChange: (patch: Partial<CardData>) => void
  onDuration: (ms: number) => void
  onImport: (result: ImportResult) => void
  onUseSocialImage: (image: Media) => void
}

export function Editor({ templates, template, data, duration, onTemplate, onChange, onDuration, onImport, onUseSocialImage }: Props) {
  return (
    <aside className="editor">
      {/* Only rendered where the importer is actually deployed - see IMPORT_API. */}
      {IMPORT_API && <ImportUrl onImport={onImport} onUseSocialImage={onUseSocialImage} />}

      <section className="panel">
        <h2>Template</h2>
        <div className="template-grid" role="radiogroup" aria-label="Template">
          {templates.map(t => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === template.id}
              className={'template' + (t.id === template.id ? ' selected' : '')}
              onClick={() => onTemplate(t)}
            >
              <MiniCard template={t} />
              <span className="template-text">
                <strong>{t.name}</strong>
                <span>{t.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Content</h2>
        {template.fields.map(field => (
          <Field key={field.key} field={field} data={data} onChange={onChange} />
        ))}
      </section>

      <section className="panel">
        <h2>Timing</h2>
        <div className="segmented" role="radiogroup" aria-label="Duration">
          {[3000, 4000, 6000].map(ms => (
            <button key={ms} type="button" role="radio" aria-checked={duration === ms} className={duration === ms ? 'on' : ''} onClick={() => onDuration(ms)}>
              {ms / 1000}s
            </button>
          ))}
        </div>
        <small>Video backgrounds loop to fill the duration.</small>
      </section>
    </aside>
  )
}

function Field({ field, data, onChange }: { field: FieldSpec; data: CardData; onChange: Props['onChange'] }) {
  const id = `field-${field.key}`
  switch (field.type) {
    case 'text':
      return (
        <label className="field" htmlFor={id}>
          <span>{field.label}</span>
          <input id={id} type="text" value={String(data[field.key])} placeholder={field.placeholder} onChange={e => onChange({ [field.key]: e.target.value })} />
        </label>
      )
    case 'number':
      return (
        <label className="field" htmlFor={id}>
          <span>{field.label}</span>
          <input id={id} type="number" min={0} value={data.value} onChange={e => onChange({ value: Math.max(0, Number(e.target.value) || 0) })} />
        </label>
      )
    case 'color':
      return (
        <div className="field">
          <span>{field.label}</span>
          <div className="swatches">
            {['#7c5cff', '#ff5c8a', '#ff9f43', '#2ed573', '#1e90ff', '#f5f5f5'].map(c => (
              <button key={c} type="button" className={'swatch' + (data.accent === c ? ' on' : '')} style={{ background: c }} aria-label={c} onClick={() => onChange({ accent: c })} />
            ))}
            <label className="swatch custom" title="Custom colour">
              <input id={id} type="color" value={data.accent} onChange={e => onChange({ accent: e.target.value })} />
            </label>
          </div>
        </div>
      )
    case 'lines':
      return (
        <label className="field" htmlFor={id}>
          <span>{field.label}</span>
          <textarea id={id} rows={4} value={data.lines.join('\n')} onChange={e => onChange({ lines: e.target.value.split('\n') })} />
        </label>
      )
    case 'image':
    case 'media': {
      const current = data[field.key] as Media | null
      const accept = field.type === 'media' ? MEDIA_ACCEPT : IMAGE_ACCEPT
      const set = (next: Media | null) => { releaseMedia(current); onChange({ [field.key]: next }) }
      return (
        <div className="field">
          <span>{field.label}</span>
          <div className={'dropzone' + (current ? ' filled' : '')}
            onDragOver={e => e.preventDefault()}
            onDrop={async e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) set(await fileToMedia(f)) }}
          >
            {current ? (
              <>
                {current.kind === 'video'
                  ? <video src={current.url} muted loop autoPlay playsInline className="thumb" />
                  : <img src={current.url} alt="" className="thumb" />}
                <span className="filename">{current.name}</span>
                <button type="button" className="iconbtn" aria-label="Remove" onClick={() => set(null)}><Icon.x /></button>
              </>
            ) : (
              <label className="dropzone-label">
                <Icon.upload />
                <span>{field.type === 'media' ? 'Drop an image or video, or click to choose' : 'Drop an image, or click to choose'}</span>
                <input type="file" accept={accept} hidden onChange={async e => { const f = e.target.files?.[0]; if (f) set(await fileToMedia(f)); e.target.value = '' }} />
              </label>
            )}
          </div>
          <small>{field.type === 'media' ? 'PNG, JPG, WebP, MP4 or WebM. ' : 'PNG, JPG, WebP or SVG. '}Stays on your device.</small>
        </div>
      )
    }
  }
}
