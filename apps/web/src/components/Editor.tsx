import { readAsDataUrl } from '../lib/files'
import type { CardData, FieldSpec, Template } from '../templates'

interface Props {
  templates: Template[]
  template: Template
  data: CardData
  duration: number
  onTemplate: (t: Template) => void
  onChange: (patch: Partial<CardData>) => void
  onDuration: (ms: number) => void
}

export function Editor({ templates, template, data, duration, onTemplate, onChange, onDuration }: Props) {
  return (
    <aside className="editor">
      <section>
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
              <strong>{t.name}</strong>
              <span>{t.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Content</h2>
        {template.fields.map(field => (
          <Field key={field.key} field={field} data={data} onChange={onChange} />
        ))}
      </section>

      <section>
        <h2>Timing</h2>
        <label className="field">
          <span>Duration</span>
          <select value={duration} onChange={e => onDuration(Number(e.target.value))}>
            <option value={3000}>3 seconds</option>
            <option value={4000}>4 seconds</option>
            <option value={6000}>6 seconds</option>
          </select>
        </label>
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
        <label className="field field-color" htmlFor={id}>
          <span>{field.label}</span>
          <input id={id} type="color" value={data.accent} onChange={e => onChange({ accent: e.target.value })} />
          <code>{data.accent}</code>
        </label>
      )
    case 'lines':
      return (
        <label className="field" htmlFor={id}>
          <span>{field.label}</span>
          <textarea id={id} rows={4} value={data.lines.join('\n')} onChange={e => onChange({ lines: e.target.value.split('\n') })} />
        </label>
      )
    case 'image': {
      const current = data[field.key] as string
      return (
        <div className="field">
          <span>{field.label}</span>
          <div className="image-field">
            {current ? <img src={current} alt="" /> : <div className="image-empty">none</div>}
            <label className="button small">
              {current ? 'Replace' : 'Upload'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (file) onChange({ [field.key]: await readAsDataUrl(file) })
                  e.target.value = ''
                }}
              />
            </label>
            {current && (
              <button type="button" className="button small ghost" onClick={() => onChange({ [field.key]: '' })}>Remove</button>
            )}
          </div>
          <small>Stays in your browser. Nothing is uploaded anywhere.</small>
        </div>
      )
    }
  }
}
