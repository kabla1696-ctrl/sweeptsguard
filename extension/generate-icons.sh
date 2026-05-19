#!/bin/bash
# Generate SweepGuard icons using ImageMagick

# Create icons directory if not exists
mkdir -p /tmp/sg-ext/icons

# Generate SVG icon
cat > /tmp/sg-ext/icons/icon.svg << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="60" fill="url(#grad)"/>
  <path d="M64 20 L40 45 L40 80 L64 95 L88 80 L88 45 Z" fill="white" opacity="0.9"/>
  <path d="M64 35 L50 50 L50 75 L64 85 L78 75 L78 50 Z" fill="url(#grad)"/>
  <path d="M64 50 L58 58 L58 70 L64 75 L70 70 L70 58 Z" fill="white"/>
</svg>
SVGEOF

echo "✅ SVG icon created"

# Check if we have tools to convert SVG to PNG
if command -v convert &> /dev/null; then
  convert /tmp/sg-ext/icons/icon.svg -resize 16x16 /tmp/sg-ext/icons/icon16.png
  convert /tmp/sg-ext/icons/icon.svg -resize 48x48 /tmp/sg-ext/icons/icon48.png
  convert /tmp/sg-ext/icons/icon.svg -resize 128x128 /tmp/sg-ext/icons/icon128.png
  echo "✅ PNG icons generated"
else
  echo "⚠️ ImageMagick not found, creating placeholder PNGs"
  
  # Create minimal valid PNG files using Python
  python3 << 'PYEOF'
import struct
import zlib

def create_png(width, height, filename):
    # Create a simple green gradient PNG
    def create_chunk(chunk_type, data):
        chunk = chunk_type + data
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', zlib.crc32(chunk) & 0xffffffff)
    
    # PNG signature
    sig = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = create_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk - create gradient
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # filter byte
        for x in range(width):
            # Gradient from green to purple
            r = int(16 + (139 - 16) * x / width)
            g = int(185 - (185 - 92) * x / width)
            b = int(129 + (246 - 129) * x / width)
            raw_data += struct.pack('BBB', r, g, b)
    
    compressed = zlib.compress(raw_data)
    idat = create_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = create_chunk(b'IEND', b'')
    
    with open(filename, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

create_png(16, 16, '/tmp/sg-ext/icons/icon16.png')
create_png(48, 48, '/tmp/sg-ext/icons/icon48.png')
create_png(128, 128, '/tmp/sg-ext/icons/icon128.png')
print("✅ PNG icons created with Python")
PYEOF
fi

# Copy icons to root (manifest references both)
cp /tmp/sg-ext/icons/icon16.png /tmp/sg-ext/icon16.png
cp /tmp/sg-ext/icons/icon48.png /tmp/sg-ext/icon48.png
cp /tmp/sg-ext/icons/icon128.png /tmp/sg-ext/icon128.png

echo "✅ All icons ready"
ls -la /tmp/sg-ext/icons/*.png /tmp/sg-ext/icon*.png
