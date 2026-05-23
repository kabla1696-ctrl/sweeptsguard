import struct, zlib

def create_png(size):
    width = height = size
    
    def pixel(x, y):
        cx, cy = width // 2, height // 2
        dx = abs(x - cx) / max(cx, 1)
        dy = abs(y - cy) / max(cy, 1)
        
        if dy < 0.8 and dx < 0.6 * (1 - dy * 0.5):
            if dy < 0.6 and dx < 0.4 * (1 - dy * 0.5):
                return (74, 222, 128, 255)
            return (5, 150, 105, 255)
        return (10, 10, 15, 255)
    
    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            r, g, b, a = pixel(x, y)
            raw += struct.pack('BBBB', r, g, b, a)
    
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')

for size in [16, 48, 128]:
    data = create_png(size)
    with open(f'/home/node/.openclaw/workspace/sweeptsguard/extension/icons/icon{size}.png', 'wb') as f:
        f.write(data)
    print(f'Created icon{size}.png ({len(data)} bytes)')
