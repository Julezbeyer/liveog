import { Typewriter } from '@liveog/react'
import { Backdrop, Logo } from './shared'
import { baseDefaults, type Template } from './types'

export const Typing: Template = {
  id: 'typing', name: 'Typewriter', description: 'A message that writes itself, one letter at a time.',
  fields: [
    { key: 'eyebrow', label: 'Label', type: 'text' },
    { key: 'title', label: 'Your message', type: 'text' },
    { key: 'subtitle', label: 'Supporting text', type: 'text' },
    { key: 'logo', label: 'Logo', type: 'image' },
    { key: 'background', label: 'Background image or video', type: 'media' },
    { key: 'accent', label: 'Accent color', type: 'color' },
  ],
  defaults: { ...baseDefaults, eyebrow: 'MAKE YOUR NEXT MOVE', title: 'Good ideas deserve to be seen.', subtitle: 'Turn a few words into a little moment of attention.' },
  Component({ data, time, duration, playing, exporting }) {
    return <Backdrop data={data} time={time} playing={playing} exporting={exporting} style={{ padding: 72, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}><Logo media={data.logo} /><span style={{ color: data.accent, fontSize: 24, letterSpacing: 3 }}>{data.eyebrow}</span></div>
      <Typewriter text={data.title} as="div" duration={duration * 0.7} hideCursorOnComplete style={{ fontFamily: 'inherit', fontSize: data.title.length > 70 ? 56 : 78, fontWeight: 800, letterSpacing: -2, lineHeight: 1.15, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} />
      <div style={{ fontSize: 28, opacity: 0.7, lineHeight: 1.4 }}>{data.subtitle}</div>
    </Backdrop>
  },
}
