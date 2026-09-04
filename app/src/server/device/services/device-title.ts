/** Matches firmware `ALERTS_TITLE_LEN` minus the NUL terminator. */
export const DEVICE_TITLE_MAX_BYTES = 95

function truncateUtf8Bytes(value: string, maxBytes: number): string {
  const bytes = new TextEncoder().encode(value)
  if (bytes.length <= maxBytes) return value
  let end = maxBytes
  while (end > 0) {
    const slice = bytes.subarray(0, end)
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(slice)
    } catch {
      end -= 1
    }
  }
  return ''
}

/**
 * Título no display: Basic Latin only (`lv_font_montserrat_*` built-in).
 * Folds PT-BR accents (NFD), strips emoji and anything outside U+0020–U+007E.
 */
export function sanitizeDeviceTitle(title: string): string {
  const folded = title.normalize('NFD').replace(/\p{M}/gu, '')
  let out = ''
  for (const char of folded) {
    const cp = char.codePointAt(0)
    if (cp === undefined || cp < 0x20 || cp > 0x7e) continue
    out += char
  }
  return truncateUtf8Bytes(out.replace(/\s+/g, ' ').trim(), DEVICE_TITLE_MAX_BYTES)
}
