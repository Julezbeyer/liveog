import { describe, expect, it } from 'vitest'
import { baseDefaults } from '../templates/types'
import { validDraft } from './draft'

const draft = { version: 1, templateId: 'chart', duration: 4000, animation: 'template', cards: { chart: baseDefaults } }
describe('stored drafts', () => {
  it('accepts complete drafts and actual video blobs', () => {
    expect(validDraft(draft)).toBe(true)
    expect(validDraft({ ...draft, cards: { chart: { ...baseDefaults, background: { kind: 'video', name: 'clip.mp4', blob: new Blob(['video']) } } } })).toBe(true)
  })
  it('rejects stale blob URLs that cannot survive reloading', () => {
    expect(validDraft({ ...draft, cards: { chart: { ...baseDefaults, background: { kind: 'video', name: 'clip.mp4', url: 'blob:expired' } } } })).toBe(false)
  })
  it('rejects incompatible versions, missing active cards and corrupt data', () => {
    for (const invalid of [null, { ...draft, version: 2 }, { ...draft, cards: {} }, { ...draft, duration: -1 }, { ...draft, cards: { chart: { ...baseDefaults, points: ['bad'] } } }]) expect(validDraft(invalid)).toBe(false)
  })
})
