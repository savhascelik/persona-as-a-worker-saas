import crypto from "crypto"

const ALGORITHM = "aes-256-cbc"
// Standard static key fallback if process.env.ENCRYPTION_SECRET is not configured during hackathon
const DEFAULT_SECRET = "hackathon-secret-key-32-bytes-abc" 

function getSecretKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || DEFAULT_SECRET
  // Ensure the key is exactly 32 bytes for aes-256-cbc
  return crypto.createHash("sha256").update(secret).digest()
}

/**
 * Encrypts sensitive credentials (like API keys/tokens) using AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return ""
  try {
    const iv = crypto.randomBytes(16)
    const key = getSecretKey()
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    return `${iv.toString("hex")}:${encrypted}`
  } catch (err) {
    console.error("[Crypto Encrypt Error]:", err)
    return text
  }
}

/**
 * Decrypts sensitive credentials, or returns plain text if not in encrypted format (backward compatibility)
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ""
  try {
    if (!encryptedText.includes(":")) {
      // Return plain text if not in our encrypted format (backward compatibility)
      return encryptedText
    }
    const [ivHex, encrypted] = encryptedText.split(":")
    const iv = Buffer.from(ivHex, "hex")
    const key = getSecretKey()
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  } catch (err) {
    console.error("[Crypto Decrypt Error]:", err)
    return encryptedText
  }
}
