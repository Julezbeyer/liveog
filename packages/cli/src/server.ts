import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import type { Socket } from 'node:net'
import { spawn } from 'node:child_process'

export interface PreviewServerOptions {
  url?: string
  cardUrl?: string
  port?: number
  host?: string
  open?: boolean
  duration?: number
  fps?: number
  width?: number
  height?: number
}

export interface PreviewServerInstance {
  server: Server
  port: number
  url: string
  options: PreviewServerOptions
  close(): Promise<void>
}

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 630
const DEFAULT_DURATION = 4000
const DEFAULT_FPS = 30
const DEFAULT_PORT = 3000
const DEFAULT_HOST = 'localhost'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function openBrowser(targetUrl: string): void {
  const platform = process.platform
  let cmd = ''
  let args: string[] = []
  if (platform === 'darwin') {
    cmd = 'open'
    args = [targetUrl]
  } else if (platform === 'win32') {
    cmd = 'cmd.exe'
    args = ['/c', 'start', '""', targetUrl]
  } else {
    cmd = 'xdg-open'
    args = [targetUrl]
  }
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true })
    child.on('error', () => {
      // Safely ignore missing opener binary or launch errors in headless/CI environments
    })
    child.unref()
  } catch {
    // Ignore synchronous launch errors
  }
}

