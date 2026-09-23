import { Sparkline } from '@liveog/react'
import { Backdrop, Logo } from './shared'
import { baseDefaults, type Template } from './types'

export const Chart: Template = {
  id: 'chart', name: 'Growth chart', description: 'Paste your numbers. Watch the story take shape.',
  fields: [
    { key: 'eyebrow', label: 'Label', type: 'text' },
    { key: 'title', label: 'Headline', type: 'text' },
    { key: 'subtitle', label: 'Chart caption', type: 'text' },
    { key: 'points', label: 'Chart values', type: 'points', placeholder: '12, 18, 15, 28, 36, 42, 58' },
    { key: 'logo', label: 'Logo', type: 'image' },
    { key: 'background', label: 'Background image or video', type: 'media' },
    { key: 'accent', label: 'Accent color', type: 'color' },
  ],
  defaults: { ...baseDefaults, eyebrow: 'THE BIGGER PICTURE', title: 'Small steps. Real progress.', subtitle: 'Your last seven milestones', points: [12, 18, 15, 28, 36, 42, 58] },
  Component({ data, time, duration, playing, exporting }) {
    return <Backdrop data={data} time={time} playing={playing} exporting={exporting} style={{ padding: '52px 72px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}><Logo media={data.logo} size={44} /><span style={{ color: data.accent, fontSize: 23, letterSpacing: 3 }}>{data.eyebrow}</span></div>
      <div style={{ fontSize: data.title.length > 45 ? 44 : 60, fontWeight: 800, lineHeight: 1.1, letterSpacing: -2 }}>{data.title}</div>
      <Sparkline data={data.points} width={1056} height={290} stroke={data.accent} strokeWidth={5} smooth fill duration={duration * 0.75} />
      <div style={{ fontSize: 24, opacity: 0.7 }}>{data.subtitle}</div>
    </Backdrop>
  },
}
