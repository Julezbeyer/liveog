import { baseDefaults, type CardData, type Media } from '../templates/types'

export type AnimationStyle = 'template' | 'fade' | 'slide' | 'still'
export interface Draft {
  version: 1
  templateId: string
  cards: Record<string, CardData>
  duration: number
  animation: AnimationStyle
}

type StoredMedia = Media | { kind: 'video'; blob: Blob; name: string }
type StoredCard = Omit<CardData, 'logo' | 'background'> & { logo: StoredMedia | null; background: StoredMedia | null }
type StoredDraft = Omit<Draft, 'cards'> & { cards: Record<string, StoredCard> }

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('liveog-studio', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Draft storage is blocked by another tab'))
  })
}

export function validDraft(value: unknown): value is StoredDraft {
  if (!value || typeof value !== 'object') return false
  const d = value as StoredDraft
  if (d.version !== 1 || typeof d.templateId !== 'string' || ![3000, 4000, 6000].includes(d.duration)) return false
  if (!['template', 'fade', 'slide', 'still'].includes(d.animation)) return false
  if (!d.cards || typeof d.cards !== 'object' || !Object.hasOwn(d.cards, d.templateId)) return false
  return Object.values(d.cards).every(card => {
    if (!card || typeof card !== 'object') return false
    if (!['eyebrow', 'title', 'subtitle', 'suffix', 'accent'].every(key => typeof card[key as keyof CardData] === 'string')) return false
    if (!Number.isFinite(card.value) || !Array.isArray(card.lines) || !card.lines.every(line => typeof line === 'string')) return false
    if (!Array.isArray(card.points) || !card.points.every(Number.isFinite)) return false
    return [card.logo, card.background].every(media => media === null || (
      media && typeof media.name === 'string' && (
        (media.kind === 'image' && 'url' in media && typeof media.url === 'string') ||
        (media.kind === 'video' && 'blob' in media && media.blob instanceof Blob)
      )
    ))
  })
}

export async function loadDraft(): Promise<Draft | null> {
  const db = await openDatabase()
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction('drafts').objectStore('drafts').get('current')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    if (value === undefined) return null
    if (!validDraft(value)) throw new Error('Saved draft is not compatible')
    const restore = (media: StoredMedia | null): Media | null => media && 'blob' in media
      ? { kind: 'video', name: media.name, url: URL.createObjectURL(media.blob) }
      : media
    return { ...value, cards: Object.fromEntries(Object.entries(value.cards).map(([id, card]) => [id, {
      ...baseDefaults, ...card, logo: restore(card.logo), background: restore(card.background),
    }])) }
  } finally { db.close() }
}

export async function saveDraft(draft: Draft): Promise<void> {
  const mediaCache = new Map<string, Promise<StoredMedia>>()
  const storeMedia = async (media: Media | null): Promise<StoredMedia | null> => {
    if (!media || media.kind !== 'video') return media
    if (!mediaCache.has(media.url)) mediaCache.set(media.url, fetch(media.url).then(async response => {
      if (!response.ok) throw new Error('Could not save uploaded video')
      return { kind: 'video' as const, name: media.name, blob: await response.blob() }
    }))
    return mediaCache.get(media.url)!
  }
  const cards = Object.fromEntries(await Promise.all(Object.entries(draft.cards).map(async ([id, card]) => [id, {
    ...card, logo: await storeMedia(card.logo), background: await storeMedia(card.background),
  }])))
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite')
      tx.objectStore('drafts').put({ ...draft, cards }, 'current')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
