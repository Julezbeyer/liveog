import { afterEach, describe, expect, it, vi } from 'vitest'
import { seekVideo, whenLoaded } from './media'

afterEach(() => vi.useRealTimers())

describe('background video preparation', () => {
  it('finishes when an existing seek becomes ready without firing loadeddata again', async () => {
    const video = document.createElement('video')
    let readyState = 1
    Object.defineProperty(video, 'readyState', { get: () => readyState })
    const result = whenLoaded(video)
    readyState = 2
    video.dispatchEvent(new Event('seeked'))
    await expect(result).resolves.toBeUndefined()
  })
  it('waits for the target frame to finish seeking', async () => {
    const video = document.createElement('video')
    let seeking = true
    Object.defineProperty(video, 'readyState', { value: 2 })
    Object.defineProperty(video, 'seeking', { get: () => seeking })
    const result = seekVideo(video, 1)
    expect(video.currentTime).toBe(1)
    seeking = false
    video.dispatchEvent(new Event('seeked'))
    await expect(result).resolves.toBeUndefined()
  })
  it('rejects broken media and stalled loading instead of locking the editor', async () => {
    vi.useFakeTimers()
    const stalled = whenLoaded(document.createElement('video'))
    const checked = expect(stalled).rejects.toThrow('too long')
    await vi.advanceTimersByTimeAsync(15000)
    await checked
    const broken = document.createElement('video')
    Object.defineProperty(broken, 'error', { value: { code: 3 } })
    await expect(whenLoaded(broken)).rejects.toThrow('decoded')
  })
})
