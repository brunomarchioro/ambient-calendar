/** Matches firmware `ALERTS_TITLE_LEN` minus the NUL terminator. */
export const DEVICE_TITLE_MAX_BYTES = 95

function isDeviceTitleCodePoint(cp: number): boolean {
  if (cp < 0x20 || cp === 0x7f) return false
  if (cp >= 0x80 && cp <= 0x9f) return false
  return cp <= 0x7e || (cp >= 0xa0 && cp <= 0xff)
}

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

/** Latin-1 display charset for the ESP32 HMI (Montserrat); strips emoji and non-Latin-1. */
export function sanitizeDeviceTitle(title: string): string {
  let out = ''
  for (const char of title) {
    const cp = char.codePointAt(0)
    if (cp === undefined || !isDeviceTitleCodePoint(cp)) continue
    out += char
  }
  return truncateUtf8Bytes(out.replace(/\s+/g, ' ').trim(), DEVICE_TITLE_MAX_BYTES)
}
