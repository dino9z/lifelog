import app from '../server/index.js'

// Vercel serverless function entry. The platform imports this module and routes
// requests (rewritten from /api/* in vercel.json) to the Express app.
export default app
