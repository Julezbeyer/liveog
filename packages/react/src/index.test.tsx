import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  Animate,
  CodeTyping,
  Counter,
  LiveCard,
  LiveOGTimeProvider,
  Sparkline,
  Typewriter,
  tokenizeCode,
  useLiveOGTime,
} from './index'

// Vitest runs without `globals`, so Testing Library's auto-cleanup is not wired up.
afterEach(cleanup)

/** Dispatches the event the renderer uses to drive the timeline. */
function emitTime(ms: number) {
  act(() => {
    window.dispatchEvent(new CustomEvent('liveog:time', { detail: ms }))
  })
}

/** Dispatches a window message event for iframe cross-origin preview support. */
function postTime(payload: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data: payload }))
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
    expect(() => postTime({ type: 'liveog:time', detail: 2000 })).not.toThrow()
  })

  it('subscribes to window message when there is no provider', () => {
    render(<ShowTime />)
    expect(screen.getByTestId('time').textContent).toBe('0')
    postTime({ type: 'liveog:time', detail: 850 })
    expect(screen.getByTestId('time').textContent).toBe('850')
  })

  it('supports message with time property', () => {
    render(<ShowTime />)
    postTime({ type: 'liveog:time', time: 650 })
    expect(screen.getByTestId('time').textContent).toBe('650')
  })

  it('ignores invalid or unrelated window messages', () => {
    render(<ShowTime />)
    postTime({ type: 'unrelated', detail: 999 })
    expect(screen.getByTestId('time').textContent).toBe('0')
    postTime('some-string-message')
    expect(screen.getByTestId('time').textContent).toBe('0')
  })

  it('ignores window message while a provider is in control', () => {
    render(
      <LiveOGTimeProvider value={500}>
        <ShowTime />
      </LiveOGTimeProvider>,
    )
    postTime({ type: 'liveog:time', detail: 4000 })
    expect(screen.getByTestId('time').textContent).toBe('500')
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

describe('CodeTyping', () => {
  const sampleCode = 'const x = 42;' // 13 chars

  it('renders 0 characters at 0% timeline position', () => {
    render(
      <LiveOGTimeProvider value={0}>
        <CodeTyping code={sampleCode} duration={1000} />
      </LiveOGTimeProvider>,
    )
    const content = screen.getByTestId('code-typing-content')
    expect(content.textContent).toBe('')
  })

  it('renders exactly half characters at 50% timeline position', () => {
    render(
      <LiveOGTimeProvider value={500}>
        <CodeTyping code={sampleCode} duration={1000} easing="linear" />
      </LiveOGTimeProvider>,
    )
    const content = screen.getByTestId('code-typing-content')
    expect(content.textContent).toBe(sampleCode.slice(0, Math.round(0.5 * sampleCode.length)))
    expect(content.textContent?.length).toBe(7)
  })

  it('renders all characters at 100% timeline position', () => {
    render(
      <LiveOGTimeProvider value={1000}>
        <CodeTyping code={sampleCode} duration={1000} easing="linear" />
      </LiveOGTimeProvider>,
    )
    const content = screen.getByTestId('code-typing-content')
    expect(content.textContent).toBe(sampleCode)
  })

  it('preserves syntax token styling across progressive slices', () => {
    const code = 'const answer = 42;'
    render(
      <LiveOGTimeProvider value={1000}>
        <CodeTyping code={code} language="typescript" duration={1000} />
      </LiveOGTimeProvider>,
    )
    const keyword = screen.getByText('const')
    expect(keyword.className).toContain('liveog-token-keyword')
    expect(keyword.style.color).toBeTruthy()

    const numberToken = screen.getByText('42')
    expect(numberToken.className).toContain('liveog-token-number')
  })

  it('honors delay before typing starts', () => {
    render(
      <LiveOGTimeProvider value={300}>
        <CodeTyping code={sampleCode} delay={500} duration={1000} easing="linear" />
      </LiveOGTimeProvider>,
    )
    expect(screen.getByTestId('code-typing-content').textContent).toBe('')
  })

  it('progresses after delay has elapsed', () => {
    render(
      <LiveOGTimeProvider value={1000}>
        <CodeTyping code={sampleCode} delay={500} duration={1000} easing="linear" />
      </LiveOGTimeProvider>,
    )
    expect(screen.getByTestId('code-typing-content').textContent?.length).toBe(
      Math.round(0.5 * sampleCode.length),
    )
  })

  it('computes deterministic cursor blinking strictly mathematically from time', () => {
    const { rerender } = render(
      <LiveOGTimeProvider value={0}>
        <CodeTyping code={sampleCode} cursorBlinkRate={500} />
      </LiveOGTimeProvider>,
    )
    const cursor = screen.getByTestId('liveog-cursor')
    expect(cursor.dataset.visible).toBe('true')
    expect(cursor.style.opacity).toBe('1')

    rerender(
      <LiveOGTimeProvider value={500}>
        <CodeTyping code={sampleCode} cursorBlinkRate={500} />
      </LiveOGTimeProvider>,
    )
    expect(cursor.dataset.visible).toBe('false')
    expect(cursor.style.opacity).toBe('0')

    rerender(
      <LiveOGTimeProvider value={1000}>
        <CodeTyping code={sampleCode} cursorBlinkRate={500} />
      </LiveOGTimeProvider>,
    )
    expect(cursor.dataset.visible).toBe('true')
    expect(cursor.style.opacity).toBe('1')
  })

  it('supports hiding cursor on complete', () => {
    const { rerender } = render(
      <LiveOGTimeProvider value={500}>
        <CodeTyping code={sampleCode} duration={1000} hideCursorOnComplete />
      </LiveOGTimeProvider>,
    )
    expect(screen.queryByTestId('liveog-cursor')).not.toBeNull()

    rerender(
      <LiveOGTimeProvider value={1000}>
        <CodeTyping code={sampleCode} duration={1000} hideCursorOnComplete />
      </LiveOGTimeProvider>,
    )
    expect(screen.queryByTestId('liveog-cursor')).toBeNull()
  })

  it('supports disabling cursor completely', () => {
    render(
      <LiveOGTimeProvider value={0}>
        <CodeTyping code={sampleCode} showCursor={false} />
      </LiveOGTimeProvider>,
    )
    expect(screen.queryByTestId('liveog-cursor')).toBeNull()
  })

  it('updates in standalone mode via liveog:time CustomEvent', () => {
    render(<CodeTyping code={sampleCode} duration={1000} easing="linear" />)
    expect(screen.getByTestId('code-typing-content').textContent).toBe('')

    emitTime(500)
    expect(screen.getByTestId('code-typing-content').textContent?.length).toBe(
      Math.round(0.5 * sampleCode.length),
    )

    emitTime(1000)
    expect(screen.getByTestId('code-typing-content').textContent).toBe(sampleCode)
  })

  it('updates in standalone mode via window message', () => {
    render(<CodeTyping code={sampleCode} duration={1000} easing="linear" />)
    expect(screen.getByTestId('code-typing-content').textContent).toBe('')

    postTime({ type: 'liveog:time', detail: 1000 })
    expect(screen.getByTestId('code-typing-content').textContent).toBe(sampleCode)
  })

  it('works via Typewriter alias and accepts text prop', () => {
    render(
      <LiveOGTimeProvider value={1000}>
        <Typewriter text="Hello world" duration={1000} />
      </LiveOGTimeProvider>,
    )
    expect(screen.getByTestId('code-typing-content').textContent).toBe('Hello world')
  })
})

describe('Sparkline', () => {
  const data = [10, 40, 20, 80, 50]
  const width = 300
  const height = 100
  const padding = 8
  const innerWidth = width - 2 * padding // 284

  it('renders deterministically at 0% timeline position', () => {
    render(
      <LiveOGTimeProvider value={0}>
        <Sparkline data={data} width={width} height={height} padding={padding} duration={1000} easing="linear" />
      </LiveOGTimeProvider>,
    )
    const path = screen.getByTestId('sparkline-path')
    expect(path.getAttribute('stroke-dashoffset') ?? path.getAttribute('strokeDashoffset')).toBe('1')

    const clipRect = screen.getByTestId('sparkline-clip-rect')
    expect(Number(clipRect.getAttribute('width'))).toBeCloseTo(padding, 2)

    const tip = screen.getByTestId('sparkline-tip')
    expect(Number(tip.getAttribute('cx'))).toBeCloseTo(padding, 2)
  })

  it('renders deterministically at 50% timeline position', () => {
    render(
      <LiveOGTimeProvider value={500}>
        <Sparkline data={data} width={width} height={height} padding={padding} duration={1000} easing="linear" />
      </LiveOGTimeProvider>,
    )
    const path = screen.getByTestId('sparkline-path')
    expect(path.getAttribute('stroke-dashoffset') ?? path.getAttribute('strokeDashoffset')).toBe('0.5')

    const clipRect = screen.getByTestId('sparkline-clip-rect')
    expect(Number(clipRect.getAttribute('width'))).toBeCloseTo(padding + 0.5 * innerWidth, 2)

    const tip = screen.getByTestId('sparkline-tip')
    expect(Number(tip.getAttribute('cx'))).toBeCloseTo(padding + 0.5 * innerWidth, 2)
  })

  it('renders deterministically at 100% timeline position', () => {
    render(
      <LiveOGTimeProvider value={1000}>
        <Sparkline data={data} width={width} height={height} padding={padding} duration={1000} easing="linear" />
      </LiveOGTimeProvider>,
    )
    const path = screen.getByTestId('sparkline-path')
    expect(path.getAttribute('stroke-dashoffset') ?? path.getAttribute('strokeDashoffset')).toBe('0')

    const clipRect = screen.getByTestId('sparkline-clip-rect')
    expect(Number(clipRect.getAttribute('width'))).toBeCloseTo(width - padding, 2)

    const tip = screen.getByTestId('sparkline-tip')
    expect(Number(tip.getAttribute('cx'))).toBeCloseTo(width - padding, 2)
  })

  it('honors delay before starting animation', () => {
    render(
      <LiveOGTimeProvider value={200}>
        <Sparkline data={data} delay={500} duration={1000} easing="linear" />
      </LiveOGTimeProvider>,
    )
    const path = screen.getByTestId('sparkline-path')
    expect(path.getAttribute('stroke-dashoffset') ?? path.getAttribute('strokeDashoffset')).toBe('1')
  })

  it('supports linear and smooth curve modes', () => {
    const { rerender } = render(
      <LiveOGTimeProvider value={1000}>
        <Sparkline data={data} curve="linear" />
      </LiveOGTimeProvider>,
    )
    const linearPath = screen.getByTestId('sparkline-path').getAttribute('d')
    expect(linearPath).toContain('L')
    expect(linearPath).not.toContain('C')

    rerender(
      <LiveOGTimeProvider value={1000}>
        <Sparkline data={data} curve="smooth" />
      </LiveOGTimeProvider>,
    )
    const smoothPath = screen.getByTestId('sparkline-path').getAttribute('d')
    expect(smoothPath).toContain('C')
  })

  it('renders area fill reveal with clipPath when fill is provided', () => {
    render(
      <LiveOGTimeProvider value={500}>
        <Sparkline data={data} fill="gradient" />
      </LiveOGTimeProvider>,
    )
    const fillPath = screen.getByTestId('sparkline-fill')
    expect(fillPath.getAttribute('clip-path') ?? fillPath.getAttribute('clipPath')).toContain('url(#liveog-sparkline-clip-')
  })

  it('allows hiding tip indicator dot', () => {
    render(
      <LiveOGTimeProvider value={500}>
        <Sparkline data={data} showTip={false} />
      </LiveOGTimeProvider>,
    )
    expect(screen.queryByTestId('sparkline-tip')).toBeNull()
  })

  it('updates in standalone mode via liveog:time CustomEvent', () => {
    render(<Sparkline data={data} duration={1000} easing="linear" />)
    const path = screen.getByTestId('sparkline-path')
    expect(path.getAttribute('stroke-dashoffset') ?? path.getAttribute('strokeDashoffset')).toBe('1')

    emitTime(500)
    expect(path.getAttribute('stroke-dashoffset') ?? path.getAttribute('strokeDashoffset')).toBe('0.5')
  })

  it('updates in standalone mode via window message', () => {
    render(<Sparkline data={data} duration={1000} easing="linear" />)
    const path = screen.getByTestId('sparkline-path')
    expect(path.getAttribute('stroke-dashoffset') ?? path.getAttribute('strokeDashoffset')).toBe('1')

    postTime({ type: 'liveog:time', detail: 1000 })
    expect(path.getAttribute('stroke-dashoffset') ?? path.getAttribute('strokeDashoffset')).toBe('0')
  })

  it('handles empty and single-point data gracefully', () => {
    const { rerender } = render(<Sparkline data={[]} />)
    expect(screen.getByTestId('sparkline')).toBeTruthy()

    rerender(<Sparkline data={[42]} />)
    expect(screen.getByTestId('sparkline')).toBeTruthy()
  })
})

describe('tokenizeCode', () => {
  it('tokenizes typescript keywords, strings, and numbers', () => {
    const code = 'const x: number = 42;'
    const tokens = tokenizeCode(code, 'typescript')
    expect(tokens.map((t) => t.text).join('')).toBe(code)
    expect(tokens.some((t) => t.type === 'keyword' && t.text === 'const')).toBe(true)
    expect(tokens.some((t) => t.type === 'number' && t.text === '42')).toBe(true)
  })

  it('tokenizes python keywords and comments', () => {
    const code = 'def hello(): # greet\n    return True'
    const tokens = tokenizeCode(code, 'python')
    expect(tokens.map((t) => t.text).join('')).toBe(code)
    expect(tokens.some((t) => t.type === 'keyword' && t.text === 'def')).toBe(true)
    expect(tokens.some((t) => t.type === 'comment' && t.text.includes('# greet'))).toBe(true)
    expect(tokens.some((t) => t.type === 'boolean' && t.text === 'True')).toBe(true)
  })

  it('tokenizes json properties and strings', () => {
    const code = '{\n  "title": "LiveOG"\n}'
    const tokens = tokenizeCode(code, 'json')
    expect(tokens.map((t) => t.text).join('')).toBe(code)
    expect(tokens.some((t) => t.type === 'property' && t.text === '"title"')).toBe(true)
    expect(tokens.some((t) => t.type === 'string' && t.text === '"LiveOG"')).toBe(true)
  })

  it('tokenizes bash commands and variables', () => {
    const code = 'echo $NAME # print'
    const tokens = tokenizeCode(code, 'bash')
    expect(tokens.map((t) => t.text).join('')).toBe(code)
    expect(tokens.some((t) => t.type === 'keyword' && t.text === 'echo')).toBe(true)
    expect(tokens.some((t) => t.type === 'variable' && t.text === '$NAME')).toBe(true)
  })
})

