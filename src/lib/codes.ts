// Erzeugt einen kurzen, gut lesbaren Beitritts-Code.
// Verwechslungsgefährdete Zeichen (0/O, 1/I/L) sind bewusst weggelassen.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateJoinCode(length = 6): string {
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return code
}

export function normalizeJoinCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '')
}
