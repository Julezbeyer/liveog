import { LiveOGTimeProvider } from '@liveog/react'
import type { AnimationStyle } from '../lib/draft'
import { MediaTime } from '../templates/shared'
import { WIDTH, HEIGHT, type Template, type TemplateProps } from '../templates'

export function MotionCard({ template, animation, ...props }: TemplateProps & { template: Template; animation: AnimationStyle }) {
  const Card = template.Component
  const native = animation === 'template'
  const time = native ? props.time : props.duration
  const progress = Math.min(1, Math.max(0, props.time / (props.duration * 0.35)))
  const eased = 1 - Math.pow(1 - progress, 3)
  return <div style={{ width: WIDTH, height: HEIGHT, background: '#0b0b0f', overflow: 'hidden' }}>
    <div style={{ opacity: animation === 'fade' || animation === 'slide' ? eased : 1, transform: animation === 'slide' ? `translateY(${(1 - eased) * 64}px)` : undefined }}>
      <LiveOGTimeProvider value={time}>
        <MediaTime.Provider value={animation === 'still' ? props.duration : props.time}>
          <Card {...props} time={time} playing={animation === 'still' ? false : props.playing} />
        </MediaTime.Provider>
      </LiveOGTimeProvider>
    </div>
  </div>
}
