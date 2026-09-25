import { createServer } from 'node:http'
import { GET, OPTIONS } from '../api/import.js'

/**
 * Runs the function locally so the playground can be developed against it
 * without deploying:
 *
 *     pnpm --filter @liveog/meta dev
 *     VITE_META_API=http://localhost:3131 pnpm --filter @liveog/web dev
 *
 * It is a thin Node-to-Web adapter, nothing more. Vercel does this part for us
 * in production, which is why the handler itself speaks `Request`/`Response`.
 *
 * It is NOT proof the function runs on Vercel: this adapter is more forgiving
 * than the platform (it resolved extensionless imports and would have happily
 * called a default export with a Web Request). Check a real deployment.
 */
const handlers: Record<string, (request: Request) => Response | Promise<Response>> = { GET, OPTIONS }
const port = Number(process.env.PORT ?? 3131)

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `localhost:${port}`}`)

  if (!url.pathname.startsWith('/api/import')) {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('Only /api/import is served here.\n')
    return
  }

  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(name, value)
  }

  const handler = handlers[req.method ?? 'GET']
  if (!handler) {
    res.writeHead(405, { allow: Object.keys(handlers).join(', ') })
    res.end()
    return
  }

  Promise.resolve(handler(new Request(url, { method: req.method, headers })))
    .then(async response => {
      res.writeHead(response.status, Object.fromEntries(response.headers))
      res.end(Buffer.from(await response.arrayBuffer()))
    })
    .catch(error => {
      console.error(error)
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'Local dev server failed. See the terminal.' }))
    })
})

server.listen(port, () => {
  console.log(`liveog importer listening on http://localhost:${port}/api/import?url=example.com`)
})
