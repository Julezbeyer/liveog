import { useEffect, useRef, useState } from 'react'
import { templates } from '../templates'
import { loadDraft, saveDraft, type Draft } from './draft'

const initial: Draft = { version: 1, templateId: templates[0]!.id, cards: { [templates[0]!.id]: templates[0]!.defaults }, duration: 4000, animation: 'template' }

export function useDraft() {
  const [draft, setDraft] = useState<Draft>(initial)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('Opening your draft…')
  const queue = useRef(Promise.resolve())
  const canSave = useRef(true)
  const videoUrls = useRef(new Set<string>())

  useEffect(() => {
    let active = true
    loadDraft().then(saved => {
      if (!active) {
        if (saved) for (const card of Object.values(saved.cards)) {
          for (const media of [card.logo, card.background]) if (media?.kind === 'video') URL.revokeObjectURL(media.url)
        }
        return
      }
      if (saved && templates.some(t => t.id === saved.templateId)) {
        setDraft(saved)
        setStatus('Draft restored · saved on this device')
      } else setStatus('Changes save automatically on this device')
    }).catch(() => {
      if (active) {
        canSave.current = false
        setStatus('Draft storage unavailable. Keep this tab open and download your card.')
      }
    }).finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!ready || !canSave.current) return
    let active = true
    setStatus('Saving draft…')
    const timer = setTimeout(() => {
      // Serialize writes so an older, large video cannot overwrite newer edits.
      queue.current = queue.current.catch(() => {}).then(() => saveDraft(draft)).then(() => {
        if (active) setStatus('All changes saved on this device')
      }).catch(() => {
        if (active) setStatus('Could not save draft. Keep this tab open and download your card.')
      })
    }, 400)
    return () => { active = false; clearTimeout(timer) }
  }, [draft, ready])

  useEffect(() => {
    const current = new Set<string>()
    for (const card of Object.values(draft.cards)) {
      for (const media of [card.logo, card.background]) if (media?.kind === 'video') current.add(media.url)
    }
    const removed = [...videoUrls.current].filter(url => !current.has(url))
    videoUrls.current = current
    // Finish any save using the previous URLs before releasing their backing blobs.
    void queue.current.finally(() => removed.forEach(url => URL.revokeObjectURL(url)))
  }, [draft])

  return { draft, setDraft, ready, status }
}
