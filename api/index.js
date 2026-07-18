import http from 'node:http'
import app from '../server/index.js'

// Vercel invokes this as a Web Handler (Fluid compute): it passes a Web
// `Request` and expects a Web `Response`. Express expects Node's req/res, so we
// run the Express app on an ephemeral in-process HTTP server and proxy the Web
// request to it, then forward the response back as a Web `Response`. The server
// is started once per warm container and reused across invocations.

let listeningPromise = null

function ensureServer() {
  if (!listeningPromise) {
    listeningPromise = new Promise((resolve, reject) => {
      const server = http.createServer(app)
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        resolve({ server, port: server.address().port })
      })
    })
  }
  return listeningPromise
}

export default async function handler(request) {
  const { port } = await ensureServer()
  const url = new URL(request.url)
  const proxyUrl = `http://127.0.0.1:${port}${url.pathname}${url.search}`

  const init = {
    method: request.method,
    headers: request.headers,
    redirect: 'manual'
  }
  if (request.body && request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body
    init.duplex = 'half'
  }

  const upstream = await fetch(proxyUrl, init)

  const body = new Uint8Array(await upstream.arrayBuffer())
  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers
  })
}
