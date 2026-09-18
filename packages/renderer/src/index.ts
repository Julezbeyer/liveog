export type RenderFormat = 'png' | 'gif' | 'mp4'

export interface RenderRequest {
  entry: string
  outDir: string
  formats: RenderFormat[]
  width?: number
  height?: number
  duration?: number
  fps?: number
}

// PoC boundary: browser capture + ffmpeg implementation lands next.
export async function render(_request: RenderRequest) {
  throw new Error('Renderer PoC not implemented yet')
}
