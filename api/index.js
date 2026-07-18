import app from '../server/index.js'

// Vercel serverless function entry. Fluid compute is disabled in vercel.json,
// so Vercel runs this on the classic Node.js runtime and adapts the exported
// Express app to a Node request handler natively. Requests rewritten from
// /api/* (see vercel.json) reach `app`; Vercel's CDN serves the SPA.
export default app
