import { useRef, useState } from 'react'
import { importFromUrl, type ImportResult } from '../lib/site-import'
import type { Media } from '../templates'
import { Icon } from './Icons'

interface Props {
  onImport: (result: ImportResult) => void
  /** Puts the page's own social image behind the card. */
  onUseSocialImage: (image: Media) => void
}

export function ImportUrl({ onImport, onUseSocialImage }: Props) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<string[]>([])
  const [done, setDone] = useState<string | null>(null)
  const [socialImage, setSocialImage] = useState<Media | null>(null)
  const [socialImageUsed, setSocialImageUsed] = useState(false)
  // Someone who types a second URL while the first is still loading should get
  // the second answer, not whichever request happens to finish last.
  const pending = useRef<AbortController | null>(null)

  const run = async () => {
    if (!url.trim() || busy) return
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller

    setBusy(true)
    setError(null)
    setNotes([])
    setDone(null)
    setSocialImage(null)
    setSocialImageUsed(false)
    try {
      const result = await importFromUrl(url, controller.signal)
      onImport(result)
      setNotes(result.notes)
      setDone(result.url)
      setSocialImage(result.socialImage)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (pending.current === controller) {
        pending.current = null
        setBusy(false)
      }
    }
  }

  return (
    <section className="panel">
      <h2>Start from your site</h2>
      <div className="import-row">
        <input
          type="url"
          inputMode="url"
          value={url}
          placeholder="example.com"
          aria-label="Website address"
          disabled={busy}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void run() } }}
        />
        <button type="button" className="button small" disabled={busy || !url.trim()} onClick={() => void run()}>
          {busy ? 'Reading…' : 'Import'}
        </button>
      </div>

      {error && <p className="import-error" role="alert">{error}</p>}

      {done && !error && (
        <p className="import-ok">
          <Icon.sparkle /> Filled in from {hostOf(done)}. Everything below is still yours to change.
        </p>
      )}

      {socialImage && (
        <div className="import-social">
          <img src={socialImage.url} alt="" className="import-social-thumb" />
          <div>
            <span>Their current social image</span>
            {socialImageUsed ? (
              <small>Now behind your card.</small>
            ) : (
              <>
                <small>Works best when it is a picture, not a finished card with text on it.</small>
                <button
                  type="button"
                  className="button small ghost"
                  onClick={() => { onUseSocialImage(socialImage); setSocialImageUsed(true) }}
                >
                  Use as background
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <ul className="import-notes">
          {notes.map(note => <li key={note}>{note}</li>)}
        </ul>
      )}

      <small>
        We read the page&rsquo;s own Open Graph tags. Only the address you type is sent to our importer &mdash;
        your uploads never leave this browser.
      </small>
    </section>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
