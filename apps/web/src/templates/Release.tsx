import { Animate } from '@liveog/react'
import { Delay } from '../lib/Delay'
import { Backdrop, Logo, accentRgba } from './shared'
import { baseDefaults, type Template } from './types'

export const Release: Template = {
  id: 'release',
  name: 'Release',
  description: 'Version number plus the three changes that matter.',
  fields: [
    { key: 'eyebrow', label: 'Project', type: 'text', placeholder: 'liveog' },
    { key: 'title', label: 'Version', type: 'text', placeholder: 'v0.2.0' },
    { key: 'lines', label: 'Highlights (one per line)', type: 'lines' },
    { key: 'logo', label: 'Logo', type: 'image' },
    { key: 'background', label: 'Background image or video', type: 'media' },
    { key: 'accent', label: 'Accent', type: 'color' },
  ],
  defaults: {
    ...baseDefaults,
    eyebrow: 'liveog',
    title: 'v0.2.0',
    lines: ['Next.js adapter', 'WebM export', 'Easing functions for Animate'],
  },
  Component({ data, time, playing, exporting }) {
    return (
      <Backdrop data={data} time={time} playing={playing} exporting={exporting} style={{ padding: 72, display: 'flex', gap: 64, alignItems: 'center' }}>
        <div style={{ flex: '0 0 460px' }}>
          <Delay ms={0} time={time}>
            <Animate from="top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <Logo media={data.logo} size={56} />
                <div style={{ fontSize: 30, fontWeight: 600, opacity: 0.8 }}>{data.eyebrow}</div>
              </div>
            </Animate>
          </Delay>
          <Delay ms={150} time={time}>
            <Animate from="bottom">
              <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -5, lineHeight: 1, color: accentRgba(data.accent, 1) }}>{data.title}</div>
            </Animate>
          </Delay>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 26, flex: 1 }}>
          {data.lines.filter(Boolean).slice(0, 4).map((line, i) => (
            <Delay key={i} ms={400 + i * 220} time={time}>
              <Animate from="left">
                <li style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 38, lineHeight: 1.25 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 8, background: accentRgba(data.accent, 1), flex: '0 0 auto' }} />
                  <span>{line}</span>
                </li>
              </Animate>
            </Delay>
          ))}
        </ul>
      </Backdrop>
    )
  },
}
