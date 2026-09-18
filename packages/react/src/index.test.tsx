import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Animate, Counter, LiveCard, LiveOGTimeProvider, useLiveOGTime } from './index'

// Vitest runs without `globals`, so Testing Library's auto-cleanup is not wired up.
afterEach(cleanup)

/** Dispatches the event the renderer uses to drive the timeline. */
function emitTime(ms: number) {
  act(() => {
    window.dispatchEvent(new CustomEvent('liveog:time', { detail: ms }))
  })
}

function ShowTime() {
  return <span data-testid="time">{useLiveOGTime()}</span>
}

describe('useLiveOGTime', () => {
  it('reads the value from a provider', () => {
    render(
      <LiveOGTimeProvider value={1234}>
        <ShowTime />
      </LiveOGTimeProvider>,
    )
    expect(screen.getByTestId('time').textContent).toBe('1234')
  })

  it('subscribes to liveog:time when there is no provider', () => {
    render(<ShowTime />)
    expect(screen.getByTestId('time').textContent).toBe('0')
    emitTime(900)
    expect(screen.getByTestId('time').textContent).toBe('900')
  })

  it('ignores the window event while a provider is in control', () => {
    render(
      <LiveOGTimeProvider value={500}>
        <ShowTime />
      </LiveOGTimeProvider>,
    )
    emitTime(4000)
    expect(screen.getByTestId('time').textContent).toBe('500')
  })

  it('removes its listener on unmount', () => {
    const { unmount } = render(<ShowTime />)
    unmount()
    // Would throw an act() warning or update a detached tree if still subscribed.
    expect(() => emitTime(2000)).not.toThrow()
  })
})

describe('LiveCard', () => {
  it('exposes the duration and clips its children', () => {
    const { container } = render(
      <LiveCard width={800} height={400} duration={2500}>
        <span>hi</span>
      </LiveCard>,
    )
    const card = container.firstElementChild as HTMLElement
    expect(card.dataset.liveogDuration).toBe('2500')
    expect(card.style.width).toBe('800px')
    expect(card.style.height).toBe('400px')
    expect(card.style.overflow).toBe('hidden')
  })
})

function animateAt(time: number, props: Record<string, unknown> = {}) {
  const { container } = render(
    <LiveOGTimeProvider value={time}>
      <Animate {...props}>
        <span>text</span>
      </Animate>
    </LiveOGTimeProvider>,
  )
  return (container.firstElementChild as HTMLElement).style
}

describe('Animate', () => {
  it('starts hidden and offset', () => {
    const style = animateAt(0, { duration: 1000, easing: 'linear', distance: 40 })
    expect(style.opacity).toBe('0')
    expect(style.transform).toBe('translateY(40px)')
  })

  it('finishes fully visible and in place', () => {
    const style = animateAt(1000, { duration: 1000, easing: 'linear', distance: 40 })
    expect(style.opacity).toBe('1')
    expect(style.transform).toBe('translateY(0px)')
  })

  it('waits for the delay before moving', () => {
    const style = animateAt(400, { duration: 1000, delay: 500, easing: 'linear' })
    expect(style.opacity).toBe('0')
  })

  it('runs the segment after the delay', () => {
    const style = animateAt(1000, { duration: 1000, delay: 500, easing: 'linear', distance: 40 })
    expect(style.opacity).toBe('0.5')
    expect(style.transform).toBe('translateY(20px)')
  })

  it('moves along X and flips sign for left', () => {
    const style = animateAt(0, { from: 'left', duration: 1000, distance: 40 })
    expect(style.transform).toBe('translateX(-40px)')
  })

  it('accepts a custom easing function', () => {
    const style = animateAt(500, { duration: 1000, easing: (t: number) => t * t, distance: 40 })
    expect(style.opacity).toBe('0.25')
  })
})

function counterText(time: number, props: Record<string, unknown>) {
  const { container } = render(
    <LiveOGTimeProvider value={time}>
      <Counter to={1000} {...props} />
    </LiveOGTimeProvider>,
  )
  return container.textContent
}

describe('Counter', () => {
  it('starts at `from` and ends at `to`', () => {
    expect(counterText(0, { duration: 1000, easing: 'linear' })).toBe('0')
    expect(counterText(1000, { duration: 1000, easing: 'linear' })).toBe('1,000')
  })

  it('interpolates in between', () => {
    expect(counterText(500, { duration: 1000, easing: 'linear' })).toBe('500')
  })

  it('honours delay', () => {
    expect(counterText(500, { duration: 1000, delay: 500, easing: 'linear' })).toBe('0')
    expect(counterText(1500, { duration: 1000, delay: 500, easing: 'linear' })).toBe('1,000')
  })

  it('appends a suffix', () => {
    expect(counterText(1000, { duration: 1000, suffix: ' stars' })).toBe('1,000 stars')
  })

  it('uses a custom format function', () => {
    const format = (value: number) => `${(value / 1000).toFixed(1)}k`
    expect(counterText(1000, { duration: 1000, format })).toBe('1.0k')
  })

  it('counts down when `from` is larger than `to`', () => {
    expect(counterText(1000, { from: 5000, to: 1000, duration: 1000, easing: 'linear' })).toBe('1,000')
  })
})
