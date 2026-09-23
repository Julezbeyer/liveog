import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { createPreviewServer } from './server'

function runCli(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolvePromise) => {
    const cliPath = resolve(__dirname, 'index.ts')
    const tsxBin = resolve(__dirname, '../node_modules/.bin/tsx')
    const child = spawn(tsxBin, [cliPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.once('error', (err) => {
      resolvePromise({ code: -1, stdout, stderr: err.message })
    })
    child.once('exit', (code) => {
      resolvePromise({ code, stdout, stderr })
    })
  })
}

describe('createPreviewServer', () => {
  it('starts on ephemeral port 0 and serves the preview HTML UI', async () => {
    const server = await createPreviewServer({
      url: 'http://localhost:5173',
      port: 0,
      width: 1200,
      height: 630,
      duration: 3000,
      fps: 30,
    })

    try {
      expect(server.port).toBeGreaterThan(0)
      expect(server.url).toBe(`http://localhost:${server.port}`)

      // Assert HTTP GET / returns 200 with text/html
      const response = await fetch(server.url)
      expect(response.status).toBe(200)
      const contentType = response.headers.get('content-type')
      expect(contentType).toContain('text/html')

      const html = await response.text()

      // Assert HTML contains iframe embedding target card URL
      expect(html).toContain('<iframe')
      expect(html).toContain('id="card-frame"')
      expect(html).toContain('http://localhost:5173')

      // Assert HTML contains interactive timeline scrubber slider (0..duration)
      expect(html).toContain('id="scrubber"')
      expect(html).toContain('type="range"')
      expect(html).toContain('max="3000"')

      // Assert HTML contains Play/Pause toggle button
      expect(html).toContain('id="play-pause-btn"')
      expect(html).toContain('Play')

      // Assert HTML contains frame step backward and forward buttons
      expect(html).toContain('id="step-back-btn"')
      expect(html).toContain('id="step-forward-btn"')

      // Assert HTML contains playback speed adjustment select
      expect(html).toContain('id="speed-select"')
      expect(html).toContain('value="0.25"')
      expect(html).toContain('value="0.5"')
      expect(html).toContain('value="1"')
      expect(html).toContain('value="1.5"')
      expect(html).toContain('value="2"')

      // Assert HTML contains time and frame readouts
      expect(html).toContain('id="time-display"')
      expect(html).toContain('id="frame-display"')

      // Assert HTML contains responsive stage scaling container
      expect(html).toContain('id="stage-container"')
      expect(html).toContain('id="stage-scaler"')

      // Assert HTML contains timeline driver logic (postMessage & dispatchEvent)
      expect(html).toContain('liveog:time')
      expect(html).toContain('postMessage')
      expect(html).toContain('dispatchEvent')

      // Assert HTML contains keyboard shortcut listeners
      expect(html).toContain('Space')
      expect(html).toContain('ArrowLeft')
      expect(html).toContain('ArrowRight')
    } finally {
      await server.close()
    }
  })

  it('serves /api/config with json configuration', async () => {
    const server = await createPreviewServer({
      url: 'http://localhost:8000/card',
      port: 0,
      width: 800,
      height: 400,
      duration: 5000,
      fps: 60,
    })

    try {
      const response = await fetch(`${server.url}/api/config`)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('application/json')

      const config = await response.json()
      expect(config).toEqual({
        url: 'http://localhost:8000/card',
        width: 800,
        height: 400,
        duration: 5000,
        fps: 60,
        port: server.port,
      })
    } finally {
      await server.close()
    }
  })

  it('serves /favicon.svg with svg content type', async () => {
    const server = await createPreviewServer({
      url: 'http://localhost:5173',
      port: 0,
    })

    try {
      const response = await fetch(`${server.url}/favicon.svg`)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('image/svg+xml')
      const svg = await response.text()
      expect(svg).toContain('<svg')
    } finally {
      await server.close()
    }
  })

  it('returns 404 for unknown endpoints', async () => {
    const server = await createPreviewServer({
      url: 'http://localhost:5173',
      port: 0,
    })

    try {
      const response = await fetch(`${server.url}/not-found-page`)
      expect(response.status).toBe(404)
    } finally {
      await server.close()
    }
  })

  it('handles dynamic port allocation if requested port is in use (EADDRINUSE)', async () => {
    // Start first server on an ephemeral port to discover an available port number
    const baseServer = await createPreviewServer({
      url: 'http://localhost:5173',
      port: 0,
    })
    const basePort = baseServer.port

    try {
      // Start second server requesting the EXACT port that baseServer is holding
      const collidingServer = await createPreviewServer({
        url: 'http://localhost:5173',
        port: basePort,
      })

      try {
        // Colliding server should dynamically allocate the next available port
        expect(collidingServer.port).not.toBe(basePort)
        expect(collidingServer.port).toBeGreaterThanOrEqual(basePort + 1)

        const res1 = await fetch(baseServer.url)
        expect(res1.status).toBe(200)

        const res2 = await fetch(collidingServer.url)
        expect(res2.status).toBe(200)
      } finally {
        await collidingServer.close()
      }
    } finally {
      await baseServer.close()
    }
  })

  it('cleans up server connections and closes successfully', async () => {
    const server = await createPreviewServer({
      url: 'http://localhost:5173',
      port: 0,
    })

    const initialFetch = await fetch(server.url)
    expect(initialFetch.status).toBe(200)

    await server.close()

    // After closing, connecting should fail
    await expect(fetch(server.url)).rejects.toThrow()
  })

  it('escapes script tags in __LIVEOG_CONFIG__ to prevent HTML breakout', async () => {
    const maliciousUrl = 'http://localhost:5173/</script><script>alert("xss")</script>'
    const server = await createPreviewServer({
      url: maliciousUrl,
      port: 0,
    })

    try {
      const res = await fetch(server.url)
      expect(res.status).toBe(200)
      const html = await res.text()
      // Raw </script> inside the JSON config script tag must not exist
      expect(html).not.toContain('</script><script>alert("xss")</script>')
      expect(html).toContain('\\u003c/script>')
    } finally {
      await server.close()
    }
  })

  it('handles open: true gracefully without throwing or crashing when opener binary is absent', async () => {
    const server = await createPreviewServer({
      url: 'http://localhost:5173',
      port: 0,
      open: true,
    })

    try {
      expect(server.port).toBeGreaterThan(0)
      const res = await fetch(server.url)
      expect(res.status).toBe(200)
    } finally {
      await server.close()
    }
  })
})