function renderHtml(config: {
  url: string
  width: number
  height: number
  duration: number
  fps: number
  port: number
}): string {
  const { url, width, height, duration, fps, port } = config
  const frameCount = Math.max(1, Math.ceil((duration / 1000) * fps))
  const initialDurationStr = (duration / 1000).toFixed(2).padStart(5, '0') + 's'
  const escapedUrl = escapeHtml(url)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LiveOG Preview</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    :root {
      --bg: #090a0f;
      --card-bg: #13151b;
      --panel-bg: #181a22;
      --border: #262935;
      --border-focus: #3b82f6;
      --text: #e2e8f0;
      --text-muted: #8b949e;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --accent-active: #1d4ed8;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      user-select: none;
    }
    header {
      height: 48px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-size: 13px;
    }
    .logo-group {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      border-radius: 4px;
      color: #fff;
      font-size: 11px;
      font-weight: bold;
    }
    .meta-group {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 12px;
    }
    .meta-tag {
      background: var(--panel-bg);
      border: 1px solid var(--border);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .card-url-link {
      color: var(--text-muted);
      text-decoration: none;
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-url-link:hover {
      color: var(--accent);
      text-decoration: underline;
    }
    #stage-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 24px;
      background: radial-gradient(circle at center, #141721 0%, #090a0f 100%);
    }
    #stage-scaler {
      width: ${width}px;
      height: ${height}px;
      transform-origin: center center;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: #000;
      transition: transform 0.05s ease-out;
    }
    #card-frame {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: #000;
    }
    footer {
      background: var(--card-bg);
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 12px 20px 16px;
      gap: 10px;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
    }
    .scrubber-row {
      display: flex;
      align-items: center;
      width: 100%;
    }
    #scrubber {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 8px;
      background: var(--panel-bg);
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      border: 1px solid var(--border);
    }
    #scrubber::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
      transition: transform 0.1s ease;
    }
    #scrubber::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    #scrubber::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
      transition: transform 0.1s ease;
    }
    #scrubber::-moz-range-thumb:hover {
      transform: scale(1.2);
    }
    .controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .button-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    button {
      background: var(--panel-bg);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s ease;
      min-height: 32px;
    }
    button:hover {
      background: var(--border);
      border-color: #3b82f6;
    }
    button:active {
      transform: translateY(1px);
    }
    #play-pause-btn {
      min-width: 88px;
      background: #2563eb;
      border-color: #3b82f6;
      color: #fff;
    }
    #play-pause-btn:hover {
      background: #1d4ed8;
    }
    #play-pause-btn.playing {
      background: var(--panel-bg);
      border-color: var(--border);
      color: var(--text);
    }
    #play-pause-btn.playing:hover {
      background: var(--border);
      border-color: #3b82f6;
    }
    .readouts-group {
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--text);
    }
    #time-display {
      min-width: 140px;
      color: #93c5fd;
    }
    #frame-display {
      min-width: 110px;
      color: var(--text-muted);
    }
    .options-group {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
    }
    select {
      background: var(--panel-bg);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 13px;
      cursor: pointer;
      outline: none;
    }
    select:focus {
      border-color: var(--border-focus);
    }
    .loop-label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      color: var(--text-muted);
    }
    .loop-label input {
      accent-color: #3b82f6;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo-group">
      <span class="logo-badge">OG</span>
      <span>LiveOG Preview</span>
    </div>
    <div class="meta-group">
      <span class="meta-tag">${width} &times; ${height}</span>
      <span class="meta-tag">${fps} fps</span>
      <a class="card-url-link" href="${escapedUrl}" target="_blank" rel="noopener noreferrer" title="${escapedUrl}">${escapedUrl}</a>
    </div>
  </header>

  <main id="stage-container">
    <div id="stage-scaler">
      <iframe
        id="card-frame"
        src="${escapedUrl}"
        width="${width}"
        height="${height}"
        title="LiveOG Card Preview"
        allow="autoplay"
      ></iframe>
    </div>
  </main>

  <footer>
    <div class="scrubber-row">
      <input
        type="range"
        id="scrubber"
        min="0"
        max="${duration}"
        value="0"
        step="1"
        aria-label="Timeline scrubber"
      />
    </div>
    <div class="controls-row">
      <div class="button-group">
        <button id="jump-start-btn" aria-label="Jump to start" title="Jump to start (Home)">⏮</button>
        <button id="step-back-btn" aria-label="Step backward" title="Previous frame (Left Arrow)">◀</button>
        <button id="play-pause-btn" aria-label="Play or pause animation" title="Play / Pause (Space)">▶ Play</button>
        <button id="step-forward-btn" aria-label="Step forward" title="Next frame (Right Arrow)">▶</button>
        <button id="jump-end-btn" aria-label="Jump to end" title="Jump to end (End)">⏭</button>
      </div>

      <div class="readouts-group">
        <span id="time-display">00.00s / ${initialDurationStr}</span>
        <span id="frame-display">Frame 1 / ${frameCount}</span>
      </div>

      <div class="options-group">
        <label for="speed-select">Speed:</label>
        <select id="speed-select" aria-label="Playback speed">
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="1" selected>1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
        <label class="loop-label" for="loop-toggle">
          <input type="checkbox" id="loop-toggle" checked />
          Loop
        </label>
      </div>
    </div>
  </footer>

  <script id="__LIVEOG_CONFIG__" type="application/json">
    ${JSON.stringify({ url, width, height, duration, fps, port }).replace(/</g, '\\u003c')}
  </script>

  <script>
    (function () {
      const configElement = document.getElementById('__LIVEOG_CONFIG__');
      const config = JSON.parse(configElement.textContent || '{}');
      const duration = config.duration || 4000;
      const fps = config.fps || 30;
      const frameCount = Math.max(1, Math.ceil((duration / 1000) * fps));
      const stepMs = Math.round(1000 / fps);

      let currentTime = 0;
      let isPlaying = false;
      let playbackSpeed = 1.0;
      let loop = true;
      let lastRafTime = null;
      let holdUntil = null;

      const iframe = document.getElementById('card-frame');
      const scrubber = document.getElementById('scrubber');
      const playPauseBtn = document.getElementById('play-pause-btn');
      const stepBackBtn = document.getElementById('step-back-btn');
      const stepForwardBtn = document.getElementById('step-forward-btn');
      const jumpStartBtn = document.getElementById('jump-start-btn');
      const jumpEndBtn = document.getElementById('jump-end-btn');
      const speedSelect = document.getElementById('speed-select');
      const timeDisplay = document.getElementById('time-display');
      const frameDisplay = document.getElementById('frame-display');
      const loopToggle = document.getElementById('loop-toggle');

      function formatTime(ms) {
        const sec = ms / 1000;
        return sec.toFixed(2).padStart(5, '0') + 's';
      }

      function getFrameNumber(ms) {
        return Math.min(frameCount, Math.floor((ms / 1000) * fps) + 1);
      }

      function updateUI() {
        scrubber.value = Math.round(currentTime);
        timeDisplay.textContent = formatTime(currentTime) + ' / ' + formatTime(duration);
        frameDisplay.textContent = 'Frame ' + getFrameNumber(currentTime) + ' / ' + frameCount;
        playPauseBtn.textContent = isPlaying ? '❚❚ Pause' : '▶ Play';
        playPauseBtn.classList.toggle('playing', isPlaying);
      }

      function dispatchTime(t) {
        const clamped = Math.max(0, Math.min(duration, t));
        // 1. Cross-origin safe postMessage
        try {
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'liveog:time', detail: clamped, time: clamped }, '*');
          }
        } catch (_) {}

        // 2. Direct CustomEvent for same-origin
        try {
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.dispatchEvent(new CustomEvent('liveog:time', { detail: clamped }));
          }
        } catch (_) {}
      }

      function setTime(t, pausePlayback) {
        if (pausePlayback) {
          pause();
        }
        currentTime = Math.max(0, Math.min(duration, t));
        updateUI();
        dispatchTime(currentTime);
      }

      function play() {
        if (isPlaying) return;
        if (currentTime >= duration) {
          currentTime = 0;
        }
        isPlaying = true;
        lastRafTime = performance.now();
        holdUntil = null;
        updateUI();
        requestAnimationFrame(tick);
      }

      function pause() {
        isPlaying = false;
        lastRafTime = null;
        holdUntil = null;
        updateUI();
      }

      function togglePlay() {
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      }

      function tick(now) {
        if (!isPlaying) return;
        if (lastRafTime === null) {
          lastRafTime = now;
        }
        const delta = (now - lastRafTime) * playbackSpeed;
        lastRafTime = now;

        if (holdUntil !== null) {
          if (now >= holdUntil) {
            holdUntil = null;
            currentTime = 0;
            updateUI();
            dispatchTime(currentTime);
          }
          requestAnimationFrame(tick);
          return;
        }

        currentTime += delta;
        if (currentTime >= duration) {
          currentTime = duration;
          updateUI();
          dispatchTime(currentTime);
          if (loop) {
            holdUntil = now + 400;
            requestAnimationFrame(tick);
            return;
          } else {
            pause();
            return;
          }
        }

        updateUI();
        dispatchTime(currentTime);
        requestAnimationFrame(tick);
      }

      // Scrubber interaction
      scrubber.addEventListener('input', function (e) {
        setTime(Number(e.target.value), true);
      });

      // Buttons
      playPauseBtn.addEventListener('click', togglePlay);

      stepBackBtn.addEventListener('click', function () {
        setTime(currentTime - stepMs, true);
      });

      stepForwardBtn.addEventListener('click', function () {
        setTime(currentTime + stepMs, true);
      });

      if (jumpStartBtn) {
        jumpStartBtn.addEventListener('click', function () {
          setTime(0, true);
        });
      }

      if (jumpEndBtn) {
        jumpEndBtn.addEventListener('click', function () {
          setTime(duration, true);
        });
      }

      // Speed selection
      speedSelect.addEventListener('change', function (e) {
        playbackSpeed = parseFloat(e.target.value) || 1.0;
      });

      // Loop toggle
      if (loopToggle) {
        loopToggle.addEventListener('change', function (e) {
          loop = e.target.checked;
        });
      }

      // Keyboard shortcuts
      window.addEventListener('keydown', function (e) {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' && e.target.type !== 'range') return;
        if (tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (e.code === 'Space') {
          e.preventDefault();
          togglePlay();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          setTime(currentTime - stepMs, true);
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          setTime(currentTime + stepMs, true);
        } else if (e.code === 'Home') {
          e.preventDefault();
          setTime(0, true);
        } else if (e.code === 'End') {
          e.preventDefault();
          setTime(duration, true);
        }
      });

      // Dispatch initial frame on load
      iframe.addEventListener('load', function () {
        dispatchTime(currentTime);
      });

      // Responsive Stage Scaling
      function updateScale() {
        const container = document.getElementById('stage-container');
        const scaler = document.getElementById('stage-scaler');
        if (!container || !scaler) return;
        const padding = 32;
        const availW = Math.max(100, container.clientWidth - padding);
        const availH = Math.max(100, container.clientHeight - padding);
        const scale = Math.min(1, availW / config.width, availH / config.height);
        scaler.style.transform = 'scale(' + scale + ')';
      }

      window.addEventListener('resize', updateScale);
      updateScale();
      updateUI();
      dispatchTime(0);
    })();
  </script>
