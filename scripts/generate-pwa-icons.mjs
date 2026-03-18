#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const iconsDir = join(publicDir, 'icons')
mkdirSync(iconsDir, { recursive: true })

const iconSvg = readFileSync(join(publicDir, 'icon.svg'))

const sizes = [192, 512, 180] // 180 for apple-touch-icon

for (const size of sizes) {
  const buffer = await sharp(iconSvg)
    .resize(size, size)
    .png()
    .toBuffer()

  const filename = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`
  writeFileSync(join(iconsDir, filename), buffer)
  console.log(`Generated icons/${filename}`)
}

// Maskable icon: 512x512 with safe zone (icon at 80% = 410px centered)
const iconMaskable = await sharp(iconSvg).resize(410, 410).png().toBuffer()
const maskableBase = await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 10, g: 10, b: 10, alpha: 1 },
  },
})
  .composite([{ input: iconMaskable, left: 51, top: 51 }])
  .png()
  .toBuffer()
writeFileSync(join(iconsDir, 'icon-maskable-512.png'), maskableBase)
console.log('Generated icons/icon-maskable-512.png')

// Favicon 32x32 for browser fallback
const favicon = await sharp(iconSvg).resize(32, 32).png().toBuffer()
writeFileSync(join(iconsDir, 'favicon-32.png'), favicon)
console.log('Generated icons/favicon-32.png')