describe('CLI Preview & Dev Command Dispatching', () => {
  it('displays preview and dev in USAGE on --help', async () => {
    const { code, stdout } = await runCli(['--help'])
    expect(code).toBe(0)
    expect(stdout).toContain('liveog preview')
    expect(stdout).toContain('liveog dev')
    expect(stdout).toContain('-p, --port')
    expect(stdout).toContain('--host')
    expect(stdout).toContain('-o, --open')
  })

  it('fails with unknown command error when given unrecognized command', async () => {
    const { code, stderr } = await runCli(['foobar'])
    expect(code).toBe(1)
    expect(stderr).toContain('Unknown command "foobar"')
    expect(stderr).toContain('liveog preview')
  })

  it('validates invalid port on CLI preview command', async () => {
    const { code, stderr } = await runCli(['preview', '--port', 'invalid_port'])
    expect(code).toBe(1)
    expect(stderr).toContain('--port must be an integer between 0 and 65535')
  })

  it('validates out-of-range port on CLI preview command', async () => {
    const { code, stderr } = await runCli(['preview', '--port', '70000'])
    expect(code).toBe(1)
    expect(stderr).toContain('--port must be an integer between 0 and 65535')
  })

  it('spawns preview server via CLI and prints local url', async () => {
    const cliPath = resolve(__dirname, 'index.ts')
    const tsxBin = resolve(__dirname, '../node_modules/.bin/tsx')
    const child = spawn(tsxBin, [cliPath, 'preview', '--port', '0', '--no-config'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    let stdout = ''
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(() => {
        child.kill()
        rejectPromise(new Error('CLI preview start timeout: ' + stdout))
      }, 7000)

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString()
        if (stdout.includes('Local:') && stdout.includes('Card:    http://localhost:5173')) {
          clearTimeout(timeout)
          child.kill('SIGINT')
          resolvePromise()
        }
      })

      child.on('error', (err) => {
        clearTimeout(timeout)
        rejectPromise(err)
      })
    })

    expect(stdout).toContain('LiveOG Preview Server running at:')
    expect(stdout).toContain('Local:')
    expect(stdout).toContain('Card:    http://localhost:5173')
  })

  it('spawns dev alias via CLI and prints local url', async () => {
    const cliPath = resolve(__dirname, 'index.ts')
    const tsxBin = resolve(__dirname, '../node_modules/.bin/tsx')
    const child = spawn(tsxBin, [cliPath, 'dev', '--port', '0', '--no-config'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    let stdout = ''
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(() => {
        child.kill()
        rejectPromise(new Error('CLI dev start timeout: ' + stdout))
      }, 7000)

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString()
        if (stdout.includes('Local:') && stdout.includes('Card:    http://localhost:5173')) {
          clearTimeout(timeout)
          child.kill('SIGINT')
          resolvePromise()
        }
      })

      child.on('error', (err) => {
        clearTimeout(timeout)
        rejectPromise(err)
      })
    })

    expect(stdout).toContain('LiveOG Preview Server running at:')
    expect(stdout).toContain('Local:')
  })
})
