import { useEffect, useState } from 'react'
import type { AnimationStyle } from '../lib/draft'
import { parseChartValues } from '../lib/chart-values'
import { IMAGE_ACCEPT, MEDIA_ACCEPT, fileToMedia } from '../lib/media'
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
  animation: AnimationStyle
  disabled: boolean
  onUploading: (value: boolean) => void
  onAnimation: (style: AnimationStyle) => void
  onValidity: (valid: boolean) => void
  onTemplate: (t: Template) => void
  onChange: (patch: Partial<CardData>) => void
  onDuration: (ms: number) => void
  onImport: (result: ImportResult) => void
  onUseSocialImage: (image: Media) => void
}

export function Editor({ templates, template, data, duration, onTemplate, onChange, onDuration, onImport, onUseSocialImage, animation, onAnimation, disabled, onValidity, onUploading }: Props) {
  const [step, setStep] = useState<'template' | 'content' | 'motion'>('template')
  return (
    <fieldset className="editor editor-lock" disabled={disabled}>
      <legend className="sr-only">Card editor</legend>
      <div className="editor-steps" aria-label="Editing steps">
        {(['template', 'content', 'motion'] as const).map((name, i) => (
          <button type="button" key={name} aria-pressed={step === name} onClick={() => setStep(name)}>
            <span>{i + 1}</span>{name === 'motion' ? 'Animation' : name === 'content' ? 'Content' : 'Template'}
          </button>
        ))}
      </div>
      {/* Only rendered where the importer is actually deployed - see IMPORT_API. */}
      {step === 'content' && IMPORT_API && <ImportUrl onImport={onImport} onUseSocialImage={onUseSocialImage} />}

      <section className="panel" hidden={step !== 'template'}>
        <h2>Choose your starting point</h2>
        <p className="panel-intro">Each look is ready to edit. Your changes stay with each template.</p>
        <div className="template-grid" role="radiogroup" aria-label="Template">
          {templates.map(t => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === template.id}
              className={'template' + (t.id === template.id ? ' selected' : '')}
              onClick={() => { onTemplate(t); setStep('content') }}
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

      <section className="panel" hidden={step !== 'content'}>
        <h2>Make it yours</h2>
        <p className="panel-intro">Your changes appear in the preview immediately.</p>
        {template.fields.map(field => (
          <Field key={`${template.id}-${field.key}`} field={field} data={data} onChange={onChange} onValidity={onValidity} disabled={disabled} onUploading={onUploading} />
        ))}
      </section>

      <section className="panel" hidden={step !== 'motion'}>
        <h2>Choose an animation</h2>
        <div className="motion-options" role="group" aria-label="Animation style">
          {([
            ['template', 'Signature motion', 'The animation designed for this template'],
            ['fade', 'Fade in', 'A soft entrance for the whole card'],
            ['slide', 'Slide up', 'Bring the card into view from below'],
            ['still', 'Still', 'Keep everything in place'],
          ] as const).map(([id, name, hint]) => <button type="button" key={id} aria-pressed={animation === id} onClick={() => onAnimation(id)}>
            <strong>{name}</strong><small>{hint}</small>
          </button>)}
        </div>
        <h2>Duration</h2>
        <div className="segmented" role="radiogroup" aria-label="Duration">
          {[3000, 4000, 6000].map(ms => (
            <button key={ms} type="button" role="radio" aria-checked={duration === ms} className={duration === ms ? 'on' : ''} onClick={() => onDuration(ms)}>
              {ms / 1000}s
            </button>
          ))}
        </div>
        <small>Press play below the preview to see your animation. Video backgrounds loop to fill the duration.</small>
      </section>
      <div className="editor-next">
        {step !== 'template' && <button type="button" className="button small" onClick={() => setStep(step === 'motion' ? 'content' : 'template')}>← Back</button>}
        {step !== 'motion' && <button type="button" className="button small primary" onClick={() => setStep(step === 'template' ? 'content' : 'motion')}>{step === 'template' ? 'Edit content' : 'Choose animation'} →</button>}
      </div>
    </fieldset>
  )
}

function Field({ field, data, onChange, onValidity, disabled, onUploading }: { field: FieldSpec; data: CardData; onChange: Props['onChange']; onValidity: Props['onValidity']; disabled: boolean; onUploading: Props['onUploading'] }) {
  const id = `field-${field.key}`
  switch (field.type) {
    case 'text':
      return (
        <label className="field" htmlFor={id}>
          <span>{field.label}</span>
          <input id={id} type="text" value={String(data[field.key])} placeholder={field.placeholder} onChange={e => onChange({ [field.key]: e.target.value })} />
        </label>
      )
    case 'points':
      return <ChartValues values={data.points} onChange={points => onChange({ points })} onValidity={onValidity} />
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
    case 'media':
      return <UploadField field={field} current={data[field.key] as Media | null} disabled={disabled} onUploading={onUploading} onChange={media => onChange({ [field.key]: media })} />
  }
}

function UploadField({ field, current, disabled, onUploading, onChange }: { field: FieldSpec; current: Media | null; disabled: boolean; onUploading: Props['onUploading']; onChange: (media: Media | null) => void }) {
  const [error, setError] = useState<string | null>(null)
  const accept = field.type === 'media' ? MEDIA_ACCEPT : IMAGE_ACCEPT
  const upload = async (file: File) => {
    if (disabled) return
    setError(null)
    if (!accept.split(',').includes(file.type)) { setError('Choose a supported image or video file.'); return }
    onUploading(true)
    try { onChange(await fileToMedia(file)) }
    catch { setError('This file could not be opened. Please try another file.') }
    finally { onUploading(false) }
  }
  return <div className="field">
    <span>{field.label}</span>
    <div className={'dropzone' + (current ? ' filled' : '')} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) void upload(file) }}>
      {current ? <>
        {current.kind === 'video' ? <video src={current.url} muted loop autoPlay playsInline className="thumb" /> : <img src={current.url} alt="" className="thumb" />}
        <span className="filename">{current.name}</span>
        <button type="button" className="iconbtn" aria-label={`Remove ${field.label.toLowerCase()}`} onClick={() => onChange(null)}><Icon.x /></button>
      </> : <label className="dropzone-label">
        <Icon.upload /><span>{field.type === 'media' ? 'Drop an image or video, or choose a file' : 'Drop your logo, or choose a file'}</span>
        <input type="file" aria-label={field.label} accept={accept} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void upload(file) }} />
      </label>}
    </div>
    <small>{field.type === 'media' ? 'PNG, JPG, WebP, MP4 or WebM.' : 'PNG, JPG, WebP or SVG.'} Saved with your draft on this device.</small>
    {error && <small className="error" role="alert">{error}</small>}
  </div>
}

function ChartValues({ values, onChange, onValidity }: { values: number[]; onChange: (values: number[]) => void; onValidity: (valid: boolean) => void }) {
  const [text, setText] = useState(values.join(', '))
  const parsed = parseChartValues(text)
  useEffect(() => { onValidity(parsed !== null) }, [text, onValidity])
  return <label className="field" htmlFor="chart-values">
    <span id="chart-values-label">Chart values</span>
    <textarea id="chart-values" aria-labelledby="chart-values-label" rows={3} value={text} aria-invalid={!parsed} aria-describedby="chart-values-help" onChange={e => {
      setText(e.target.value)
      const next = parseChartValues(e.target.value)
      if (next) onChange(next)
    }} />
    <small id="chart-values-help">{parsed ? 'Separate 2–100 numbers with commas, spaces or new lines.' : 'Enter 2–100 valid numbers. The preview keeps your last valid values.'}</small>
  </label>
}