</body>
</html>`
}

export function createPreviewServer(options: PreviewServerOptions): Promise<PreviewServerInstance> {
  const targetUrl = options.url ?? options.cardUrl ?? 'http://localhost:5173'
  const width = options.width ?? DEFAULT_WIDTH
  const height = options.height ?? DEFAULT_HEIGHT
  const duration = options.duration ?? DEFAULT_DURATION
  const fps = options.fps ?? DEFAULT_FPS
  const host = options.host ?? DEFAULT_HOST
  const initialPort = options.port !== undefined ? options.port : DEFAULT_PORT

  return new Promise<PreviewServerInstance>((resolve, reject) => {
    let currentPort = initialPort
    const maxAttempts = initialPort === 0 ? 1 : 50
    let attempts = 0

    function tryListen(portToTry: number) {
      attempts++
      const openSockets = new Set<Socket>()

      const server = createServer((req: IncomingMessage, res: ServerResponse) => {
        const reqUrl = req.url || '/'
        const [pathname] = reqUrl.split('?')

        if (pathname === '/' || pathname === '/index.html') {
          const addr = server.address()
          const boundPort = typeof addr === 'object' && addr !== null ? addr.port : portToTry
          const html = renderHtml({
            url: targetUrl,
            width,
            height,
            duration,
            fps,
            port: boundPort,
          })
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
          })
          res.end(html)
          return
        }

        if (pathname === '/api/config') {
          const addr = server.address()
          const boundPort = typeof addr === 'object' && addr !== null ? addr.port : portToTry
          const data = JSON.stringify({
            url: targetUrl,
            width,
            height,
            duration,
            fps,
            port: boundPort,
          })
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache',
          })
          res.end(data)
          return
        }

        if (pathname === '/favicon.svg') {
          const svg =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
            '<circle cx="50" cy="50" r="45" fill="#3b82f6"/>' +
            '<polygon points="40,30 70,50 40,70" fill="#ffffff"/>' +
            '</svg>'
          res.writeHead(200, { 'Content-Type': 'image/svg+xml' })
          res.end(svg)
          return
        }

        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Not Found')
      })

      server.on('connection', (socket: Socket) => {
        openSockets.add(socket)
        socket.once('close', () => openSockets.delete(socket))
      })

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && initialPort !== 0 && attempts < maxAttempts) {
          server.close(() => {})
          tryListen(portToTry + 1)
        } else {
          reject(err)
        }
      })

      server.listen(portToTry, host, () => {
        const addr = server.address()
        const boundPort = typeof addr === 'object' && addr !== null ? addr.port : portToTry
        const boundHost = host === '0.0.0.0' ? 'localhost' : host
        const previewUrl = `http://${boundHost}:${boundPort}`

        if (options.open) {
          openBrowser(previewUrl)
        }

        const instance: PreviewServerInstance = {
          server,
          port: boundPort,
          url: previewUrl,
          options,
          close: () =>
            new Promise<void>((resolveClose, rejectClose) => {
              for (const socket of openSockets) {
                socket.destroy()
              }
              openSockets.clear()
              server.close((closeErr) => {
                if (closeErr) rejectClose(closeErr)
                else resolveClose()
              })
            }),
        }

        resolve(instance)
      })
    }

    tryListen(currentPort)
  })
}
