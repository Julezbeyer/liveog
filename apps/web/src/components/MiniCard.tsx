import { LiveOGTimeProvider } from '@liveog/react'
import { HEIGHT, WIDTH, type Template } from '../templates'

const MINI_WIDTH = 112
const scale = MINI_WIDTH / WIDTH

/** Static thumbnail of a template at the end of its timeline, rendered with the real component. */
export function MiniCard({ template }: { template: Template }) {
  const Card = template.Component
  return (
    <span className="mini" style={{ width: MINI_WIDTH, height: HEIGHT * scale }} aria-hidden>
      <span style={{ display: 'block', transform: `scale(${scale})`, transformOrigin: 'top left', width: WIDTH, height: HEIGHT, pointerEvents: 'none' }}>
        <LiveOGTimeProvider value={4000}>
          <Card data={template.defaults} time={4000} duration={4000} exporting={false} playing={false} />
        </LiveOGTimeProvider>
      </span>
    </span>
  )
}
