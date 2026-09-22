import { createServer } from 'node:http'
import handler from '../api/import'

/**
 * Runs the function locally so the playground can be developed against it
 * without deploying:
 *
 *     pnpm --filter @liveog/meta dev
 *     VITE_META_API=http://localhost:3131 pnpm --filter @liveog/web dev
 *
 * It is a thin Node-to-Web adapter, nothing more. Vercel does this part for us
 * in production, which is why the handler itself speaks `Request`/`Response`.
 */
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

  handler(new Request(url, { method: req.method, headers }))
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
