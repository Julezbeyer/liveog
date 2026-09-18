import { Animate, Counter } from '@liveog/react'
import { Delay } from '../lib/Delay'
import { Backdrop, Logo, accentRgba } from './shared'
import { baseDefaults, type Template } from './types'

export const Stats: Template = {
  id: 'stats',
  name: 'Stats',
  description: 'A number that counts up. Stars, users, downloads, revenue.',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text', placeholder: 'GITHUB STARS' },
    { key: 'value', label: 'Number', type: 'number' },
    { key: 'suffix', label: 'Suffix', type: 'text', placeholder: ' ★' },
    { key: 'title', label: 'Caption', type: 'text', placeholder: 'Thank you for 10k stars' },
    { key: 'logo', label: 'Logo', type: 'image' },
    { key: 'background', label: 'Background image', type: 'image' },
    { key: 'accent', label: 'Accent', type: 'color' },
  ],
  defaults: {
    ...baseDefaults,
    eyebrow: 'GITHUB STARS',
    value: 12842,
    suffix: ' ★',
    title: 'Thank you. LiveOG just crossed 12k stars.',
  },
  Component({ data, time }) {
    return (
      <Backdrop data={data} style={{ padding: 72, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: 56, left: 72 }}>
          <Delay ms={0} time={time}>
            <Animate from="top">
              <Logo src={data.logo} size={64} />
            </Animate>
          </Delay>
        </div>
        <Delay ms={0} time={time}>
          <Animate from="top">
            <div style={{ fontSize: 28, letterSpacing: 5, fontWeight: 600, color: accentRgba(data.accent, 1) }}>{data.eyebrow}</div>
          </Animate>
        </Delay>
        <Delay ms={200} time={time}>
          <Animate from="bottom">
            <div style={{ fontSize: 168, fontWeight: 800, letterSpacing: -6, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
              <Counter from={0} to={data.value} suffix={data.suffix} />
            </div>
          </Animate>
        </Delay>
        <Delay ms={500} time={time}>
          <Animate from="bottom">
            <div style={{ fontSize: 34, opacity: 0.75, maxWidth: 900, lineHeight: 1.3 }}>{data.title}</div>
          </Animate>
        </Delay>
      </Backdrop>
    )
  },
}
