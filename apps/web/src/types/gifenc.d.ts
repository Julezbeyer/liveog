declare module 'gifenc' {
  export type Palette = number[][]
  export type PixelFormat = 'rgb565' | 'rgb444' | 'rgba4444'

  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, options?: { format?: PixelFormat; oneBitAlpha?: boolean | number; clearAlpha?: boolean; clearAlphaThreshold?: number; clearAlphaColor?: number }): Palette
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: PixelFormat): Uint8Array

  export interface FrameOptions {
    palette?: Palette
    first?: boolean
    transparent?: boolean
    transparentIndex?: number
    delay?: number
    repeat?: number
    dispose?: number
  }
  export interface Encoder {
    writeFrame(index: Uint8Array, width: number, height: number, options?: FrameOptions): void
    finish(): void
    bytes(): Uint8Array
    bytesView(): Uint8Array
    reset(): void
  }
  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): Encoder
  export default GIFEncoder
}
