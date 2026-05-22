const { ZipArchive } = require('archiver')
const fs = require('fs')
const path = require('path')

const extensionDir = path.join(__dirname, 'public', 'extension')
const outputPath = path.join(__dirname, 'public', 'sweeptsguard-extension.zip')

const output = fs.createWriteStream(outputPath)
const archive = new ZipArchive()

archive.pipe(output)

// Add extension files
archive.file(path.join(extensionDir, 'manifest.json'), { name: 'manifest.json' })
archive.file(path.join(extensionDir, 'background.js'), { name: 'background.js' })
archive.file(path.join(extensionDir, 'content.js'), { name: 'content.js' })
archive.file(path.join(extensionDir, 'popup.html'), { name: 'popup.html' })
archive.file(path.join(extensionDir, 'popup.js'), { name: 'popup.js' })
archive.file(path.join(extensionDir, 'warning.html'), { name: 'warning.html' })

// Add icons
const iconsDir = path.join(extensionDir, 'icons')
if (fs.existsSync(iconsDir)) {
  archive.directory(iconsDir, 'icons')
}

archive.finalize()

output.on('close', () => {
  console.log(`Extension ZIP created: ${(archive.pointer() / 1024).toFixed(1)} KB`)
  console.log(`Path: ${outputPath}`)
})

archive.on('error', (err) => {
  throw err
})
