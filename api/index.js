import http from 'node:http'
import { EventEmitter } from 'node:events'

// Vercel invokes this `api/` function as a Web Handler (Fluid compute): it
// passes a Web `Request` and expects a Web `Response`. We adapt the Web
// `Request` into a Node IncomingMessage, run it through the Express app, and
// the Vercel-only middleware in server/index.js captures the response body
// (overriding res.end) so we can return it as a Web `Response`. No listening
// socket is involved.
//
// Routing note: the vercel.json rewrite sends "/api/<path>" to "/api" (the
// function), carrying the original sub-path in the `__orig` query param, since
// Vercel rewrites strip the path. We reconstruct the logical path here.

let appPromise = null
function getApp() {
  if (!appPromise) appPromise = import('../server/index.js').then((m) => m.default)
  return appPromise
}

function toNodeRequest(webReq, bodyBuf, logicalPath) {
  const url = new URL(webReq.url)
  const headers = {}
  for (const [k, v] of webReq.headers) headers[k.toLowerCase()] = v

  const socket = new EventEmitter()
  socket.remoteAddress = '127.0.0.1'
  socket.remoteFamily = 'IPv4'
  socket.encrypted = url.protocol === 'https:'
  socket.writable = true
  socket.readable = true
  socket.connecting = false
  socket.destroy = () => {
    socket.emit('close')
    return socket
  }
  socket.setTimeout = () => socket
  socket.pause = () => socket
  socket.resume = () => socket
  socket.on('error', () => {})

  const req = new http.IncomingMessage(socket)
  req.on('error', () => {})
  req.method = webReq.method
  req.url = logicalPath
  req.headers = headers
  req.socket = socket
  req.connection = socket

  if (bodyBuf) req.push(bodyBuf)
  req.push(null)

  // Pre-parse the body so express.json (body-parser) skips reading the
  // manually-fed stream. body-parser bails out when req._body is already set.
  if (bodyBuf) {
    const ct = webReq.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      try {
        req.body = JSON.parse(bodyBuf.toString('utf8'))
      } catch {
        req.body = {}
      }
    } else {
      req.body = bodyBuf.toString('utf8')
    }
    req._body = true
  }

  return req
}

export default async function handler(webReq) {
  const u = new URL(webReq.url)
  const orig = u.searchParams.get('__orig')
  const search = u.search.replace(/[?&]?__orig=[^&]*/g, '')
  const logicalPath = (orig ? '/api/' + orig : u.pathname) + search

  // Health is DB-free so it always proves the function runs (and isolates DB issues).
  if (logicalPath === '/api/health') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  }
  try {
    const app = await getApp()

    let bodyBuf = null
    if (webReq.body && webReq.method !== 'GET' && webReq.method !== 'HEAD') {
      bodyBuf = Buffer.from(await webReq.arrayBuffer())
    }

    const req = toNodeRequest(webReq, bodyBuf, logicalPath)
    const res = new http.ServerResponse(req)
    res.on('error', () => {})

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        try {
          res.end(JSON.stringify({ error: 'handler_timeout' }))
        } catch {
          resolve()
        }
      }, 9000)
      res.on('finish', () => {
        clearTimeout(timer)
        resolve()
      })
      res.on('close', () => {
        clearTimeout(timer)
        resolve()
      })
      try {
        app(req, res)
      } catch (e) {
        clearTimeout(timer)
        reject(e)
      }
    })

    const status = res.statusCode || 200
    const outHeaders = new Headers()
    const raw = res.getHeaders()
    for (const [k, v] of Object.entries(raw)) {
      const lk = k.toLowerCase()
      if (lk === 'set-cookie' || Array.isArray(v)) {
        const arr = Array.isArray(v) ? v : [v]
        for (const val of arr) outHeaders.append(lk, val)
      } else {
        outHeaders.set(lk, String(v))
      }
    }

    const body = Buffer.concat(res.__chunks || [])
    return new Response(new Uint8Array(body), { status, headers: outHeaders })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'handler_failed', message: e.message, stack: e.stack }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    )
  }
}
