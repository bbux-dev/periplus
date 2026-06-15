#!/usr/bin/env node
/**
 * generate-pwa-icons.mjs
 *
 * Generates minimal valid PNG files for the PWA manifest icons.
 * Uses only Node built-ins (zlib, fs, Buffer) — no npm deps required.
 * Output: public/pwa-192x192.png and public/pwa-512x512.png
 *
 * Each PNG is a solid #1e40af (Life Log theme blue) square at the target size.
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Theme colour: #1e40af → R=0x1e, G=0x40, B=0xaf, A=0xff
const R = 0x1e
const G = 0x40
const B = 0xaf
const A = 0xff

/**
 * Compute a CRC-32 over the given Buffer.
 * Uses the standard IEEE 802.3 polynomial (0xEDB88320 reflected).
 */
function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Build a PNG chunk: length (4 bytes) + type (4 bytes) + data + CRC (4 bytes).
 * @param {string} type  4-character ASCII chunk type (e.g. 'IHDR')
 * @param {Buffer} data  Chunk data
 */
function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([len, typeBytes, data, crcBuf])
}

/**
 * Generate a minimal RGBA PNG for a solid-colour square.
 * @param {number} size  Width and height in pixels
 */
function generatePng(size) {
  // PNG signature (8 bytes)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: width(4) + height(4) + bit-depth(1) + colour-type(1) + compression(1) + filter(1) + interlace(1)
  // colour-type=6 → RGBA (8-bit per channel)
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)   // width
  ihdrData.writeUInt32BE(size, 4)   // height
  ihdrData[8] = 8   // bit depth
  ihdrData[9] = 6   // colour type: RGBA
  ihdrData[10] = 0  // compression method
  ihdrData[11] = 0  // filter method
  ihdrData[12] = 0  // interlace method: none
  const ihdr = chunk('IHDR', ihdrData)

  // Build raw image data: one scanline = filter byte (0x00) + width*4 RGBA bytes
  const rowSize = 1 + size * 4
  const raw = Buffer.alloc(size * rowSize)
  for (let y = 0; y < size; y++) {
    const offset = y * rowSize
    raw[offset] = 0x00  // filter type: None
    for (let x = 0; x < size; x++) {
      const px = offset + 1 + x * 4
      raw[px + 0] = R
      raw[px + 1] = G
      raw[px + 2] = B
      raw[px + 3] = A
    }
  }

  // IDAT: zlib-compress the raw scanlines
  const compressed = deflateSync(raw, { level: 9 })
  const idat = chunk('IDAT', compressed)

  // IEND: empty chunk (marks end of PNG)
  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

const publicDir = join(__dirname, '..', 'public')

const sizes = [192, 512]
for (const size of sizes) {
  const filename = `pwa-${size}x${size}.png`
  const outPath = join(publicDir, filename)
  const png = generatePng(size)
  writeFileSync(outPath, png)
  console.log(`Generated ${outPath} (${png.length} bytes, ${size}x${size} RGBA)`)
}

console.log('PWA icons generated successfully.')
