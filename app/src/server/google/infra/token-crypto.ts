const IV_BYTES = 12

function decodeKey(keyB64: string): Uint8Array {
  const raw = atob(keyB64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  if (bytes.length !== 32) throw new Error('encryption_key_invalid')
  return bytes
}

async function importKey(keyB64: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey('raw', decodeKey(keyB64) as BufferSource, 'AES-GCM', false, usage)
}

function pack(iv: Uint8Array, cipher: ArrayBuffer): string {
  const merged = new Uint8Array(iv.length + cipher.byteLength)
  merged.set(iv, 0)
  merged.set(new Uint8Array(cipher), iv.length)
  return btoa(String.fromCharCode(...merged))
}

function unpack(blob: string): { iv: Uint8Array; cipher: ArrayBuffer } {
  const bytes = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0))
  return { iv: bytes.slice(0, IV_BYTES), cipher: bytes.slice(IV_BYTES).buffer }
}

export async function encryptSecret(plaintext: string, keyB64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await importKey(keyB64, ['encrypt'])
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  )
  return pack(iv, cipher)
}

export async function decryptSecret(blob: string, keyB64: string): Promise<string> {
  const { iv, cipher } = unpack(blob)
  const key = await importKey(keyB64, ['decrypt'])
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipher,
  )
  return new TextDecoder().decode(plain)
}
