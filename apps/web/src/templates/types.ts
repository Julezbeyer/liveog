import type { ComponentType } from 'react'

export type MediaKind = 'image' | 'video'

export interface Media {
  kind: MediaKind
  /** Data URL (images) or object URL (videos). Never leaves the browser. */
  url: string
  name: string
}

export interface CardData {
  eyebrow: string
  title: string
  subtitle: string
  value: number
  suffix: string
  lines: string[]
  points: number[]
  accent: string
  /** Full-bleed background image or video, or null for the accent gradient. */
  background: Media | null
  /** Small logo image, or null. */
  logo: Media | null
}

export type FieldKey = keyof CardData

export interface FieldSpec {
  key: FieldKey
  label: string
  type: 'text' | 'number' | 'color' | 'image' | 'media' | 'lines' | 'points'
  placeholder?: string
}

export interface TemplateProps {
  data: CardData
  /** Timeline position in milliseconds. */
  time: number
  duration: number
  /** True while frames are being captured for export. */
  exporting: boolean
  /** True while the preview is playing (video backgrounds run freely). */
  playing: boolean
}

export interface Template {
  id: string
  name: string
  description: string
  fields: FieldSpec[]
  defaults: CardData
  Component: ComponentType<TemplateProps>
}

export const WIDTH = 1200
export const HEIGHT = 630

export const baseDefaults: CardData = {
  eyebrow: '',
  title: '',
  subtitle: '',
  value: 0,
  suffix: '',
  lines: [],
  points: [12, 18, 15, 28, 36, 42, 58],
  accent: '#7c5cff',
  background: null,
  logo: null,
}
