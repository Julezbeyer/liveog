/**
 * Terminal progress output.
 *
 * Animation only happens on an interactive TTY. In CI or when piped to a file
 * the same steps print as plain lines, because carriage returns and spinner
 * frames turn into unreadable noise in a log.
 */

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const BAR_WIDTH = 24

const dim = (s: string) => `\u001b[2m${s}\u001b[0m`
const green = (s: string) => `\u001b[32m${s}\u001b[0m`
const bold = (s: string) => `\u001b[1m${s}\u001b[0m`

export interface Reporter {
  /** Begin a step. Replaces any running step. */
  start(label: string): void
  /** Update the active step with a 0..1 ratio. */
  progress(label: string, ratio: number): void
  /** Finish the active step with a green check. */
  done(label: string): void
  /** Print a line above the active step without disturbing it. */
  note(line: string): void
  /** Stop animating and restore the cursor. Safe to call twice. */
  stop(): void
}

function bar(ratio: number): string {
  const filled = Math.round(Math.min(Math.max(ratio, 0), 1) * BAR_WIDTH)
  return `${'█'.repeat(filled)}${dim('░'.repeat(BAR_WIDTH - filled))}`
}

/** Plain, non-animated output for CI, pipes and `--no-progress`. */
function plainReporter(out: NodeJS.WriteStream): Reporter {
  let last = ''
  return {
    start(label) {
      last = label
      out.write(`${label}\n`)
    },
    // Progress would be one line per frame in a log file, so it is dropped.
    progress() {},
    done(label) {
      if (label !== last) out.write(`${label}\n`)
      last = ''
    },
    note(line) {
      out.write(`${line}\n`)
    },
    stop() {},
  }
}

function ttyReporter(out: NodeJS.WriteStream): Reporter {
  let timer: NodeJS.Timeout | undefined
  let frame = 0
  let current = ''
  let suffix = ''
  let stopped = false

  const clear = () => out.write('\r\u001b[2K')
  const paint = () => {
    clear()
    out.write(`${green(FRAMES[frame % FRAMES.length]!)} ${current}${suffix}`)
  }

  const ensureTimer = () => {
    if (timer || stopped) return
    // unref so a pending spinner never keeps the process alive on its own.
    timer = setInterval(() => {
      frame++
      paint()
    }, 80)
    timer.unref?.()
  }

  return {
    start(label) {
      current = label
      suffix = ''
      ensureTimer()
      paint()
    },
    progress(label, ratio) {
      current = label
      suffix = `  ${bar(ratio)} ${dim(`${Math.round(ratio * 100)}%`)}`
      ensureTimer()
      paint()
    },
    done(label) {
      clear()
      out.write(`${green('✔')} ${label}\n`)
      suffix = ''
      current = ''
    },
    note(line) {
      clear()
      out.write(`${line}\n`)
      if (current) paint()
    },
    stop() {
      stopped = true
      if (timer) clearInterval(timer)
      timer = undefined
      clear()
      // Restore the cursor in case we were interrupted mid-spin.
      out.write('\u001b[?25h')
    },
  }
}

export function createReporter(options: { stream?: NodeJS.WriteStream; enabled?: boolean } = {}): Reporter {
  const out = options.stream ?? process.stderr
  const enabled = options.enabled ?? (out.isTTY === true && !process.env.CI)
  return enabled ? ttyReporter(out) : plainReporter(out)
}

export { bar as renderBar, bold }
