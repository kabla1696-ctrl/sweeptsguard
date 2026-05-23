const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const iconsDir = path.join(__dirname, 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })

function generateIconSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22c55e"/>
      <stop offset="100%" style="stop-color:#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#030305"/>
  <path d="M${size*0.5} ${size*0.12} L${size*0.82} ${size*0.33} L${size*0.82} ${size*0.62} Q${size*0.82} ${size*0.87} ${size*0.5} ${size*0.93} Q${size*0.18} ${size*0.87} ${size*0.18} ${size*0.62} L${size*0.18} ${size*0.33} Z" fill="url(#grad)"/>
  <path d="M${size*0.35} ${size*0.57} L${size*0.47} ${size*0.68} L${size*0.67} ${size*0.42}" stroke="#030305" stroke-width="${size*0.065}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`
}

async function generateIcons() {
  for (const size of [16, 48, 128]) {
    const svg = generateIconSVG(size)
    const pngPath = path.join(iconsDir, `icon${size}.png`)
    await sharp(Buffer.from(svg)).png().toFile(pngPath)
    console.log(`Generated icon${size}.png (${fs.statSync(pngPath).size} bytes)`)
  }
  console.log('All PNG icons generated!')
}

generateIcons().catch(console.error)
