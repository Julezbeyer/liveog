import { describe, expect, it } from 'vitest'
import { createReporter, renderBar } from './reporter.js'

/** Minimal WriteStream stand-in that records everything written. */
function fakeStream(isTTY: boolean) {
  const chunks: string[] = []
  return {
    stream: { isTTY, write: (s: string) => { chunks.push(s); return true } } as unknown as NodeJS.WriteStream,
    text: () => chunks.join(''),
  }
}

describe('renderBar', () => {
  it('is empty at 0 and full at 1', () => {
    expect(renderBar(0)).not.toContain('█')
    expect(renderBar(1)).toContain('█')
    expect(renderBar(1)).not.toContain('░')
  })

  it('clamps out-of-range ratios instead of overflowing', () => {
    // A stage that reports 1.2 must not print a wider bar than a finished one.
    expect(renderBar(1.5)).toEqual(renderBar(1))
    expect(renderBar(-3)).toEqual(renderBar(0))
  })
})

describe('reporter', () => {
  it('writes plain lines without escape codes when not a TTY', () => {
    const { stream, text } = fakeStream(false)
    const reporter = createReporter({ stream })
    reporter.start('Starting browser')
    reporter.progress('Capturing frames 5/10', 0.5)
    reporter.done('Frames captured')
    reporter.stop()

    const output = text()
    expect(output).toContain('Starting browser')
    expect(output).toContain('Frames captured')
    // No cursor movement or colour in a log file.
    expect(output).not.toContain('\u001b[')
    expect(output).not.toContain('\r')
    // Per-frame progress would be one line per frame in a log.
    expect(output).not.toContain('5/10')
  })

  it('animates and restores the cursor on a TTY', () => {
    const { stream, text } = fakeStream(true)
    const reporter = createReporter({ stream })
    reporter.progress('Capturing frames 1/2', 0.5)
    reporter.done('Frames captured')
    reporter.stop()

    const output = text()
    expect(output).toContain('\r')
    expect(output).toContain('✔')
    // Cursor must come back even if we stopped mid-spin.
    expect(output).toContain('\u001b[?25h')
  })

  it('can be forced off even on a TTY', () => {
    const { stream, text } = fakeStream(true)
    const reporter = createReporter({ stream, enabled: false })
    reporter.progress('Capturing', 0.5)
    reporter.stop()
    expect(text()).not.toContain('\u001b[')
  })

  it('survives stop() being called twice', () => {
    const { stream } = fakeStream(true)
    const reporter = createReporter({ stream })
    reporter.start('x')
    reporter.stop()
    expect(() => reporter.stop()).not.toThrow()
  })
})
