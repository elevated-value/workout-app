// Generates the PWA icon set from scratch (no image deps): a dark Nocturne-ground
// square with the Ledger accent bar mark. Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(OUT, { recursive: true })

const BG = [0x16, 0x18, 0x26]
const ACCENT = [0x91, 0x84, 0xd9]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}

function png(size) {
  // Draw: full-bleed BG, a centred accent bar (mark) at ~55% width, ~7% height.
  const barW = Math.round(size * 0.5)
  const barH = Math.max(2, Math.round(size * 0.07))
  const barX = Math.round((size - barW) / 2)
  const barY = Math.round((size - barH) / 2)

  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 3 + 1)
    raw[rowStart] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const inBar = x >= barX && x < barX + barW && y >= barY && y < barY + barH
      const [r, g, b] = inBar ? ACCENT : BG
      const p = rowStart + 1 + x * 3
      raw[p] = r
      raw[p + 1] = g
      raw[p + 2] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync(join(OUT, 'pwa-192.png'), png(192))
writeFileSync(join(OUT, 'pwa-512.png'), png(512))
writeFileSync(join(OUT, 'apple-touch-icon.png'), png(180))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#161826"/>
  <rect x="16" y="30" width="32" height="4" fill="#9184d9"/>
</svg>
`
writeFileSync(join(OUT, 'favicon.svg'), svg)

console.log('icons written to public/')
