import type { ComponentType } from 'react'

export interface CardData {
  eyebrow: string
  title: string
  subtitle: string
  value: number
  suffix: string
  lines: string[]
  accent: string
  /** Data URL of an uploaded background image, or empty. */
  background: string
  /** Data URL of an uploaded logo, or empty. */
  logo: string
}

export type FieldKey = keyof CardData

export interface FieldSpec {
  key: FieldKey
  label: string
  type: 'text' | 'number' | 'color' | 'image' | 'lines'
  placeholder?: string
}

export interface TemplateProps {
  data: CardData
  /** Timeline position in milliseconds. */
  time: number
  duration: number
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
  accent: '#7c5cff',
  background: '',
  logo: '',
}
