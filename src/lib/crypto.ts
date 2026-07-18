const enc = new TextEncoder()
const dec = new TextDecoder()

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// crypto.subtle wants ArrayBuffer-backed views; cast so older/newer TS DOM libs agree.
const bs = (u: Uint8Array): BufferSource => u as BufferSource

// Derive an AES-GCM key from a password + server salt (stable across the user's devices).
export async function deriveKey(password: string, saltB64: string): Promise<string> {
  const salt = bs(base64ToBytes(saltB64))
  const keyMat = await crypto.subtle.importKey('raw', bs(enc.encode(password)), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMat,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  return bytesToBase64(new Uint8Array(await crypto.subtle.exportKey('raw', key)))
}

async function importKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', bs(base64ToBytes(b64)), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

// AES-GCM with a random IV prefixed to the ciphertext.
export async function encrypt(keyB64: string, obj: unknown): Promise<string> {
  const key = await importKey(keyB64)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = bs(new Uint8Array(enc.encode(JSON.stringify(obj))))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(iv) }, key, data))
  const out = new Uint8Array(iv.length + ct.length)
  out.set(iv, 0)
  out.set(ct, iv.length)
  return bytesToBase64(out)
}

export async function decrypt(keyB64: string, b64: string): Promise<unknown> {
  const key = await importKey(keyB64)
  const buf = base64ToBytes(b64)
  const iv = bs(buf.slice(0, 12))
  const ct = bs(buf.slice(12))
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return JSON.parse(dec.decode(pt))
}

export function randomKey(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
}
