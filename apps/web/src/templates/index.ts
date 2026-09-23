import { Typing } from './Typing'
import { Chart } from './Chart'
import { Launch } from './Launch'
import { Release } from './Release'
import { Stats } from './Stats'
import type { Template } from './types'

export const templates: Template[] = [Launch, Typing, Stats, Chart, Release]
export * from './types'
