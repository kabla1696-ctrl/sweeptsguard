// SweepGuard v5.0 — Crypto Module
// PBKDF2 + AES-256-GCM encryption for private keys
// Same security model as zun's Antidrain extension

const SALT_LENGTH = 16
const IV_LENGTH = 12
const ITERATIONS = 100000

// Generate random bytes
function getRandomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length))
}

// Derive encryption key from password using PBKDF2
async function deriveKey(password, salt) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt plaintext with password
export async function encrypt(plaintext, password) {
  const salt = getRandomBytes(SALT_LENGTH)
  const iv = getRandomBytes(IV_LENGTH)
  const key = await deriveKey(password, salt)

  const encoder = new TextEncoder()
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )

  // Combine: salt + iv + ciphertext
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  result.set(salt, 0)
  result.set(iv, salt.length)
  result.set(new Uint8Array(encrypted), salt.length + iv.length)

  // Return as hex string
  return Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Decrypt ciphertext with password
export async function decrypt(ciphertextHex, password) {
  const data = new Uint8Array(
    ciphertextHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  )

  const salt = data.slice(0, SALT_LENGTH)
  const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const encrypted = data.slice(SALT_LENGTH + IV_LENGTH)

  const key = await deriveKey(password, salt)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  )

  return new TextDecoder().decode(decrypted)
}
