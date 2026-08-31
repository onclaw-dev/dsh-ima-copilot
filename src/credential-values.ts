/** Remove harmless copy artifacts and validate a value used as an IMA HTTP header. */
export function normalizeImaHeaderCredential(value: string, label: string): string {
  // A BOM is commonly introduced when a credential is copied through an editor or
  // rich-text field. It is never meaningful in an HTTP authentication header.
  const normalized = value.replace(/\uFEFF/gu, '').trim()
  if (normalized.length === 0) {
    throw new Error(`ima_ask: ${label} is empty after removing formatting characters`)
  }
  let index = 0
  for (const character of normalized) {
    const codePoint = character.codePointAt(0)!
    if (codePoint > 0xff || codePoint < 0x20 || codePoint === 0x7f) {
      const code = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
      const guidance = codePoint === 0x2026
        ? 'the value appears truncated; copy the complete value again as plain text'
        : 'copy the complete value again as plain text'
      throw new Error(
        `ima_ask: ${label} contains unsupported HTTP header character ${code} at index ${index}; ${guidance}`,
      )
    }
    index += character.length
  }
  return normalized
}
