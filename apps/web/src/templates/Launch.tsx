import { Animate } from '@liveog/react'
import { Delay } from '../lib/Delay'
import { Backdrop, Logo, accentRgba } from './shared'
import { baseDefaults, type Template } from './types'

export const Launch: Template = {
  id: 'launch',
  name: 'Launch',
  description: 'Headline, tagline and your logo. For product pages and announcements.',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text', placeholder: 'NOW AVAILABLE' },
    { key: 'title', label: 'Title', type: 'text', placeholder: 'Bring Open Graph to life.' },
    { key: 'subtitle', label: 'Tagline', type: 'text', placeholder: 'One React component, three formats.' },
    { key: 'logo', label: 'Logo', type: 'image' },
    { key: 'background', label: 'Background image', type: 'image' },
    { key: 'accent', label: 'Accent', type: 'color' },
  ],
  defaults: {
    ...baseDefaults,
    eyebrow: 'NOW AVAILABLE',
    title: 'Bring Open Graph to life.',
    subtitle: 'Animated social cards from one React component. Static fallback included.',
  },
  Component({ data, time }) {
    return (
      <Backdrop data={data} style={{ padding: 72, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Delay ms={0} time={time}>
            <Animate from="top">
              <Logo src={data.logo} />
            </Animate>
          </Delay>
          <Delay ms={100} time={time}>
            <Animate from="top">
              <div style={{ fontSize: 26, letterSpacing: 4, fontWeight: 600, color: accentRgba(data.accent, 1) }}>{data.eyebrow}</div>
            </Animate>
          </Delay>
        </div>
        <div>
          <Delay ms={250} time={time}>
            <Animate from="bottom">
              <h1 style={{ fontSize: 84, lineHeight: 1.05, margin: 0, fontWeight: 800, letterSpacing: -2, maxWidth: 1000 }}>{data.title}</h1>
            </Animate>
          </Delay>
          <Delay ms={550} time={time}>
            <Animate from="bottom">
              <p style={{ fontSize: 32, margin: '28px 0 0', opacity: 0.75, maxWidth: 900, lineHeight: 1.3 }}>{data.subtitle}</p>
            </Animate>
          </Delay>
        </div>
      </Backdrop>
    )
  },
}
